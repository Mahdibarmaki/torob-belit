import type { FlightSearchInput } from "./models";
import { parseLocalDate } from "./time";

export type TripType = "one-way" | "round-trip";
export type JourneyDirection = "outbound" | "inbound";
export interface JourneySearchDraft {
  tripType: TripType;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
}
export interface JourneySearch {
  tripType: TripType;
  query: FlightSearchInput;
  returnDate?: string;
}
export type SearchFieldErrors = Partial<Record<keyof JourneySearchDraft, string>>;
export const EMPTY_JOURNEY_SEARCH: JourneySearchDraft = { tripType: "one-way", origin: "", destination: "", departureDate: "", returnDate: "", adults: 1 };

export function isSearchDateWithinBounds(value: string, bounds: { min: string; max: string }): boolean {
  try { parseLocalDate(value); } catch { return false; }
  return value >= bounds.min && value <= bounds.max;
}

/** Validate date-only drafts before inventory is requested; no host timezone is involved. */
export function validateJourneySearch(draft: JourneySearchDraft, options: { airportCodes: readonly string[]; dateBounds: { min: string; max: string } }): { search: JourneySearch | null; errors: SearchFieldErrors } {
  const errors: SearchFieldErrors = {};
  if (!draft.origin) errors.origin = "شهر مبدأ را انتخاب کنید.";
  else if (!options.airportCodes.includes(draft.origin)) errors.origin = "فرودگاه مبدأ معتبر نیست.";
  if (!draft.destination) errors.destination = "شهر مقصد را انتخاب کنید.";
  else if (!options.airportCodes.includes(draft.destination)) errors.destination = "فرودگاه مقصد معتبر نیست.";
  else if (draft.origin === draft.destination) errors.destination = "مبدأ و مقصد باید متفاوت باشند.";
  if (!Number.isSafeInteger(draft.adults) || draft.adults < 1 || draft.adults > 9) errors.adults = "تعداد بزرگسالان باید بین ۱ و ۹ باشد.";
  const dateError = (value: string, required: string) => {
    if (!value) return required;
    try { parseLocalDate(value); } catch { return "تاریخ معتبر انتخاب کنید."; }
    if (value < options.dateBounds.min || value > options.dateBounds.max) return "تاریخ خارج از بازه قابل جست‌وجو است.";
  };
  const departureError = dateError(draft.departureDate, "تاریخ رفت را انتخاب کنید.");
  if (departureError) errors.departureDate = departureError;
  if (draft.tripType === "round-trip") {
    const returnError = dateError(draft.returnDate, "تاریخ برگشت را انتخاب کنید.");
    if (returnError) errors.returnDate = returnError;
    else if (!departureError && draft.returnDate < draft.departureDate) errors.returnDate = "تاریخ برگشت نباید پیش از تاریخ رفت باشد.";
  }
  if (Object.keys(errors).length) return { search: null, errors };
  return { errors, search: { tripType: draft.tripType, query: { origin: draft.origin, destination: draft.destination, departureDate: draft.departureDate, adults: draft.adults, currency: "IRR" }, ...(draft.tripType === "round-trip" ? { returnDate: draft.returnDate } : {}) } };
}

/** Each direction has its own exact airport/date context and independent filters. */
export function journeyLegQuery(search: JourneySearch, direction: JourneyDirection): FlightSearchInput {
  if (direction === "outbound") return { ...search.query };
  if (search.tripType !== "round-trip" || !search.returnDate) throw new RangeError("A return date is required for the inbound leg.");
  return { ...search.query, origin: search.query.destination, destination: search.query.origin, departureDate: search.returnDate };
}

export function journeySearchUrl(search: JourneySearch, mode: string): string {
  const params = new URLSearchParams({ origin: search.query.origin, destination: search.query.destination, date: search.query.departureDate, adults: String(search.query.adults), mode });
  if (search.tripType === "round-trip") { params.set("tripType", "round-trip"); params.set("returnDate", search.returnDate!); }
  return `/?${params}`;
}
