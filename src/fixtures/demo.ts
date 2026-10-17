import { Temporal } from "@js-temporal/polyfill";
import { calculateCancellationHistory } from "@/domain/cancellation-history";
import { toRialMoney } from "@/domain/money";
import { elapsedMinutes, previousCompletedDaysWindow } from "@/domain/time";
import { DEMO_DATE_BOUNDS, isSupportedDemoDate } from "@/domain/demo-date";
import type { DataSource, Flight, FlightOperation, FlightSearchInput, FlightSegment, ScheduledOperation, SellerOffer } from "@/domain/models";

import { AIRPORTS, type Airport } from "@/data/airports";
import { IRANIAN_AIRLINES, type AirlineReference } from "@/data/airlines";
export { AIRPORTS } from "@/data/airports";

const source: DataSource = { mode: "demo", id: "flight-ai-demo-v4-domestic-irr", label: "اطلاعات آزمایشی Flight AI" };

export const DEMO_METADATA = {
  datasetId: source.id,
  asOf: "2026-10-15T12:00:00Z",
  dateBounds: DEMO_DATE_BOUNDS,
  /** Legacy example dates only; dateBounds is the complete supported interval. */
  supportedDates: Array.from({ length: 7 }, (_, day) => `2026-10-${16 + day}`),
  source,
  disclosure: "اطلاعات آزمایشی؛ شماره و زمان پروازها، قیمت، موجودی و سوابق لغو ساختگی هستند. نام واقعی ایرلاین و مدل نمونه هواپیما به معنی انجام واقعی این پرواز یا تخصیص واقعی هواپیما نیست.",
};

const domesticDestinations = ["MHD", "SYZ", "KIH", "IFN", "TBZ", "AWZ"] as const;

export const DEMO_ROUTES = [
  { origin: "IKA", destination: "IST" },
  { origin: "IKA", destination: "DXB" },
  { origin: "MHD", destination: "IKA" },
  { origin: "IKA", destination: "LHR" },
  { origin: "IST", destination: "IKA" },
  { origin: "DXB", destination: "IKA" },
  ...domesticDestinations.flatMap((destination) => [
    { origin: "THR", destination },
    { origin: destination, destination: "THR" },
  ]),
];

export function airport(code: string): Airport {
  const found = AIRPORTS.find((item) => item.code === code);
  if (!found) throw new RangeError("Unknown airport reference.");
  return found;
}

interface FlightTemplate {
  number: string;
  hour: number;
  minute?: number;
  duration: number;
  /** Authored synthetic base fare in toman; no foreign-exchange conversion is implied. */
  priceToman: number;
  bags: number | null;
  cancellations: number;
  expected?: number;
  known?: number;
  capacity?: number;
  connection?: boolean;
  airlineIndex?: number;
  aircraftIndex?: number;
}

const templates: FlightTemplate[] = [
  { number: "101", hour: 8, duration: 210, priceToman: 5_825_000, bags: 23, cancellations: 1 },
  { number: "203", hour: 10, minute: 30, duration: 215, priceToman: 4_850_000, bags: 0, cancellations: 4 },
  { number: "307", hour: 12, duration: 205, priceToman: 4_100_000, bags: 23, cancellations: 9 },
  { number: "409", hour: 14, duration: 220, priceToman: 5_350_000, bags: null, cancellations: 0, expected: 8, known: 8, capacity: 4 },
  { number: "511", hour: 18, duration: 210, priceToman: 6_850_000, bags: 23, cancellations: 0 },
  { number: "613", hour: 7, duration: 480, priceToman: 3_850_000, bags: 23, cancellations: 1, connection: true },
  { number: "717", hour: 21, duration: 210, priceToman: 5_100_000, bags: 23, cancellations: 0, known: 12 },
];

/** All schedule/price/seat/history parameters below are authored demonstration data. */
const domesticTemplates: FlightTemplate[] = [
  { number: "201", hour: 0, minute: 20, duration: 0, priceToman: -350_000, bags: 20, cancellations: 1, airlineIndex: 0 },
  { number: "213", hour: 6, duration: 0, priceToman: -100_000, bags: 20, cancellations: 4, airlineIndex: 1 },
  { number: "227", hour: 7, minute: 15, duration: 0, priceToman: -250_000, bags: 20, cancellations: 9, airlineIndex: 2 },
  { number: "239", hour: 8, minute: 40, duration: 0, priceToman: 250_000, bags: 20, cancellations: 0, expected: 8, known: 8, airlineIndex: 3 },
  { number: "251", hour: 9, minute: 50, duration: 0, priceToman: 100_000, bags: 0, cancellations: 2, airlineIndex: 4 },
  { number: "263", hour: 10, minute: 45, duration: 0, priceToman: -400_000, bags: 20, cancellations: 5, airlineIndex: 5 },
  { number: "277", hour: 12, duration: 0, priceToman: -150_000, bags: 20, cancellations: 8, airlineIndex: 6 },
  { number: "289", hour: 13, minute: 25, duration: 0, priceToman: 200_000, bags: null, cancellations: 0, known: 12, airlineIndex: 7 },
  { number: "301", hour: 14, minute: 40, duration: 0, priceToman: 350_000, bags: 20, cancellations: 0, airlineIndex: 8 },
  { number: "313", hour: 16, duration: 0, priceToman: 150_000, bags: 20, cancellations: 3, airlineIndex: 9 },
  { number: "327", hour: 17, minute: 30, duration: 0, priceToman: -200_000, bags: 20, cancellations: 10, airlineIndex: 10 },
  { number: "339", hour: 19, duration: 0, priceToman: 300_000, bags: 20, cancellations: 1, capacity: 5, airlineIndex: 0, aircraftIndex: 1 },
  { number: "351", hour: 20, minute: 20, duration: 0, priceToman: 450_000, bags: 20, cancellations: 4, airlineIndex: 1 },
  { number: "363", hour: 22, minute: 45, duration: 0, priceToman: 50_000, bags: 20, cancellations: 0, airlineIndex: 3 },
  { number: "377", hour: 7, minute: 45, duration: 0, priceToman: -650_000, bags: 20, cancellations: 2, connection: true, airlineIndex: 6 },
  { number: "389", hour: 15, minute: 15, duration: 0, priceToman: -500_000, bags: 20, cancellations: 9, connection: true, airlineIndex: 9 },
];

