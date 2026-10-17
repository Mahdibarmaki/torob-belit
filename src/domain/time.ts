import { Temporal } from "@js-temporal/polyfill";
import type { HistoryWindow, Instant, LocalDate } from "./models";
import { CANCELLATION_HISTORY_POLICY } from "./policies";

export function parseUtcInstant(value: Instant): Temporal.Instant {
  if (typeof value !== "string" || !value.endsWith("Z")) {
    throw new RangeError("An ISO 8601 UTC instant ending in Z is required.");
  }
  return Temporal.Instant.from(value);
}

export function parseLocalDate(value: LocalDate): Temporal.PlainDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError("A calendar date in YYYY-MM-DD format is required.");
  }
  return Temporal.PlainDate.from(value, { overflow: "reject" });
}

export function localDateAt(instant: Instant, timeZone: string): LocalDate {
  return parseUtcInstant(instant).toZonedDateTimeISO(timeZone).toPlainDate().toString();
}

export function localMinuteAt(instant: Instant, timeZone: string): number {
  const local = parseUtcInstant(instant).toZonedDateTimeISO(timeZone);
  return local.hour * 60 + local.minute;
}

export function elapsedMinutes(departureAt: Instant, arrivalAt: Instant): number {
  const departure = parseUtcInstant(departureAt);
  const arrival = parseUtcInstant(arrivalAt);
  return arrival.since(departure).total("minutes");
}

export function previousCompletedDaysWindow(
  asOf: Instant,
  originTimeZone: string,
  days: number = CANCELLATION_HISTORY_POLICY.lookbackDays,
): HistoryWindow {
  if (!Number.isSafeInteger(days) || days < 1) {
    throw new RangeError("History lookback must be a positive integer.");
  }
  const anchor = parseUtcInstant(asOf).toZonedDateTimeISO(originTimeZone);
  const endDate = anchor.toPlainDate();
  const startDate = endDate.subtract({ days });
  return {
    startLocalDate: startDate.toString(),
    endLocalDate: endDate.toString(),
    originTimeZone,
    startAt: startDate.toZonedDateTime(originTimeZone).toInstant().toString(),
    endAt: endDate.toZonedDateTime(originTimeZone).toInstant().toString(),
  };
}

export function instantIsInWindow(instant: Instant, window: HistoryWindow): boolean {
  const value = parseUtcInstant(instant);
  return Temporal.Instant.compare(value, parseUtcInstant(window.startAt)) >= 0
    && Temporal.Instant.compare(value, parseUtcInstant(window.endAt)) < 0;
}

export function instantIsAfter(left: Instant, right: Instant): boolean {
  return Temporal.Instant.compare(parseUtcInstant(left), parseUtcInstant(right)) > 0;
}
