"use client";

import { useId, useState, type Ref } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { IRANIAN_AIRLINES } from "@/data/airlines";
import { ASSISTANT_DIMENSIONS, type AssistantDateContext, type AssistantDimension, type IntentField, type TravelIntent } from "@/domain/assistant-intent";
import { formatJalaliDate } from "@/domain/jalali";
import { formatToman, parseTomanInput } from "@/domain/money";
import { toLatinDigits } from "@/domain/numerals";
import { AirportSelector } from "../airport-selector";
import { JalaliDatePicker } from "../jalali-date-picker";
import { Button, Dialog, Icon, Input, Select } from "../ui";
import styles from "./travel-preferences.module.css";

const number = new Intl.NumberFormat("fa-IR");
const priorityLabels: Record<AssistantDimension, string> = {
  price: "قیمت کمتر", history: "سابقه لغو کمتر", departure: "ساعت مناسب‌تر", duration: "مدت کوتاه‌تر",
  stops: "توقف کمتر", baggage: "بار بیشتر", refundability: "امکان استرداد", airline: "ایرلاین ترجیحی",
};
const periodLabels = { any: "بدون ترجیح ساعت", morning: "صبح", afternoon: "بعدازظهر", evening: "عصر و شب" } as const;
const historyCategories = ["low", "medium", "high"] as const;
const historyLabels = { low: "کم (کمتر از ۱۰٪)", medium: "متوسط (۱۰٪ تا کمتر از ۲۵٪)", high: "زیاد (۲۵٪ و بیشتر)" } as const;
const money = (amountRials: number) => formatToman({ amountRials, currency: "IRR", unit: "rial" });

export interface TravelPreferencesProps {
  intent: TravelIntent;
  onChange: (next: TravelIntent, fields: IntentField[]) => void;
  onRecommend: () => void;
  busy: boolean;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  dateContext: AssistantDateContext;
  ready?: boolean;
  triggerRef?: Ref<HTMLButtonElement>;
}