const domesticProfiles: Record<(typeof domesticDestinations)[number], { duration: number; priceToman: number }> = {
  MHD: { duration: 90, priceToman: 2_850_000 },
  SYZ: { duration: 85, priceToman: 2_950_000 },
  KIH: { duration: 110, priceToman: 3_850_000 },
  IFN: { duration: 60, priceToman: 2_100_000 },
  TBZ: { duration: 75, priceToman: 2_450_000 },
  AWZ: { duration: 80, priceToman: 2_650_000 },
};

function isDomesticDestination(code: string): code is (typeof domesticDestinations)[number] {
  return domesticDestinations.some((destination) => destination === code);
}

function airlineFor(template: FlightTemplate, index: number): AirlineReference {
  return IRANIAN_AIRLINES[template.airlineIndex ?? index % 3];
}

/** Records are fabricated observations, not actual airline-operation evidence. */
function historyFor(segment: FlightSegment, template: FlightTemplate, legIndex: number) {
  const originTimeZone = airport(segment.origin).timeZone;
  const window = previousCompletedDaysWindow(DEMO_METADATA.asOf, originTimeZone);
  const departure = Temporal.Instant.from(segment.departureAt).toZonedDateTimeISO(originTimeZone);
  const expectedCount = template.expected ?? 30;
  const knownCount = template.known ?? expectedCount;
  const expected: ScheduledOperation[] = [];
  const operations: FlightOperation[] = [];
  for (let index = 0; index < expectedCount; index++) {
    const offset = expectedCount < 30 ? Math.floor(index * 30 / expectedCount) : index;
    const scheduled = Temporal.PlainDate.from(window.startLocalDate)
      .add({ days: offset })
      .toZonedDateTime({ timeZone: originTimeZone, plainTime: { hour: departure.hour, minute: departure.minute } })
      .toInstant();
    const record: ScheduledOperation = {
      airlineId: segment.airlineId,
      flightNumber: segment.flightNumber,
      origin: segment.origin,
      destination: segment.destination,
      operationId: `${segment.airlineId}-${segment.flightNumber}-${segment.origin}-${segment.destination}-${scheduled.toString()}`,
      originalScheduledDepartureAt: scheduled.toString(),
    };
    expected.push(record);
    const cancellations = legIndex === 1 ? 5 : template.cancellations;
    operations.push({
      ...record,
      status: index >= knownCount ? "unknown" : index < cancellations ? "cancelled" : "operated",
      observedAt: scheduled.add({ hours: 8 }).toString(),
      revision: 1,
    });
  }
  return calculateCancellationHistory({
    identity: segment,
    segmentId: segment.id,
    asOf: DEMO_METADATA.asOf,
    originTimeZone,
    roster: { verified: true, expected, asOf: DEMO_METADATA.asOf },
    operations,
    source,
  });
}

function makeOffers(flight: Flight, query: FlightSearchInput, template: FlightTemplate): SellerOffer[] {
  return [0, 1, 2].map((tier) => ({
    id: `${flight.id}-seller-${tier}-${query.adults}`,
    flightId: flight.id,
    sellerId: `demo-seller-${tier}`,
    sellerName: ["علی‌بابا", "فلای‌تودی", "مستربلیط"][tier],
    fareName: tier === 0 ? "اقتصادی" : tier === 1 ? "اقتصادی با بار" : "اقتصادی منعطف",
    adults: query.adults,
    totalPrice: toRialMoney({ unit: "toman", amount: query.adults * (template.priceToman + tier * 800_000) + 375_000 }),
    priceComplete: true,
    baggage: flight.segments.map((segment) => ({
      segmentId: segment.id,
      checkedKg: tier === 0 ? template.bags : tier === 1 ? 23 : 30,
      carryOnKg: 7,
    })),
    availability: query.adults <= (template.capacity ?? 9) ? "available" : "unavailable",
    ticketing: "single-ticket",
    refundability: tier === 2 ? "refundable" : "non-refundable",
    fareConditions: {
      changes: tier === 2 ? "شرایط ساختگی: تغییر با پرداخت اختلاف نرخ" : "شرایط ساختگی: تغییر تاریخ مجاز نیست",
      refunds: tier === 2 ? "شرایط ساختگی: استرداد با کسر ۱۵ درصد" : "شرایط ساختگی: غیرقابل استرداد",
    },
    bookingUrl: null,
    sourceState: "FIXTURE",
    freshness: "fixture",
    fetchedAt: DEMO_METADATA.asOf,
    source: { ...source },
  }));
}

