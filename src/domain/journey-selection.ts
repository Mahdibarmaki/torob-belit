import type { Flight, FlightSegment, Money, SellerOffer } from "./models";
import { localDateAt, parseUtcInstant } from "./time";
import { AIRPORTS } from "../data/airports";

/** Exact seller selections used for journey comparison and recommendation totals, never an inventory hold. */
export interface JourneySelection {
  tripType: "one-way" | "round-trip";
  adults: number;
  legs: { direction: "outbound" | "inbound"; flight: Flight; offer: SellerOffer }[];
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("ساختار اطلاعات معتبر نیست.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 180): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) throw new TypeError("متن اطلاعات معتبر نیست.");
  return value;
}
function member<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== "string" || !choices.includes(value as T)) throw new TypeError("مقدار اطلاعات معتبر نیست.");
  return value as T;
}
function integer(value: unknown, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new TypeError("عدد اطلاعات معتبر نیست.");
  return value as number;
}
function nullableKg(value: unknown): number | null {
  return value === null ? null : integer(value, 0, 200);
}
function source(value: unknown) {
  const data = record(value);
  return { mode: member(data.mode, ["demo", "live", "unavailable"]), id: text(data.id), label: text(data.label, 300) };
}
function segment(value: unknown): FlightSegment {
  const data = record(value);
  const departureAt = text(data.departureAt);
  const arrivalAt = text(data.arrivalAt);
  if (parseUtcInstant(arrivalAt).epochMilliseconds <= parseUtcInstant(departureAt).epochMilliseconds) throw new TypeError("ترتیب زمان پرواز معتبر نیست.");
  const origin = text(data.origin, 3);
  const destination = text(data.destination, 3);
  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination) || origin === destination) throw new TypeError("فرودگاه معتبر نیست.");
  const originAirport = AIRPORTS.find((airport) => airport.code === origin);
  const destinationAirport = AIRPORTS.find((airport) => airport.code === destination);
  if (!originAirport || !destinationAirport) throw new TypeError("فرودگاه در فهرست پشتیبانی‌شده نیست.");
  const originTimeZone = data.originTimeZone === undefined ? originAirport.timeZone : text(data.originTimeZone);
  const destinationTimeZone = data.destinationTimeZone === undefined ? destinationAirport.timeZone : text(data.destinationTimeZone);
  localDateAt(departureAt, originTimeZone);
  localDateAt(arrivalAt, destinationTimeZone);
  return {
    id: text(data.id), airlineId: text(data.airlineId), airlineName: text(data.airlineName), flightNumber: text(data.flightNumber),
    origin, destination, departureAt, arrivalAt, originTimeZone, destinationTimeZone,
    ...(data.aircraftModel === undefined ? {} : { aircraftModel: text(data.aircraftModel) }),
  };
}
function offerSnapshot(value: unknown, flightId: string, segments: FlightSegment[], adults: number, sourceMode: "demo" | "live"): SellerOffer {
  const data = record(value);
  const price = record(data.totalPrice);
  if (price.currency !== "IRR" || price.unit !== "rial" || data.flightId !== flightId || data.adults !== adults
    || data.priceComplete !== true || data.availability !== "available" || data.ticketing !== "single-ticket" || record(data.source).mode !== sourceMode) throw new TypeError("پیشنهاد کامل و یکپارچه با منبع پرواز مطابقت ندارد.");
  if (!Array.isArray(data.baggage) || data.baggage.length !== segments.length) throw new TypeError("اطلاعات بار معتبر نیست.");
  const baggage = data.baggage.map((entry: unknown) => {
    const row = record(entry);
    return { segmentId: text(row.segmentId), checkedKg: nullableKg(row.checkedKg), carryOnKg: nullableKg(row.carryOnKg) };
  });
  if (segments.some((leg) => baggage.filter((item) => item.segmentId === leg.id).length !== 1)) throw new TypeError("بار با پرواز مطابقت ندارد.");
  const conditions = data.fareConditions === undefined ? undefined : record(data.fareConditions);
  const optionalText = (key: string) => data[key] === undefined ? {} : { [key]: text(data[key], 500) };
  const offer: SellerOffer = {
    id: text(data.id), flightId, sellerId: text(data.sellerId), sellerName: text(data.sellerName), fareName: text(data.fareName), adults,
    totalPrice: { currency: "IRR", unit: "rial", amountRials: integer(price.amountRials, 0, Number.MAX_SAFE_INTEGER) }, priceComplete: true,
    baggage, availability: "available", ticketing: member(data.ticketing, ["single-ticket", "self-transfer", "unknown"]),
    refundability: member(data.refundability, ["refundable", "non-refundable", "unknown"]), source: source(data.source),
    ...optionalText("providerId"), ...optionalText("providerName"), ...optionalText("providerOfferId"),
    ...(data.sourceState === undefined ? {} : { sourceState: member(data.sourceState, ["LIVE", "FIXTURE"] as const) }),
    ...(data.freshness === undefined ? {} : { freshness: member(data.freshness, ["live", "cached", "fixture"] as const) }),
    ...(conditions ? { fareConditions: { changes: conditions.changes === null ? null : text(conditions.changes, 500), refunds: conditions.refunds === null ? null : text(conditions.refunds, 500) } } : {}),
  };
  if (data.fetchedAt !== undefined) { offer.fetchedAt = text(data.fetchedAt); parseUtcInstant(offer.fetchedAt); }
  if (data.bookingUrl === null) offer.bookingUrl = null;
  else if (data.bookingUrl !== undefined) {
    const url = new URL(text(data.bookingUrl, 2000));
    if (url.protocol !== "https:" || url.username || url.password) throw new TypeError("نشانی فروشنده معتبر نیست.");
    offer.bookingUrl = url.href;
  }
  return offer;
}

