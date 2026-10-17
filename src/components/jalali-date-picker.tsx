"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LocalDate } from "@/domain/models";
import {
  JALALI_MONTHS, addJalaliDays, addJalaliMonths, daysInJalaliMonth,
  formatJalaliDate, gregorianToJalali, jalaliToGregorian, jalaliWeekdayIndex,
  type JalaliDate,
} from "@/domain/jalali";
import { toPersianDigits } from "@/domain/numerals";
import { parseLocalDate } from "@/domain/time";
import { Button, Dialog, Icon, Select } from "./ui";

const WEEKDAYS = [
  { short: "ش", name: "شنبه" }, { short: "ی", name: "یکشنبه" },
  { short: "د", name: "دوشنبه" }, { short: "س", name: "سه‌شنبه" },
  { short: "چ", name: "چهارشنبه" }, { short: "پ", name: "پنجشنبه" },
  { short: "ج", name: "جمعه" },
] as const;

function validDate(value: string | undefined): value is LocalDate {
  if (!value) return false;
  try { parseLocalDate(value); return true; } catch { return false; }
}

export interface JalaliDatePickerProps {
  /** Gregorian date-only value retained by search, API, and storage. */
  value: LocalDate;
  onChange: (value: LocalDate) => void;
  min: LocalDate;
  max: LocalDate;
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  placeholder?: string;
  /** A date-only opening month for an empty field; never a selected value. */
  initialMonth?: LocalDate;
}