/** Explicit edits remain separate from model proposals; prices stay canonical rials. */
export function TravelPreferences({ intent, onChange, onRecommend, busy, open, onOpenChange, dateContext, ready = true, triggerRef }: TravelPreferencesProps) {
  const bodyId = useId();
  const [constraintsOpen, setConstraintsOpen] = useState(false);
  const [budget, setBudget] = useState("");
  const [baggage, setBaggage] = useState("");
  const [nonstop, setNonstop] = useState(false);
  const [refundable, setRefundable] = useState(false);
  const [requiredPeriod, setRequiredPeriod] = useState<TravelIntent["hard"]["departurePeriod"]>("any");
  const [requiredHistory, setRequiredHistory] = useState<Array<typeof historyCategories[number]>>([]);
  const [error, setError] = useState("");
  const unsupportedPassengers = intent.passengers.children > 0 || intent.passengers.infants > 0;
  const returnMin = intent.departureDate && intent.departureDate > dateContext.dateBounds.min ? intent.departureDate : dateContext.dateBounds.min;
  const budgetLabel = intent.hard.maxTotalPriceRials === null ? null : `بودجه کل: ${money(intent.hard.maxTotalPriceRials)}`;
  const hasSummary = budgetLabel !== null || intent.hard.nonstopOnly || intent.hard.refundableOnly || intent.hard.minimumCheckedKg !== null
    || intent.hard.departurePeriod !== "any" || intent.hard.riskCategories.length > 0 || intent.tripType === "round-trip"
    || intent.soft.departurePeriod !== "any" || intent.soft.priorities.length > 0;

  function openConstraints() {
    setBudget(intent.hard.maxTotalPriceRials === null ? "" : money(intent.hard.maxTotalPriceRials).replace(/\s*تومان$/u, ""));
    setBaggage(intent.hard.minimumCheckedKg === null ? "" : number.format(intent.hard.minimumCheckedKg));
    setNonstop(intent.hard.nonstopOnly);
    setRefundable(intent.hard.refundableOnly);
    setRequiredPeriod(intent.hard.departurePeriod);
    setRequiredHistory([...intent.hard.riskCategories]);
    setError("");
    setConstraintsOpen(true);
  }

  function saveConstraints() {
    try {
      const maxTotalPriceRials = parseTomanInput(budget) ?? null;
      const normalizedBaggage = toLatinDigits(baggage).trim();
      if (normalizedBaggage && (!/^\d+$/u.test(normalizedBaggage) || Number(normalizedBaggage) > 200 || Number(normalizedBaggage) < 0)) {
        throw new RangeError("حداقل بار را به کیلوگرم، با عدد صحیح بین صفر و ۲۰۰ وارد کنید.");
      }
      const historyChanged = requiredHistory.length !== intent.hard.riskCategories.length || requiredHistory.some((category) => !intent.hard.riskCategories.includes(category));
      const nextHard = { ...intent.hard, maxTotalPriceRials, minimumCheckedKg: normalizedBaggage ? Number(normalizedBaggage) : null, nonstopOnly: nonstop, refundableOnly: refundable, departurePeriod: requiredPeriod, riskCategories: historyChanged ? [...requiredHistory] : intent.hard.riskCategories };
      const keys = ["maxTotalPriceRials", "minimumCheckedKg", "nonstopOnly", "refundableOnly", "departurePeriod"] as const;
      const changed = keys.filter((key) => nextHard[key] !== intent.hard[key]).map((key): IntentField => `hard.${key}`);
      if (historyChanged) changed.push("hard.riskCategories");
      if (changed.length) onChange({ ...intent, hard: nextHard }, changed);
      setConstraintsOpen(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "شرایط واردشده معتبر نیست."); }
  }

  function toggleAirline(id: string, soft: boolean) {
    const current = soft ? intent.soft.preferredAirlineIds : intent.hard.airlineIds;
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    onChange(soft ? { ...intent, soft: { ...intent.soft, preferredAirlineIds: next } } : { ...intent, hard: { ...intent.hard, airlineIds: next } }, [soft ? "soft.preferredAirlineIds" : "hard.airlineIds"]);
  }

  function togglePriority(priority: AssistantDimension) {
    const priorities = intent.soft.priorities.includes(priority) ? intent.soft.priorities.filter((item) => item !== priority) : [...intent.soft.priorities, priority];
    onChange({ ...intent, soft: { ...intent.soft, priorities } }, ["soft.priorities"]);
  }

  return <section className={styles.panel} aria-label="ترجیحات سفر" aria-busy={!ready}>
    <button ref={triggerRef} className={styles.toggle} type="button" disabled={!ready} aria-expanded={open} aria-controls={bodyId} onClick={() => onOpenChange(!open)}>
      <Icon icon={SlidersHorizontal} size={18} /><span>ترجیحات سفر</span><Icon icon={ChevronDown} size={16} className={open ? styles.expanded : undefined} />
    </button>
    <div id={bodyId} hidden={!open} className={styles.body}>
    {hasSummary && <div className={styles.chips} aria-label="خلاصه شرایط سفر">
      {budgetLabel !== null && <button className={styles.chip} type="button" disabled={busy} aria-haspopup="dialog" onClick={openConstraints}>{budgetLabel}</button>}
      {intent.hard.nonstopOnly && <span className={styles.fact}>الزامی: بدون توقف</span>}
      {intent.hard.refundableOnly && <span className={styles.fact}>الزامی: قابل استرداد</span>}
      {intent.hard.minimumCheckedKg !== null && <span className={styles.fact}>الزامی: حداقل {number.format(intent.hard.minimumCheckedKg)} کیلوگرم بار</span>}
      {intent.hard.departurePeriod !== "any" && <span className={styles.fact}>الزامی: حرکت {periodLabels[intent.hard.departurePeriod]}</span>}
      {intent.hard.riskCategories.length > 0 && <span className={styles.fact}>الزامی: سابقه لغو {intent.hard.riskCategories.map((category) => historyLabels[category]).join(" یا ")}</span>}
      {intent.tripType === "round-trip" && <span className={styles.fact}>رفت‌وبرگشت{intent.returnDate ? ` · ${formatJalaliDate(intent.returnDate)}` : ""}</span>}
      {intent.soft.departurePeriod !== "any" && <span className={styles.fact}>ترجیح ساعت: {periodLabels[intent.soft.departurePeriod]}</span>}
      {intent.soft.priorities.map((priority) => <span key={priority} className={styles.fact}>ترجیح: {priorityLabels[priority]}</span>)}
    </div>}
      <fieldset disabled={busy} className={styles.controls}>
        <legend className="visually-hidden">ویرایش صریح ترجیحات سفر</legend>
        <div className={styles.grid}>
          <label className={styles.field}><span>نوع سفر</span><Select aria-label="نوع سفر دستیار" value={intent.tripType} onChange={(event) => onChange({ ...intent, tripType: event.target.value as TravelIntent["tripType"] }, ["tripType"])}><option value="one-way">یک‌طرفه</option><option value="round-trip">رفت‌وبرگشت</option></Select></label>
          <label className={styles.field}><span>مسافران بزرگسال</span><Select aria-label="تعداد بزرگسالان دستیار" value={intent.passengers.adults} onChange={(event) => onChange({ ...intent, passengers: { ...intent.passengers, adults: Number(event.target.value) } }, ["passengers.adults"])}>{Array.from({ length: 9 }, (_, index) => <option value={index + 1} key={index}>{number.format(index + 1)} بزرگسال</option>)}</Select></label>
          <div className={styles.field}><span>مبدأ</span><AirportSelector label="مبدأ دستیار" value={intent.origin ?? ""} onChange={(origin) => onChange({ ...intent, origin }, ["origin"])} /></div>
          <div className={styles.field}><span>مقصد</span><AirportSelector direction="destination" label="مقصد دستیار" value={intent.destination ?? ""} onChange={(destination) => onChange({ ...intent, destination }, ["destination"])} /></div>
          <div className={styles.field}><span>تاریخ رفت</span><JalaliDatePicker aria-label="تاریخ رفت دستیار" value={intent.departureDate ?? ""} min={dateContext.dateBounds.min} max={dateContext.dateBounds.max} onChange={(departureDate) => onChange({ ...intent, departureDate }, ["departureDate"])} /></div>
          <div className={styles.field} hidden={intent.tripType !== "round-trip"}><span>تاریخ برگشت</span><JalaliDatePicker aria-label="تاریخ برگشت دستیار" value={intent.returnDate ?? ""} min={returnMin} max={dateContext.dateBounds.max} onChange={(returnDate) => onChange({ ...intent, returnDate }, ["returnDate"])} /></div>
        </div>
        {unsupportedPassengers && <div className={styles.unsupported} role="status"><p>{number.format(intent.passengers.children)} کودک و {number.format(intent.passengers.infants)} نوزاد در درخواست ثبت شده است. جست‌وجوی فعلی فقط بزرگسالان را پشتیبانی می‌کند؛ بدون تأیید شما این مسافران حذف نمی‌شوند.</p><Button variant="text" onClick={() => {
          const changed: IntentField[] = [];
          if (intent.passengers.children) changed.push("passengers.children");
          if (intent.passengers.infants) changed.push("passengers.infants");
          onChange({ ...intent, passengers: { ...intent.passengers, children: 0, infants: 0 } }, changed);
        }}>اصلاح درخواست به بزرگسالان فعلی</Button></div>}
        <fieldset className={styles.group}><legend>شرایط الزامی</legend><p className={styles.help}>پرواز باید همهٔ شرایط الزامی را با یک پیشنهاد فروشنده برآورده کند.</p>
          <Button variant="text" onClick={openConstraints}>ویرایش بودجه، بار و شرایط بلیط</Button>
          <details className={styles.airlines}><summary>فقط ایرلاین‌های انتخابی{intent.hard.airlineIds.length ? ` (${number.format(intent.hard.airlineIds.length)})` : "؛ بدون محدودیت"}</summary><div className={styles.choiceGrid}>{IRANIAN_AIRLINES.map((airline) => <label className={styles.check} key={airline.id}><input type="checkbox" checked={intent.hard.airlineIds.includes(airline.id)} onChange={() => toggleAirline(airline.id, false)} />{airline.name}</label>)}</div></details>
        </fieldset>
        <fieldset className={styles.group}><legend>اولویت‌های ترجیحی</legend><p className={styles.help}>این اولویت‌ها امتیاز و ترتیب را تغییر می‌دهند و پروازها را حذف نمی‌کنند.</p>
          <label className={styles.field}><span>ساعت حرکت ترجیحی</span><Select aria-label="ساعت حرکت ترجیحی" value={intent.soft.departurePeriod} onChange={(event) => onChange({ ...intent, soft: { ...intent.soft, departurePeriod: event.target.value as TravelIntent["soft"]["departurePeriod"] } }, ["soft.departurePeriod"])}>{Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
          <div className={styles.priorities} aria-label="عوامل اولویت‌بندی">{ASSISTANT_DIMENSIONS.map((priority) => <button type="button" className={styles.priority} key={priority} aria-pressed={intent.soft.priorities.includes(priority)} onClick={() => togglePriority(priority)}>{priorityLabels[priority]}</button>)}</div>
          <details className={styles.airlines}><summary>ایرلاین‌های ترجیحی{intent.soft.preferredAirlineIds.length ? ` (${number.format(intent.soft.preferredAirlineIds.length)})` : "؛ بدون ترجیح"}</summary><div className={styles.choiceGrid}>{IRANIAN_AIRLINES.map((airline) => <label className={styles.check} key={airline.id}><input type="checkbox" checked={intent.soft.preferredAirlineIds.includes(airline.id)} onChange={() => toggleAirline(airline.id, true)} />{airline.name}</label>)}</div></details>
        </fieldset>
      </fieldset>
    <div className={styles.actions}><Button variant="coral" className={styles.applyButton} onClick={onRecommend} disabled={busy} aria-busy={busy}>{busy ? "در حال بررسی پروازها…" : "اعمال ترجیحات"}</Button></div>
    </div>
    <Dialog open={constraintsOpen} onClose={() => setConstraintsOpen(false)} title="شرایط الزامی سفر" className="picker-dialog">
      <div className={styles.constraints}>
        <p className={styles.help}>بودجه، سقف قیمت کل برای همهٔ مسافران{intent.tripType === "round-trip" ? " و مجموع پرواز رفت‌وبرگشت" : ""} است. فقط مبالغ کامل و قابل مقایسه بررسی می‌شوند.</p>
        <label className={styles.field}><span>سقف بودجه کل به تومان</span><Input inputMode="decimal" value={budget} onChange={(event) => { setBudget(event.target.value); setError(""); }} placeholder="بدون سقف بودجه" aria-invalid={!!error} /></label>
        <label className={styles.field}><span>حداقل بار تحویلی هر بزرگسال (کیلوگرم)</span><Input inputMode="numeric" value={baggage} onChange={(event) => { setBaggage(event.target.value); setError(""); }} placeholder="بدون الزام بار" /></label>
        <label className={styles.field}><span>بازه حرکت الزامی</span><Select aria-label="بازه حرکت الزامی" value={requiredPeriod} onChange={(event) => setRequiredPeriod(event.target.value as TravelIntent["hard"]["departurePeriod"])}>{Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{value === "any" ? "بدون محدودیت ساعت" : label}</option>)}</Select></label>
        <fieldset className={styles.group}><legend>دسته سابقه لغو الزامی</legend><p className={styles.help}>انتخاب خالی، محدودیتی ندارد. با انتخاب دسته، فقط سابقه کافی در همان دسته پذیرفته می‌شود و داده نامشخص پذیرفته نیست. سابقه گذشته، احتمال لغو آینده نیست.</p>{historyCategories.map((category) => <label className={styles.check} key={category}><input type="checkbox" checked={requiredHistory.includes(category)} onChange={(event) => setRequiredHistory((current) => event.target.checked ? [...current, category] : current.filter((value) => value !== category))} />{historyLabels[category]}</label>)}</fieldset>
        <label className={styles.check}><input type="checkbox" checked={nonstop} onChange={(event) => setNonstop(event.target.checked)} />فقط پرواز بدون توقف</label>
        <label className={styles.check}><input type="checkbox" checked={refundable} onChange={(event) => setRefundable(event.target.checked)} />امکان استرداد الزامی است</label>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.actions}><Button variant="ghost" onClick={() => { setBudget(""); setBaggage(""); setNonstop(false); setRefundable(false); setRequiredPeriod("any"); setRequiredHistory([]); setError(""); }}>پاک کردن شرایط</Button><Button variant="coral" onClick={saveConstraints} disabled={busy}>تأیید شرایط</Button></div>
      </div>
    </Dialog>
  </section>;
}
