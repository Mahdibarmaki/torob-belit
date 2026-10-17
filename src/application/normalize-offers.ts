import type { DataSource, Flight, FlightSearchInput, FlightSegment, Instant } from "@/domain/models";
import type { FlightOffer, NormalizedFlightOffer, ProviderDescriptor, ProviderId, UnpricedFlightOffer } from "@/domain/provider";
import { normalizeFlightIdentity } from "@/domain/cancellation-history";
import { elapsedMinutes, localDateAt, parseUtcInstant } from "@/domain/time";
import { AIRPORTS } from "@/data/airports";

function fail(): never { throw new RangeError("Invalid normalized provider offer."); }
function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail();
  return input as Record<string, unknown>;
}
function text(input: unknown, max = 256): string {
  if (typeof input !== "string" || !input.trim() || input.length > max || /[\u0000-\u001f]/.test(input)) return fail();
  return input.trim();
}
function choice<T extends string>(input: unknown, values: readonly T[]): T {
  if (!values.includes(input as T)) return fail();
  return input as T;
}
function bool(input: unknown): boolean { return typeof input === "boolean" ? input : fail(); }
function nullableText(input: unknown): string | null { return input === null ? null : text(input, 2000); }
function kg(input: unknown): number | null {
  return input === null ? null : typeof input === "number" && Number.isFinite(input) && input >= 0 && input <= 1000 ? input : fail();
}
function instant(input: unknown): Instant { return parseUtcInstant(text(input, 40)).toString(); }