export function JalaliDatePicker({
  value, onChange, min, max, id, "aria-label": label = "تاریخ رفت", "aria-invalid": invalid, "aria-describedby": describedBy, placeholder = "تاریخ را انتخاب کنید", initialMonth,
}: JalaliDatePickerProps) {
  const generatedId = useId();
  const triggerId = id ?? `jalali-date-${generatedId}`;
  const helpId = `${triggerId}-help`;
  const keyboardHelpId = `${triggerId}-keyboard-help`;
  const monthTitleId = `${triggerId}-month`;
  const [open, setOpen] = useState(false);
  // URL/storage drafts may be invalid. Render an unselected field until validation
  // is corrected instead of passing malformed input into calendar conversion.
  const selectedDate = validDate(value) ? value : "";
  const openingDate = selectedDate || (validDate(initialMonth) ? initialMonth : min);
  const initialDate = openingDate < min ? min : openingDate > max ? max : openingDate;
  const [view, setView] = useState(() => gregorianToJalali(initialDate));
  const [focusedDate, setFocusedDate] = useState(initialDate);
  const pendingDayFocus = useRef(false);
  const dayButtons = useRef(new Map<LocalDate, HTMLButtonElement>());
  const minimum = gregorianToJalali(min);
  const maximum = gregorianToJalali(max);
  const years = Array.from(
    { length: Math.max(1415, maximum.year, view.year) - Math.min(1400, minimum.year, view.year) + 1 },
    (_, index) => Math.min(1400, minimum.year, view.year) + index,
  );
  const monthLength = daysInJalaliMonth(view.year, view.month);
  const offset = jalaliWeekdayIndex({ year: view.year, month: view.month, day: 1 });
  const cellCount = Math.ceil((offset + monthLength) / 7) * 7;
  const clamp = (date: LocalDate): LocalDate => date < min ? min : date > max ? max : date;

  useEffect(() => {
    if (!open || !pendingDayFocus.current) return;
    const frame = requestAnimationFrame(() => {
      const button = dayButtons.current.get(focusedDate);
      if (button && !button.disabled) button.focus();
      pendingDayFocus.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [open, focusedDate, view.year, view.month]);

  function openPicker() {
    const date = clamp(selectedDate || (validDate(initialMonth) ? initialMonth : min));
    setView(gregorianToJalali(date));
    setFocusedDate(date);
    pendingDayFocus.current = true;
    setOpen(true);
  }

  function browseMonth(next: JalaliDate) {
    const first = jalaliToGregorian({ ...next, day: 1 });
    const last = jalaliToGregorian({ ...next, day: daysInJalaliMonth(next.year, next.month) });
    const candidate = clamp(jalaliToGregorian(next));
    // Browsing remains possible outside the demo range, but unavailable days cannot be selected.
    setFocusedDate(candidate >= first && candidate <= last ? candidate : first);
    setView(next);
  }

  function moveDay(event: KeyboardEvent<HTMLButtonElement>, date: LocalDate) {
    const parts = gregorianToJalali(date);
    let target: JalaliDate;
    switch (event.key) {
      // RTL: the following date is visually to the left.
      case "ArrowLeft": target = addJalaliDays(parts, 1); break;
      case "ArrowRight": target = addJalaliDays(parts, -1); break;
      case "ArrowUp": target = addJalaliDays(parts, -7); break;
      case "ArrowDown": target = addJalaliDays(parts, 7); break;
      case "Home": target = addJalaliDays(parts, -jalaliWeekdayIndex(parts)); break;
      case "End": target = addJalaliDays(parts, 6 - jalaliWeekdayIndex(parts)); break;
      case "PageUp": target = addJalaliMonths(parts, event.shiftKey ? -12 : -1); break;
      case "PageDown": target = addJalaliMonths(parts, event.shiftKey ? 12 : 1); break;
      default: return;
    }
    event.preventDefault();
    const next = clamp(jalaliToGregorian(target));
    pendingDayFocus.current = true;
    setFocusedDate(next);
    setView(gregorianToJalali(next));
    // At the bounds there is no state change to trigger an effect.
    if (next === focusedDate) {
      dayButtons.current.get(next)?.focus();
      pendingDayFocus.current = false;
    }
  }

  return (
    <>
      <button
        id={triggerId}
        type="button"
        className={`search-control jalali-date-trigger${selectedDate ? "" : " is-placeholder"}`}
        aria-label={label}
        aria-describedby={[helpId, describedBy].filter(Boolean).join(" ")}
        data-invalid={invalid || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openPicker}
      >{selectedDate ? formatJalaliDate(selectedDate) : placeholder}</button>
      <span id={helpId} className="visually-hidden">{selectedDate ? `تاریخ انتخاب‌شده: ${formatJalaliDate(selectedDate)}` : "تاریخی انتخاب نشده است"}؛ انتخاب از تقویم هجری شمسی</span>
      <Dialog open={open} onClose={() => setOpen(false)} title={`انتخاب ${label}`} className="picker-dialog jalali-calendar-dialog">
        <div className="jalali-calendar-navigation">
          <Button variant="circle" aria-label="ماه قبل" onClick={() => browseMonth(addJalaliMonths(view, -1))}><Icon icon={ChevronRight} /></Button>
          <p id={monthTitleId} className="jalali-month-title" aria-live="polite" aria-atomic="true">{JALALI_MONTHS[view.month - 1]} {toPersianDigits(view.year)}</p>
          <Button variant="circle" aria-label="ماه بعد" onClick={() => browseMonth(addJalaliMonths(view, 1))}><Icon icon={ChevronLeft} /></Button>
        </div>
        <div className="jalali-calendar-selectors">
          <label><span className="visually-hidden">ماه شمسی</span><Select aria-label="ماه شمسی" value={view.month} onChange={(event) => {
            const month = Number(event.target.value);
            browseMonth({ ...view, month, day: Math.min(view.day, daysInJalaliMonth(view.year, month)) });
          }}>{JALALI_MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</Select></label>
          <label><span className="visually-hidden">سال شمسی</span><Select aria-label="سال شمسی" value={view.year} onChange={(event) => {
            const year = Number(event.target.value);
            browseMonth({ ...view, year, day: Math.min(view.day, daysInJalaliMonth(year, view.month)) });
          }}>{years.map((year) => <option key={year} value={year}>{toPersianDigits(year)}</option>)}</Select></label>
        </div>
        <div role="grid" aria-labelledby={monthTitleId} aria-describedby={keyboardHelpId} className="jalali-calendar-grid">
          <div role="row" className="jalali-calendar-row">
            {WEEKDAYS.map((day) => <div key={day.name} role="columnheader" aria-label={day.name} className="jalali-weekday"><abbr title={day.name}>{day.short}</abbr></div>)}
          </div>
          {Array.from({ length: cellCount / 7 }, (_, week) => <div role="row" className="jalali-calendar-row" key={week}>
            {Array.from({ length: 7 }, (_, column) => {
              const day = week * 7 + column - offset + 1;
              if (day < 1 || day > monthLength) return <div role="gridcell" key={column} />;
              const iso = jalaliToGregorian({ year: view.year, month: view.month, day });
              const unavailable = iso < min || iso > max;
              return <div role="gridcell" key={column} aria-selected={value === iso}>
                <button
                  type="button"
                  ref={(element) => { if (element) dayButtons.current.set(iso, element); else dayButtons.current.delete(iso); }}
                  className={`jalali-day${value === iso ? " is-selected" : ""}`}
                  aria-label={formatJalaliDate(iso)}
                  disabled={unavailable}
                  tabIndex={focusedDate === iso ? 0 : -1}
                  onFocus={() => setFocusedDate(iso)}
                  onKeyDown={(event) => moveDay(event, iso)}
                  onClick={() => { onChange(iso); setOpen(false); }}
                >{toPersianDigits(day)}</button>
              </div>;
            })}
          </div>)}
        </div>
        <p className="small-text muted jalali-calendar-range">بازه نمایشی: {formatJalaliDate(min)} تا {formatJalaliDate(max)}. روزهای خارج از این بازه قابل انتخاب نیستند.</p>
        <p id={keyboardHelpId} className="visually-hidden">برای حرکت میان روزها از کلیدهای جهت، برای ابتدا و انتهای هفته از Home و End، برای ماه قبل و بعد از Page Up و Page Down و برای تغییر سال از Shift همراه آن‌ها استفاده کنید. Enter یا فاصله، تاریخ را انتخاب می‌کند.</p>
      </Dialog>
    </>
  );
}