/** Fixture adapter: schedules and complete party quotes are deterministic for this dataset. */
export function loadDemoFlights(query: FlightSearchInput): Flight[] {
  if (!isSupportedDemoDate(query.departureDate)) return [];
  const routeOrdinal = DEMO_ROUTES.findIndex((route) => route.origin === query.origin && route.destination === query.destination);
  if (routeOrdinal < 0) return [];
  const domesticDestination = query.origin === "THR" ? query.destination : query.destination === "THR" ? query.origin : null;
  const domestic = domesticDestination !== null && isDomesticDestination(domesticDestination);
  const profile = domestic ? domesticProfiles[domesticDestination] : null;
  const fixtureTemplates = domestic ? domesticTemplates : templates.filter((template) => !template.connection || (query.origin === "IKA" && query.destination === "IST"));
  // A date-only arithmetic input keeps the tiny variation stable on server and client.
  const dateOrdinal = Temporal.PlainDate.from("2026-10-15").until(Temporal.PlainDate.from(query.departureDate), { largestUnit: "day" }).days;
  return fixtureTemplates.map((baseTemplate, index) => {
      const template = profile ? {
        ...baseTemplate,
        priceToman: profile.priceToman + baseTemplate.priceToman + (dateOrdinal % 7) * 25_000,
        duration: profile.duration + (index % 3) * 5 + (query.destination === "THR" ? 5 : 0),
      } : baseTemplate;
      const id = `${source.id}-${query.origin}-${query.destination}-${query.departureDate}-${template.number}`;
      const departure = Temporal.PlainDate.from(query.departureDate).toZonedDateTime({
        timeZone: airport(query.origin).timeZone,
        plainTime: { hour: template.hour, minute: template.minute ?? 0 },
      }).toInstant();
      // The legacy London examples use the two documented longer-range fleets.
      const airline = airlineFor(template, query.destination === "LHR" ? index % 2 : index);
      const airlineId = airline.id;
      const airlineName = airline.name;
      const aircraftModel = airline.aircraftModels[(template.aircraftIndex ?? 0) % airline.aircraftModels.length];
      const duration = (query.destination === "LHR" ? template.duration + 150 : !domestic && query.origin === "MHD" ? 85 : template.duration)
        + (domestic && aircraftModel.startsWith("ATR ") ? 25 : 0);
      const connectionAirport = domestic ? (domesticDestination === "SYZ" ? "MHD" : "SYZ") : "DXB";
      const firstDuration = domestic ? 75 : 120;
      const secondDepartureOffset = domestic ? 155 : 240;
      const totalConnectionDuration = domestic ? secondDepartureOffset + template.duration + 10 : 480;
      const flightNumber = domestic ? String(2000 + (routeOrdinal - 6) * 100 + index * 2) : String(Number(template.number) + routeOrdinal * 1000);
      const segments: FlightSegment[] = [{
        id: `${id}-leg-1`,
        airlineId,
        airlineName,
        aircraftModel,
        flightNumber,
        origin: query.origin,
        destination: template.connection ? connectionAirport : query.destination,
        departureAt: departure.toString(),
        arrivalAt: departure.add({ minutes: template.connection ? firstDuration : duration }).toString(),
        originTimeZone: airport(query.origin).timeZone,
        destinationTimeZone: airport(template.connection ? connectionAirport : query.destination).timeZone,
      }];
      if (template.connection) {
        segments.push({
          id: `${id}-leg-2`, airlineId, airlineName, aircraftModel,
          flightNumber: domestic ? String(Number(flightNumber) + 1) : "614", origin: connectionAirport, destination: query.destination,
          departureAt: departure.add({ minutes: secondDepartureOffset }).toString(),
          arrivalAt: departure.add({ minutes: totalConnectionDuration }).toString(),
          originTimeZone: airport(connectionAirport).timeZone,
          destinationTimeZone: airport(query.destination).timeZone,
        });
      }
      const flight: Flight = {
        id, segments,
        durationMinutes: elapsedMinutes(segments[0].departureAt, segments.at(-1)!.arrivalAt),
        stops: segments.length - 1,
        offers: [],
        history: segments.map((segment, legIndex) => historyFor(segment, template, legIndex)),
        source: { ...source },
      };
      flight.offers = makeOffers(flight, query, template);
      return flight;
    });
}
