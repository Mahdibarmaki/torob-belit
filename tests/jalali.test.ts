import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addJalaliDays, addJalaliMonths, daysInJalaliMonth, formatJalaliDate,
  formatJalaliInstant, gregorianToJalali, jalaliToGregorian, jalaliWeekdayIndex,
} from "../src/domain/jalali";
import { toLatinDigits, toPersianDigits } from "../src/domain/numerals";

afterEach(() => vi.unstubAllEnvs());

describe("Jalali and Gregorian date-only conversion", () => {
  it.each([
    ["2024-03-20", { year: 1403, month: 1, day: 1 }],
    ["2025-03-21", { year: 1404, month: 1, day: 1 }],
    ["2026-03-21", { year: 1405, month: 1, day: 1 }],
    ["2026-10-16", { year: 1405, month: 7, day: 24 }],
    ["2024-02-29", { year: 1402, month: 12, day: 10 }],
    ["2024-09-21", { year: 1403, month: 6, day: 31 }],
    ["2024-09-22", { year: 1403, month: 7, day: 1 }],
    ["2025-03-20", { year: 1403, month: 12, day: 30 }],
    ["2026-03-20", { year: 1404, month: 12, day: 29 }],
  ])("round-trips %s without a timestamp", (iso, jalali) => {
    expect(gregorianToJalali(iso)).toEqual(jalali);
    expect(jalaliToGregorian(jalali)).toBe(iso);
  });

  it("uses the six 31-day months, five 30-day months, and leap-dependent Esfand", () => {
    expect(Array.from({ length: 12 }, (_, index) => daysInJalaliMonth(1403, index + 1)))
      .toEqual([31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30]);
    expect(daysInJalaliMonth(1404, 12)).toBe(29);
    expect(() => jalaliToGregorian({ year: 1404, month: 12, day: 30 })).toThrow(RangeError);
    expect(() => jalaliToGregorian({ year: 1403, month: 7, day: 31 })).toThrow(RangeError);
  });

  it.each([
    { year: 1403.5, month: 1, day: 1 }, { year: 1403, month: 1.5, day: 1 },
    { year: 1403, month: 1, day: 1.5 }, { year: 1403, month: 0, day: 1 },
    { year: 1403, month: 13, day: 1 }, { year: 1403, month: 1, day: 0 },
    { year: Number.NaN, month: 1, day: 1 }, { year: 0, month: 1, day: 1 },
  ])("rejects invalid Jalali fields instead of silently constraining %j", (value) => {
    expect(() => jalaliToGregorian(value)).toThrow(RangeError);
  });

  it.each(["2025-02-29", "2100-02-29", "2026-13-01", "2026-10-32", "2026-1-01", "2026-10-16T00:00:00Z", "۱۴۰۵-۰۷-۲۴"])(
    "rejects invalid Gregorian date-only input %s", (value) => {
      expect(() => gregorianToJalali(value)).toThrow(RangeError);
    },
  );

  it("never changes date-only output with the host timezone", () => {
    for (const timeZone of ["UTC", "Asia/Tehran", "America/Los_Angeles", "Pacific/Kiritimati"]) {
      vi.stubEnv("TZ", timeZone);
      expect(formatJalaliDate("2025-03-21")).toBe("۱ فروردین ۱۴۰۴");
      expect(jalaliToGregorian({ year: 1404, month: 1, day: 1 })).toBe("2025-03-21");
    }
  });
});

describe("Jalali presentation and calendar navigation", () => {
  it("formats Persian month names and numerals consistently", () => {
    expect(formatJalaliDate("2026-10-16")).toBe("۲۴ مهر ۱۴۰۵");
    expect(formatJalaliDate("2025-03-20")).toBe("۳۰ اسفند ۱۴۰۳");
  });

  it("localizes instants in the explicit origin zone at the Nowruz boundary", () => {
    expect(formatJalaliInstant("2025-03-20T20:29:00Z", "Asia/Tehran"))
      .toBe("۳۰ اسفند ۱۴۰۳، ساعت ۲۳:۵۹");
    expect(formatJalaliInstant("2025-03-20T20:30:00Z", "Asia/Tehran"))
      .toBe("۱ فروردین ۱۴۰۴، ساعت ۰۰:۰۰");
    expect(formatJalaliInstant("2025-03-20T20:30:00Z", "UTC"))
      .toBe("۳۰ اسفند ۱۴۰۳، ساعت ۲۰:۳۰");
    expect(() => formatJalaliInstant("2025-03-20", "Asia/Tehran")).toThrow(RangeError);
    expect(() => formatJalaliInstant("2025-03-20T20:30:00Z", "Invalid/Zone")).toThrow(RangeError);
  });

  it("navigates month and leap-year boundaries using Persian calendar arithmetic", () => {
    expect(addJalaliMonths({ year: 1403, month: 6, day: 31 }, 1)).toEqual({ year: 1403, month: 7, day: 30 });
    expect(addJalaliMonths({ year: 1403, month: 12, day: 30 }, 12)).toEqual({ year: 1404, month: 12, day: 29 });
    expect(addJalaliDays({ year: 1403, month: 12, day: 30 }, 1)).toEqual({ year: 1404, month: 1, day: 1 });
    expect(addJalaliDays({ year: 1404, month: 1, day: 1 }, -1)).toEqual({ year: 1403, month: 12, day: 30 });
  });

  it("places Saturday at the beginning and Friday at the end of RTL calendar rows", () => {
    expect(jalaliWeekdayIndex({ year: 1404, month: 1, day: 2 })).toBe(0); // Saturday, March 22
    expect(jalaliWeekdayIndex({ year: 1404, month: 1, day: 1 })).toBe(6); // Friday, March 21
  });
});

describe("Persian numerals", () => {
  it("formats ASCII digits without changing separators or text", () => {
    expect(toPersianDigits("1,234.5 تومان")).toBe("۱,۲۳۴.۵ تومان");
    expect(toPersianDigits(1405)).toBe("۱۴۰۵");
  });

  it("normalizes Persian and Arabic-Indic keyboard numerals", () => {
    expect(toLatinDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(toLatinDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(toLatinDigits("۱۲۳٬٤٥٦.7 تومان")).toBe("123٬456.7 تومان");
  });
});