/** Validates an exact selected fare and chronology without adding booking or ticketing state. */
export function parseJourneySelection(value: unknown): JourneySelection {
  const data = record(value);
  const tripType = member(data.tripType, ["one-way", "round-trip"]);
  const adults = integer(data.adults, 1, 9);
  if (!Array.isArray(data.legs) || data.legs.length !== (tripType === "round-trip" ? 2 : 1)) throw new TypeError("تعداد مسیرها معتبر نیست.");
  const legs: JourneySelection["legs"] = data.legs.map((entry: unknown, index) => {
    const row = record(entry);
    if (row.direction !== (index === 0 ? "outbound" : "inbound")) throw new TypeError("جهت مسیر معتبر نیست.");
    const flight = record(row.flight);
    if (!Array.isArray(flight.segments) || flight.segments.length < 1 || flight.segments.length > 2) throw new TypeError("بخش‌های پرواز معتبر نیست.");
    const segments = flight.segments.map(segment);
    const flightSource = source(flight.source);
    if (flightSource.mode === "unavailable") throw new TypeError("انتخاب پرواز بدون منبع قابل استفاده معتبر نیست.");
    const sourceMode = flightSource.mode;
    for (let i = 1; i < segments.length; i += 1) {
      if (segments[i - 1].destination !== segments[i].origin || parseUtcInstant(segments[i - 1].arrivalAt).epochMilliseconds >= parseUtcInstant(segments[i].departureAt).epochMilliseconds) throw new TypeError("اتصال پرواز معتبر نیست.");
    }
    const id = text(flight.id);
    const selected = offerSnapshot(row.offer, id, segments, adults, sourceMode);
    const durationMinutes = integer(flight.durationMinutes, 1, 10080);
    const stops = integer(flight.stops, 0, 1);
    const elapsed = (parseUtcInstant(segments.at(-1)!.arrivalAt).epochMilliseconds - parseUtcInstant(segments[0].departureAt).epochMilliseconds) / 60000;
    if (stops !== segments.length - 1 || durationMinutes !== elapsed || new Set(segments.map((item) => item.id)).size !== segments.length) throw new TypeError("مدت یا بخش‌های پرواز با برنامه مطابقت ندارد.");
    if (!Array.isArray(flight.offers) || !flight.offers.some((candidate: unknown) => {
      try { return JSON.stringify(offerSnapshot(candidate, id, segments, adults, sourceMode)) === JSON.stringify(selected); } catch { return false; }
    })) throw new TypeError("پیشنهاد انتخاب‌شده در این پرواز وجود ندارد.");
    return { direction: index === 0 ? "outbound" : "inbound", flight: { id, segments, durationMinutes, stops, offers: [selected], source: source(flight.source) }, offer: selected };
  });
  if (legs.length === 2) {
    const out = legs[0].flight.segments;
    const back = legs[1].flight.segments;
    if (out[0].origin !== back.at(-1)!.destination || out.at(-1)!.destination !== back[0].origin || parseUtcInstant(out.at(-1)!.arrivalAt).epochMilliseconds >= parseUtcInstant(back[0].departureAt).epochMilliseconds || legs[0].flight.id === legs[1].flight.id) throw new TypeError("پرواز برگشت با مسیر رفت سازگار نیست.");
  }
  const selection = { tripType, adults, legs };
  journeyTotal(selection);
  return selection;
}

/** Each offer already totals the complete party. Never multiply by adults or convert to toman here. */
export function journeyTotal(selection: JourneySelection): Money {
  if (selection.legs.some(({ offer }) => offer.totalPrice?.currency !== "IRR" || offer.totalPrice.unit !== "rial" || !Number.isSafeInteger(offer.totalPrice.amountRials) || offer.totalPrice.amountRials < 0)) throw new TypeError("مبلغ باید به ریال و عدد صحیح معتبر باشد.");
  const amount = selection.legs.reduce((sum, leg) => sum + BigInt(leg.offer.totalPrice.amountRials), 0n);
  if (amount > BigInt(Number.MAX_SAFE_INTEGER) || amount < 0n) throw new RangeError("جمع مبلغ از محدوده مجاز بزرگ‌تر است.");
  return { currency: "IRR", unit: "rial", amountRials: Number(amount) };
}