/** Only validates the shared output contract. Vendor mapping requires its documented API. */
export function normalizeFlightOffer(input: unknown, provider: ProviderDescriptor, query: FlightSearchInput, now: Instant): FlightOffer;
export function normalizeFlightOffer(input: unknown, provider: ProviderDescriptor, query: FlightSearchInput, now: Instant, fixtureSource: DataSource): NormalizedFlightOffer;
export function normalizeFlightOffer(input: unknown, provider: ProviderDescriptor, query: FlightSearchInput, now: Instant, fixtureSource?: DataSource): NormalizedFlightOffer {
  const value = object(input);
  if (value.providerId !== provider.id || value.providerName !== provider.name) fail();
  const source = object(value.source);
  const expectedSource: DataSource = fixtureSource ?? { mode: "live", id: provider.id, label: provider.name };
  if (fixtureSource && (fixtureSource.mode !== "demo" || !fixtureSource.id || !fixtureSource.label)) fail();
  const sourceState = fixtureSource ? "FIXTURE" : "LIVE";
  if (value.sourceState !== sourceState || source.mode !== expectedSource.mode || source.id !== expectedSource.id || source.label !== expectedSource.label) fail();
  const fetchedAt = instant(value.fetchedAt);
  if (parseUtcInstant(fetchedAt).epochNanoseconds > parseUtcInstant(now).epochNanoseconds) fail();
  if (!Array.isArray(value.segments) || value.segments.length < 1 || value.segments.length > 2) fail();
  const segments: FlightSegment[] = value.segments.map((input) => {
    const leg = object(input);
    const identity = normalizeFlightIdentity({ airlineId: text(leg.airlineId, 64), flightNumber: text(leg.flightNumber, 16), origin: text(leg.origin, 3), destination: text(leg.destination, 3) });
    if (!/^[A-Z0-9_-]+$/i.test(identity.airlineId) || !/^[A-Z0-9]+$/.test(identity.flightNumber)) fail();
    const origin = AIRPORTS.find((airport) => airport.code === identity.origin);
    const destination = AIRPORTS.find((airport) => airport.code === identity.destination);
    if (!origin || !destination || origin.code === destination.code) fail();
    if (leg.originTimeZone !== undefined && leg.originTimeZone !== origin.timeZone) fail();
    if (leg.destinationTimeZone !== undefined && leg.destinationTimeZone !== destination.timeZone) fail();
    const departureAt = instant(leg.departureAt), arrivalAt = instant(leg.arrivalAt);
    if (elapsedMinutes(departureAt, arrivalAt) <= 0) fail();
    return { ...identity, id: text(leg.id, 256), airlineName: text(leg.airlineName), ...(leg.aircraftModel === undefined ? {} : { aircraftModel: text(leg.aircraftModel, 128) }), departureAt, arrivalAt, originTimeZone: origin.timeZone, destinationTimeZone: destination.timeZone };
  });
  if (new Set(segments.map((leg) => leg.id)).size !== segments.length) fail();
  for (let index = 1; index < segments.length; index++) {
    if (segments[index - 1].destination !== segments[index].origin || elapsedMinutes(segments[index - 1].arrivalAt, segments[index].departureAt) <= 0) fail();
  }
  if (segments[0].origin !== query.origin || segments.at(-1)!.destination !== query.destination
    || localDateAt(segments[0].departureAt, segments[0].originTimeZone!) !== query.departureDate
    || value.adults !== query.adults || value.cabin !== "economy" || value.stops !== segments.length - 1) fail();
  const money = value.totalPrice === null && fixtureSource ? null : object(value.totalPrice);
  if (money !== null && (money.currency !== "IRR" || money.unit !== "rial" || typeof money.amountRials !== "number" || !Number.isSafeInteger(money.amountRials) || money.amountRials < 0)) fail();
  if (!Array.isArray(value.baggage) || value.baggage.length !== segments.length) fail();
  const baggage = segments.map((segment) => {
    const rows = (value.baggage as unknown[]).map(object).filter((bag) => bag.segmentId === segment.id);
    if (rows.length !== 1) fail();
    return { segmentId: segment.id, checkedKg: kg(rows[0].checkedKg), carryOnKg: kg(rows[0].carryOnKg) };
  });
  const conditions = object(value.fareConditions);
  let bookingUrl: string | null = null;
  if (value.bookingUrl !== null) {
    const url = new URL(text(value.bookingUrl, 4096));
    if (url.protocol !== "https:" || url.username || url.password || url.port
      || !provider.bookingHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) fail();
    bookingUrl = url.toString();
  }
  const common = {
    sourceState: sourceState as FlightOffer["sourceState"],
    providerId: provider.id, providerName: provider.name, providerOfferId: text(value.providerOfferId),
    sellerId: text(value.sellerId), sellerName: text(value.sellerName), segments, stops: segments.length - 1,
    adults: query.adults, cabin: "economy" as const, fareName: text(value.fareName), baggage,
    availability: choice(value.availability, ["available", "unavailable", "unknown"] as const),
    ticketing: choice(value.ticketing, ["single-ticket", "self-transfer", "unknown"] as const),
    refundability: choice(value.refundability, ["refundable", "non-refundable", "unknown"] as const),
    fareConditions: { changes: nullableText(conditions.changes), refunds: nullableText(conditions.refunds) },
    bookingUrl, fetchedAt, source: { ...expectedSource },
  };
  if (money === null) {
    const evidence = object(value.priceEvidence);
    if (value.priceComplete !== false || evidence.unit !== "unverified" || evidence.field !== "priceAdult"
      || typeof evidence.rawAmount !== "number" || !Number.isSafeInteger(evidence.rawAmount) || evidence.rawAmount < 0
      || value.capturedAt !== null || bookingUrl !== null) fail();
    if (value.baggageRaw !== null) {
      if (typeof value.baggageRaw === "number") {
        if (!Number.isFinite(value.baggageRaw) || value.baggageRaw < 0) fail();
      } else text(value.baggageRaw, 128);
    }
    return { ...common, sourceState: "FIXTURE", totalPrice: null, priceComplete: false,
      priceEvidence: { rawAmount: evidence.rawAmount, field: "priceAdult", unit: "unverified" },
      baggageRaw: value.baggageRaw as UnpricedFlightOffer["baggageRaw"], capturedAt: null };
  }
  return { ...common, totalPrice: { currency: "IRR", unit: "rial", amountRials: money.amountRials as number }, priceComplete: bool(value.priceComplete) };
}

