/** Normalized domain values. Validate untrusted JSON before constructing these types. */
/** An ISO UTC timestamp; never use it to store a selected date-only value. */
export type Instant = string;
/** Gregorian ISO YYYY-MM-DD, without a time zone; Jalali values belong at presentation boundaries. */
export type LocalDate = string;
export type AirportCode = string;
export type HistoricalRiskCategory = "low" | "medium" | "high" | "unknown";
/** Data origin. Cache delivery is tracked separately and never means a new live fetch. */
export type SourceState = "LIVE" | "FIXTURE" | "UNAVAILABLE";

export interface DataSource {
  mode: "demo" | "live" | "unavailable";
  id: string;
  label: string;
}

export interface Money {
  currency: "IRR";
  /** The canonical monetary unit is the Iranian rial, never a formatted toman amount. */
  unit: "rial";
  /** A nonnegative safe integer; one toman is exactly ten rials. */
  amountRials: number;
}

export interface FlightSearchInput {
  origin: AirportCode;
  destination: AirportCode;
  departureDate: LocalDate;
  adults: number;
  currency: "IRR";
}

export interface FlightIdentity {
  /** A stable internal operating-airline identifier, not a marketing codeshare. */
  airlineId: string;
  flightNumber: string;
  origin: AirportCode;
  destination: AirportCode;
}

export interface FlightSegment extends FlightIdentity {
  id: string;
  airlineName: string;
  /** Catalog model; in demo mode its assignment to this invented flight is synthetic. */
  aircraftModel?: string;
  /** ISO 8601 UTC timestamps ending in Z. */
  departureAt: Instant;
  arrivalAt: Instant;
  /** Explicit airport zones from a verified adapter/reference, never the host zone. */
  originTimeZone?: string;
  destinationTimeZone?: string;
}

export interface SegmentBaggage {
  segmentId: string;
  /** One included bag per adult per leg; zero means none, null means unknown. */
  checkedKg: number | null;
  carryOnKg: number | null;
}

export interface SellerOffer {
  id: string;
  flightId: string;
  sellerId: string;
  sellerName: string;
  fareName: string;
  adults: number;
  totalPrice: Money;
  /** True only when every mandatory charge is included in totalPrice. */
  priceComplete: boolean;
  baggage: SegmentBaggage[];
  availability: "available" | "unavailable" | "unknown";
  ticketing: "single-ticket" | "self-transfer" | "unknown";
  refundability: "refundable" | "non-refundable" | "unknown";
  source: DataSource;
  providerId?: string;
  providerName?: string;
  providerOfferId?: string;
  bookingUrl?: string | null;
  fetchedAt?: Instant;
  freshness?: "live" | "cached" | "fixture";
  sourceState?: Exclude<SourceState, "UNAVAILABLE">;
  fareConditions?: { changes: string | null; refunds: string | null };
}

export interface Flight {
  id: string;
  /** One or two chronological, contiguous legs in the initial MVP. */
  segments: FlightSegment[];
  /** Elapsed UTC minutes, including a connection. */
  durationMinutes: number;
  stops: number;
  offers: SellerOffer[];
  /** Leg order is identical to segments; segmentId is retained when supplied. */
  history?: CancellationHistory[];
  source: DataSource;
}

export interface ScheduledOperation extends FlightIdentity {
  /** Stable through schedule revisions; duplicate provider rows are not extra operations. */
  operationId: string;
  originalScheduledDepartureAt: Instant;
}

export interface FlightOperation extends ScheduledOperation {
  status: "operated" | "cancelled" | "unknown";
  observedAt: Instant;
  /** Nonnegative integer when available; otherwise reconcile by observation time. */
  revision?: number;
}

export interface HistoryRoster {
  /** Completeness of the expected schedule, independently of received outcomes. */
  verified: boolean;
  expected: ScheduledOperation[];
  /** Optional snapshot reference; a snapshot later than the history cutoff is invalid. */
  asOf?: Instant;
}

export interface HistoryWindow {
  startLocalDate: LocalDate;
  /** Exclusive: the origin-local date of asOf. */
  endLocalDate: LocalDate;
  originTimeZone: string;
  startAt: Instant;
  endAt: Instant;
}

export type UnknownHistoryReason =
  | "unverified-roster"
  | "no-expected-operations"
  | "no-known-outcomes"
  | "insufficient-sample"
  | "low-coverage"
  | "invalid-matching-data"
  | "history-unavailable";

export interface CancellationHistory {
  segmentId?: string;
  identity: FlightIdentity;
  asOf: Instant;
  source: DataSource;
  window: HistoryWindow;
  expectedCount: number | null;
  cancelledCount: number;
  operatedCount: number;
  knownCount: number;
  unknownCount: number;
  missingCount: number | null;
  /** A subset of unknownCount; never add it to unknownCount a second time. */
  conflictingCount: number;
  coverage: number | null;
  /** Displayable 30-day observed fraction only when evidence is sufficient. */
  cancellationRate: number | null;
  /** Diagnostic fraction among available known outcomes, including insufficient samples. */
  observedRate: number | null;
  category: HistoricalRiskCategory;
  reasons: UnknownHistoryReason[];
  warnings: string[];
  policyVersion: string;
}

export interface CancellationHistoryInput {
  identity: FlightIdentity;
  asOf: Instant;
  originTimeZone: string;
  roster: HistoryRoster | null;
  operations: FlightOperation[];
  source: DataSource;
  segmentId?: string;
}
