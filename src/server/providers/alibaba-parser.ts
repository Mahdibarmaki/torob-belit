import { Temporal } from "@js-temporal/polyfill";

/** A saved website-response record, not a verified live quote or canonical money value. */
export interface AlibabaRecord {
  origin: string;
  destination: string;
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  /** Original timezone-less strings. A separate reviewed mapping must assign a zone. */
  departureLocal: string;
  arrivalLocal: string;
  adultPriceRaw: number;
  priceUnit: "unverified";
  fareClass: string;
  /** Raw classType code; no cabin-category inference at this boundary. */
  cabin: string;
  baggageRaw: number | string | null;
  seats: number | null;
  availability: "available" | "unavailable" | "unknown";
  refundable: boolean | null;
  hasConnection: boolean | null;
  referenceIndex: number;
}

type IssueCode = "invalid-record" | "invalid-route" | "invalid-airline" | "invalid-flight-number"
  | "invalid-schedule" | "invalid-price" | "invalid-fare" | "invalid-baggage";

export interface AlibabaParseIssue {
  index: number | null;
  code: IssueCode;
}

export class AlibabaResponseError extends Error {
  constructor(readonly code: "invalid-response" | "provider-rejected") {
    super(code === "provider-rejected" ? "Saved Alibaba response was not successful." : "Invalid saved Alibaba response.");
    this.name = "AlibabaResponseError";
  }
}

function object(input: unknown): Record<string, unknown> | null {
  return input !== null && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : null;
}

function text(input: unknown, max: number): string | null {
  return typeof input === "string" && input.trim().length > 0 && input.length <= max
    && !/[\u0000-\u001f\u007f]/.test(input) ? input.trim() : null;
}

const localDateTimePattern = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?$/;

function localDateTime(input: unknown): string | null {
  if (typeof input !== "string" || !localDateTimePattern.test(input)) return null;
  try {
    Temporal.PlainDateTime.from(input, { overflow: "reject" });
    return input;
  } catch { return null; }
}

function booleanOrNull(input: unknown): boolean | null { return typeof input === "boolean" ? input : null; }

/** Parses only the supplied response; no network calls, identifiers, token generation or money conversion. */
export function parseAlibabaResponse(input: unknown): { records: AlibabaRecord[]; issues: AlibabaParseIssue[] } {
  const root = object(input);
  if (!root || typeof root.success !== "boolean") throw new AlibabaResponseError("invalid-response");
  if (!root.success || root.unauthorizedRequest === true) throw new AlibabaResponseError("provider-rejected");
  const result = object(root.result);
  if (!result || !Array.isArray(result.departing) || result.departing.length > 2000) throw new AlibabaResponseError("invalid-response");
  const records: AlibabaRecord[] = [];
  const issues: AlibabaParseIssue[] = [];
  result.departing.forEach((input, index) => {
    const fail = (code: IssueCode) => { issues.push({ index, code }); };
    const row = object(input);
    if (!row) return fail("invalid-record");
    const origin = text(row.origin, 3), destination = text(row.destination, 3);
    if (!origin || !destination || !/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination) || origin === destination) return fail("invalid-route");
    const airlineCode = text(row.airlineCode, 3), airlineName = text(row.airlineName, 256);
    if (!airlineCode || !/^[A-Z0-9]{2,3}$/.test(airlineCode) || !airlineName) return fail("invalid-airline");
    const flightNumber = text(row.flightNumber, 16);
    // The supplied sample contains a trailing period ("1838."); retain it for later identity review.
    if (!flightNumber || !/^[A-Z0-9][A-Z0-9.]*$/.test(flightNumber)) return fail("invalid-flight-number");
    const departureLocal = localDateTime(row.leaveDateTime), arrivalLocal = localDateTime(row.arrivalDateTime);
    if (!departureLocal || !arrivalLocal || Temporal.PlainDateTime.compare(departureLocal, arrivalLocal) >= 0) return fail("invalid-schedule");
    const adultPriceRaw = row.priceAdult;
    if (typeof adultPriceRaw !== "number" || !Number.isSafeInteger(adultPriceRaw) || adultPriceRaw < 0) return fail("invalid-price");
    const fareClass = text(row.class, 32), cabin = text(row.classType, 32);
    if (!fareClass || !cabin) return fail("invalid-fare");
    let baggageRaw: AlibabaRecord["baggageRaw"] = null;
    if (row.maxAllowedBaggage !== null && row.maxAllowedBaggage !== undefined) {
      if (typeof row.maxAllowedBaggage === "number" && Number.isFinite(row.maxAllowedBaggage) && row.maxAllowedBaggage >= 0 && row.maxAllowedBaggage <= 1000) baggageRaw = row.maxAllowedBaggage;
      else if (typeof row.maxAllowedBaggage === "string") {
        baggageRaw = text(row.maxAllowedBaggage, 100);
        if (baggageRaw === null) return fail("invalid-baggage");
      } else return fail("invalid-baggage");
    }
    const seats = typeof row.seat === "number" && Number.isSafeInteger(row.seat) && row.seat >= 0 && row.seat <= 1000 ? row.seat : null;
    const unavailable = row.status === "X" || row.status === "C" || seats === 0 || row.isAllowedToBuy === false;
    const recognizedInventoryStatus = typeof row.status === "string" && /^(?:[1-9]|10)$/.test(row.status);
    const availability = unavailable ? "unavailable" : seats !== null && seats > 0 && row.isAllowedToBuy === true && recognizedInventoryStatus ? "available" : "unknown";
    records.push({
      origin, destination, airlineCode, airlineName, flightNumber, departureLocal, arrivalLocal,
      adultPriceRaw, priceUnit: "unverified", fareClass, cabin, baggageRaw, seats, availability,
      refundable: booleanOrNull(row.isRefundable), hasConnection: booleanOrNull(row.hasConnection), referenceIndex: index,
    });
  });
  return { records, issues };
}