/** Exact operating identity + ordered scheduled UTC instants; no fuzzy schedule merges. */
export function itineraryKey(offer: Pick<FlightOffer, "segments">): string {
  return JSON.stringify(offer.segments.map((leg) => [leg.airlineId, leg.flightNumber, leg.origin, leg.destination, parseUtcInstant(leg.departureAt).toString(), parseUtcInstant(leg.arrivalAt).toString()]));
}

export function groupFlightOffers(offers: readonly FlightOffer[], freshness: Partial<Record<ProviderId, "live" | "cached" | "fixture">> = {}): Flight[] {
  if (new Set(offers.map((offer) => offer.sourceState)).size > 1) throw new RangeError("Live and fixture inventory must remain separate.");
  const revisions = new Map<string, FlightOffer[]>();
  for (const offer of offers) {
    const key = JSON.stringify([offer.sourceState, offer.source.id, offer.providerId, offer.sellerId, offer.providerOfferId]);
    revisions.set(key, [...(revisions.get(key) ?? []), offer]);
  }
  const unique = [...revisions.values()].flatMap((rows) => {
    const latestAt = Math.max(...rows.map((row) => Date.parse(row.fetchedAt)));
    const latest = rows.filter((row) => Date.parse(row.fetchedAt) === latestAt);
    // Equal-version contradictory quotes are unusable, rather than arbitrarily cheapest.
    return new Set(latest.map((row) => JSON.stringify(row))).size === 1 ? [latest[0]] : [];
  });
  const groups = new Map<string, Flight>();
  for (const offer of unique.sort((a, b) => JSON.stringify([a.providerId, a.sellerId, a.providerOfferId]).localeCompare(JSON.stringify([b.providerId, b.sellerId, b.providerOfferId])))) {
    const id = `${offer.sourceState}:${offer.sourceState === "FIXTURE" ? JSON.stringify(offer.source.id) + ":" : ""}service:${itineraryKey(offer)}`;
    let flight = groups.get(id);
    if (!flight) {
      const segments = offer.segments.map((leg, index) => ({ ...leg, id: `${id}:leg:${index}` }));
      flight = { id, segments, durationMinutes: elapsedMinutes(segments[0].departureAt, segments.at(-1)!.arrivalAt), stops: segments.length - 1, offers: [], source: offer.sourceState === "FIXTURE" ? { ...offer.source } : { mode: offer.source.mode, id: "provider-aggregation", label: "تجمیع پیشنهادهای منابع مجاز" } };
      groups.set(id, flight);
    }
    flight.offers.push({
      id: JSON.stringify([offer.providerId, offer.sellerId, offer.providerOfferId]), flightId: id,
      sellerId: offer.sellerId, sellerName: offer.sellerName, fareName: offer.fareName, adults: offer.adults,
      totalPrice: { ...offer.totalPrice }, priceComplete: offer.priceComplete,
      baggage: offer.baggage.map((bag) => ({ ...bag, segmentId: flight!.segments[offer.segments.findIndex((leg) => leg.id === bag.segmentId)].id })),
      availability: offer.availability, ticketing: offer.ticketing, refundability: offer.refundability,
      source: { ...offer.source }, providerId: offer.providerId, providerName: offer.providerName, providerOfferId: offer.providerOfferId,
      bookingUrl: offer.bookingUrl, fetchedAt: offer.fetchedAt, fareConditions: { ...offer.fareConditions }, freshness: offer.sourceState === "FIXTURE" ? "fixture" : freshness[offer.providerId] ?? "live", sourceState: offer.sourceState,
    });
  }
  return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id));
}
