import { Temporal } from "@js-temporal/polyfill";
import type { Instant, LocalDate } from "./models";
import { toPersianDigits } from "./numerals";
import { parseLocalDate, parseUtcInstant } from "./time";

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
] as const;

function parseJalaliDate(value: JalaliDate): Temporal.PlainDate {
  if (![value.year, value.month, value.day].every(Number.isSafeInteger)
    || value.year < 1 || value.month < 1 || value.month > 12 || value.day < 1) {
    throw new RangeError("A valid integer Persian calendar date is required.");
  }
  return Temporal.PlainDate.from({ ...value, calendar: "persian" }, { overflow: "reject" });
}

function jalaliParts(value: Temporal.PlainDate): JalaliDate {
  const date = value.withCalendar("persian");
  return { year: date.year, month: date.month, day: date.day };
}

/** A date-only conversion: no timestamp, host timezone, or midnight is involved. */
export function gregorianToJalali(value: LocalDate): JalaliDate {
  return jalaliParts(parseLocalDate(value));
}

/** Preserve the API/storage contract: strict, unannotated Gregorian YYYY-MM-DD. */
export function jalaliToGregorian(value: JalaliDate): LocalDate {
  const iso = parseJalaliDate(value).withCalendar("iso8601").toString();
  return parseLocalDate(iso).toString();
}

export function daysInJalaliMonth(year: number, month: number): number {
  return parseJalaliDate({ year, month, day: 1 }).daysInMonth;
}

/** Calendar navigation intentionally constrains the day at shorter month boundaries. */
export function addJalaliMonths(value: JalaliDate, months: number): JalaliDate {
  if (!Number.isSafeInteger(months)) throw new RangeError("An integer month offset is required.");
  return jalaliParts(parseJalaliDate(value).add({ months }, { overflow: "constrain" }));
}

export function addJalaliDays(value: JalaliDate, days: number): JalaliDate {
  if (!Number.isSafeInteger(days)) throw new RangeError("An integer day offset is required.");
  return jalaliParts(parseJalaliDate(value).add({ days }));
}

/** Persian calendar columns start on Saturday (0), ending on Friday (6). */
export function jalaliWeekdayIndex(value: JalaliDate): number {
  return (parseJalaliDate(value).dayOfWeek + 1) % 7;
}

export function formatJalaliDate(value: LocalDate): string {
  const { year, month, day } = gregorianToJalali(value);
  return `${toPersianDigits(day)} ${JALALI_MONTHS[month - 1]} ${toPersianDigits(year)}`;
}

/** An instant is localized only with the caller's explicit IANA timezone. */
export function formatJalaliInstant(value: Instant, timeZone: string): string {
  const local = parseUtcInstant(value).toZonedDateTimeISO(timeZone);
  const time = toPersianDigits(`${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`);
  return `${formatJalaliDate(local.toPlainDate().toString())}، ساعت ${time}`;
}
