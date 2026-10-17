import { Temporal } from "@js-temporal/polyfill";
import { AIRPORTS } from "../data/airports";
import { IRANIAN_AIRLINES } from "../data/airlines";
import { searchAirports } from "../lib/airport-search";
import { jalaliToGregorian, type JalaliDate } from "./jalali";
import { parseLocalDate, parseUtcInstant } from "./time";
import type { Instant, LocalDate } from "./models";
import type { JourneySearch } from "./journey-search";

export const ASSISTANT_DIMENSIONS = ["price", "history", "departure", "duration", "stops", "baggage", "refundability", "airline"] as const;
export type AssistantDimension = typeof ASSISTANT_DIMENSIONS[number];
export interface TravelIntent {
  schemaVersion: 1;
  origin: string | null;
  destination: string | null;
  departureDate: LocalDate | null;
  returnDate: LocalDate | null;
  tripType: "one-way" | "round-trip";
  passengers: { adults: number; children: number; infants: number };
  mode: "demo" | "live" | "fixture";
  hard: { maxTotalPriceRials: number | null; nonstopOnly: boolean; minimumCheckedKg: number | null; refundableOnly: boolean; airlineIds: string[]; departurePeriod: "any" | "morning" | "afternoon" | "evening"; riskCategories: ("low" | "medium" | "high")[] };
  soft: { priorities: AssistantDimension[]; departurePeriod: "any" | "morning" | "afternoon" | "evening"; preferredAirlineIds: string[] };
}
export type IntentPatch = Partial<Omit<TravelIntent, "schemaVersion" | "hard" | "soft" | "passengers">> & {
  hard?: Partial<TravelIntent["hard"]>;
  soft?: Partial<TravelIntent["soft"]>;
  passengers?: Partial<TravelIntent["passengers"]>;
};
export type IntentField = Exclude<keyof TravelIntent, "schemaVersion" | "hard" | "soft" | "passengers">
  | `hard.${keyof TravelIntent["hard"]}` | `soft.${keyof TravelIntent["soft"]}` | `passengers.${keyof TravelIntent["passengers"]}`;
export interface IntentConflict { field: IntentField; current: unknown; proposed: unknown }
export interface AssistantDateContext { now: Instant; timeZone: string; dateBounds: { min: LocalDate; max: LocalDate } }
export interface IntentValidation { ready: boolean; question: string | null; issues: { field: IntentField; message: string }[]; query: JourneySearch | null }
export type AssistantDateMention = { kind: "iso"; date: LocalDate } | ({ kind: "jalali" } & JalaliDate)
  | { kind: "relative"; days: number } | { kind: "weekday"; weekday: number; week: "this" | "next" | null }
  | { kind: "weekend" };

export function emptyTravelIntent(): TravelIntent {
  return { schemaVersion: 1, origin: null, destination: null, departureDate: null, returnDate: null, tripType: "one-way", passengers: { adults: 1, children: 0, infants: 0 }, mode: "demo",
    hard: { maxTotalPriceRials: null, nonstopOnly: false, minimumCheckedKg: null, refundableOnly: false, airlineIds: [], departurePeriod: "any", riskCategories: [] },
    soft: { priorities: [], departurePeriod: "any", preferredAirlineIds: [] } };
}

const ROOT_FIELDS = ["origin", "destination", "departureDate", "returnDate", "tripType", "passengers", "mode", "hard", "soft"] as const;
const HARD_FIELDS = ["maxTotalPriceRials", "nonstopOnly", "minimumCheckedKg", "refundableOnly", "airlineIds", "departurePeriod", "riskCategories"] as const;
const SOFT_FIELDS = ["priorities", "departurePeriod", "preferredAirlineIds"] as const;
const PASSENGER_FIELDS = ["adults", "children", "infants"] as const;
const INTENT_FIELDS: readonly string[] = [...ROOT_FIELDS.filter((key) => !["hard", "soft", "passengers"].includes(key)), ...HARD_FIELDS.map((key) => `hard.${key}`), ...SOFT_FIELDS.map((key) => `soft.${key}`), ...PASSENGER_FIELDS.map((key) => `passengers.${key}`)];

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("ساختار ترجیحات سفر معتبر نیست.");
  return value as Record<string, unknown>;
}
function keys(row: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(row).some((key) => !allowed.includes(key))) throw new TypeError("فیلد ناشناخته در ترجیحات سفر وجود دارد.");
}
function member<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== "string" || !choices.includes(value as T)) throw new TypeError("مقدار ترجیح سفر معتبر نیست.");
  return value as T;
}
function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new TypeError("عدد ترجیحات سفر معتبر نیست.");
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new TypeError("شرط سفر باید درست یا نادرست باشد.");
  return value;
}
function airport(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new TypeError("فرودگاه معتبر انتخاب کنید.");
  const code = value.normalize("NFKC").trim().toUpperCase();
  if (!AIRPORTS.some((item) => item.code === code)) throw new TypeError("فرودگاه در فهرست پشتیبانی‌شده نیست.");
  return code;
}
function date(value: unknown): LocalDate | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new TypeError("تاریخ سفر معتبر نیست.");
  return parseLocalDate(value).toString();
}
function airlineIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 20) throw new TypeError("فهرست ایرلاین معتبر نیست.");
  return [...new Set(value.map((entry) => {
    if (typeof entry !== "string") throw new TypeError("شناسه ایرلاین معتبر نیست.");
    const code = entry.normalize("NFKC").trim().toUpperCase();
    const airline = IRANIAN_AIRLINES.find((item) => [item.id, item.iata, item.icao].includes(code));
    if (!airline) throw new TypeError("ایرلاین در فهرست پشتیبانی‌شده نیست.");
    return airline.id;
  }))];
}

/** Strict runtime allowlist for both model output and editable structured preferences. */
export function parseIntentPatch(value: unknown): IntentPatch {
  const row = object(value);
  keys(row, ROOT_FIELDS);
  const result: IntentPatch = {};
  for (const field of ["origin", "destination"] as const) if (Object.hasOwn(row, field)) result[field] = airport(row[field]);
  for (const field of ["departureDate", "returnDate"] as const) if (Object.hasOwn(row, field)) result[field] = date(row[field]);
  if (Object.hasOwn(row, "tripType")) result.tripType = member(row.tripType, ["one-way", "round-trip"] as const);
  if (Object.hasOwn(row, "mode")) result.mode = member(row.mode, ["demo", "live", "fixture"] as const);
  if (Object.hasOwn(row, "passengers")) {
    const passengers = object(row.passengers); keys(passengers, PASSENGER_FIELDS);
    result.passengers = {};
    for (const field of PASSENGER_FIELDS) if (Object.hasOwn(passengers, field)) result.passengers[field] = integer(passengers[field], field === "adults" ? 1 : 0, 9);
  }
  if (Object.hasOwn(row, "hard")) {
    const hard = object(row.hard); keys(hard, HARD_FIELDS); result.hard = {};
    if (Object.hasOwn(hard, "maxTotalPriceRials")) result.hard.maxTotalPriceRials = hard.maxTotalPriceRials === null ? null : integer(hard.maxTotalPriceRials, 0, Number.MAX_SAFE_INTEGER);
    if (Object.hasOwn(hard, "minimumCheckedKg")) result.hard.minimumCheckedKg = hard.minimumCheckedKg === null ? null : integer(hard.minimumCheckedKg, 0, 200);
    for (const field of ["nonstopOnly", "refundableOnly"] as const) if (Object.hasOwn(hard, field)) result.hard[field] = boolean(hard[field]);
    if (Object.hasOwn(hard, "airlineIds")) result.hard.airlineIds = airlineIds(hard.airlineIds);
    if (Object.hasOwn(hard, "departurePeriod")) result.hard.departurePeriod = member(hard.departurePeriod, ["any", "morning", "afternoon", "evening"] as const);
    if (Object.hasOwn(hard, "riskCategories")) {
      if (!Array.isArray(hard.riskCategories) || hard.riskCategories.length > 3) throw new TypeError("رده‌های سابقه لغو معتبر نیست.");
      result.hard.riskCategories = [...new Set(hard.riskCategories.map((item) => member(item, ["low", "medium", "high"] as const)))];
    }
  }
  if (Object.hasOwn(row, "soft")) {
    const soft = object(row.soft); keys(soft, SOFT_FIELDS); result.soft = {};
    if (Object.hasOwn(soft, "departurePeriod")) result.soft.departurePeriod = member(soft.departurePeriod, ["any", "morning", "afternoon", "evening"] as const);
    if (Object.hasOwn(soft, "preferredAirlineIds")) result.soft.preferredAirlineIds = airlineIds(soft.preferredAirlineIds);
    if (Object.hasOwn(soft, "priorities")) {
      if (!Array.isArray(soft.priorities) || soft.priorities.length > ASSISTANT_DIMENSIONS.length) throw new TypeError("فهرست اولویت‌ها معتبر نیست.");
      result.soft.priorities = [...new Set(soft.priorities.map((item) => member(item, ASSISTANT_DIMENSIONS)))];
    }
  }
  return result;
}

export function parseTravelIntent(value: unknown): TravelIntent {
  const row = object(value); keys(row, ["schemaVersion", ...ROOT_FIELDS]);
  if (row.schemaVersion !== 1 || ROOT_FIELDS.some((field) => !Object.hasOwn(row, field))) throw new TypeError("نسخه یا اطلاعات ترجیحات سفر ناقص است.");
  for (const [name, fields] of [["hard", HARD_FIELDS], ["soft", SOFT_FIELDS], ["passengers", PASSENGER_FIELDS]] as const) {
    const nested = object(row[name]);
    if (fields.some((field) => !Object.hasOwn(nested, field))) throw new TypeError("ترجیحات سفر ناقص است.");
  }
  const { schemaVersion: _, ...patch } = row; void _;
  return { schemaVersion: 1, ...parseIntentPatch(patch) } as TravelIntent;
}

export function parseIntentFields(value: unknown): IntentField[] {
  if (!Array.isArray(value) || value.length > INTENT_FIELDS.length || value.some((field) => typeof field !== "string" || !INTENT_FIELDS.includes(field))) throw new TypeError("فهرست انتخاب‌های تأییدشده معتبر نیست.");
  return [...new Set(value)] as IntentField[];
}

/** Omitted values stay untouched. A model can propose, but cannot overwrite a locked selection. */
export function mergeIntentPatch(currentValue: TravelIntent, patchValue: IntentPatch, lockedFields: readonly IntentField[] = [], source: "model" | "manual" = "model"): { intent: TravelIntent; conflicts: IntentConflict[] } {
  const current = parseTravelIntent(currentValue);
  const patch = parseIntentPatch(patchValue);
  const locks = new Set(parseIntentFields([...lockedFields]));
  const intent = structuredClone(current);
  const conflicts: IntentConflict[] = [];
  const apply = (field: IntentField, proposed: unknown) => {
    const [group, child] = field.split(".");
    const target = child ? intent[group as "hard" | "soft" | "passengers"] as unknown as Record<string, unknown> : intent as unknown as Record<string, unknown>;
    const key = child ?? group;
    if (source === "model" && locks.has(field) && JSON.stringify(target[key]) !== JSON.stringify(proposed)) conflicts.push({ field, current: target[key], proposed });
    else target[key] = proposed;
  };
  for (const [field, value] of Object.entries(patch)) {
    if (field === "hard" || field === "soft" || field === "passengers") {
      for (const [child, proposed] of Object.entries(object(value))) apply(`${field}.${child}` as IntentField, proposed);
    } else apply(field as IntentField, value);
  }
  return { intent: parseTravelIntent(intent), conflicts };
}

export function normalizeAssistantAirport(value: string): { airportCode: string | null; candidates: string[]; question: string | null } {
  if (typeof value !== "string" || !value.trim() || value.length > 120) return { airportCode: null, candidates: [], question: "شهر یا کد فرودگاه را دقیق‌تر بگو." };
  const exact = AIRPORTS.find((item) => item.code === value.normalize("NFKC").trim().toUpperCase());
  let matches = exact ? [exact] : searchAirports(AIRPORTS, value);
  // Composite names such as “Tehran Mehrabad” intersect the existing reviewed aliases.
  const words = value.trim().split(/[\s()،,]+/u).filter(Boolean);
  if (!exact && matches.length === 0 && words.length > 1) matches = AIRPORTS.filter((item) => words.every((word) => searchAirports([item], word).length === 1));
  return { airportCode: matches.length === 1 ? matches[0].code : null, candidates: matches.map((item) => item.code), question: matches.length === 1 ? null : matches.length > 1 ? "منظورت کدام فرودگاه است؟" : "این شهر یا فرودگاه در فهرست فعلی نیست؛ فرودگاه را اصلاح کن." };
}

function dateContext(value: AssistantDateContext): Temporal.PlainDate {
  const today = parseUtcInstant(value.now).toZonedDateTimeISO(value.timeZone).toPlainDate();
  parseLocalDate(value.dateBounds.min); parseLocalDate(value.dateBounds.max);
  if (value.dateBounds.max < value.dateBounds.min) throw new TypeError("بازه قابل جست‌وجو معتبر نیست.");
  return today;
}

/** Dates are resolved using an explicit server clock and zone, independently of fixed history clocks. */
export function normalizeAssistantDateMention(value: unknown, context: AssistantDateContext): { date: LocalDate | null; question: string | null } {
  const today = dateContext(context);
  const row = object(value);
  let result: string;
  switch (row.kind) {
    case "iso": keys(row, ["kind", "date"]); result = date(row.date) ?? ""; break;
    case "jalali": keys(row, ["kind", "year", "month", "day"]); result = jalaliToGregorian({ year: integer(row.year, 1, 9999), month: integer(row.month, 1, 12), day: integer(row.day, 1, 31) }); break;
    case "relative": keys(row, ["kind", "days"]); result = today.add({ days: integer(row.days, 0, 3650) }).toString(); break;
    case "weekday": {
      keys(row, ["kind", "weekday", "week"]);
      const weekday = integer(row.weekday, 1, 7);
      if (row.week === null) return { date: null, question: "منظورت این هفته است یا هفته آینده؟" };
      const week = member(row.week, ["this", "next"]);
      // The Iranian week starts Saturday (ISO weekday 6), and ends Friday (5).
      const index = (today.dayOfWeek + 1) % 7;
      const targetIndex = (weekday + 1) % 7;
      result = today.subtract({ days: index }).add({ days: targetIndex + (week === "next" ? 7 : 0) }).toString();
      break;
    }
    case "weekend": keys(row, ["kind"]); return { date: null, question: "برای آخر هفته، پنجشنبه را می‌خواهی یا جمعه؛ این هفته یا هفته آینده؟" };
    default: throw new TypeError("نوع تاریخ سفر معتبر نیست.");
  }
  if (!result || result < today.toString() || result < context.dateBounds.min || result > context.dateBounds.max) return { date: null, question: "تاریخ در بازه قابل جست‌وجو نیست؛ یک تاریخ آینده معتبر انتخاب کن." };
  return { date: result, question: null };
}

export function validateAssistantIntent(value: TravelIntent, context: AssistantDateContext): IntentValidation {
  const intent = parseTravelIntent(value);
  const today = dateContext(context).toString();
  const issues: IntentValidation["issues"] = [];
  const add = (field: IntentField, message: string) => issues.push({ field, message });
  if (intent.passengers.children || intent.passengers.infants) add("passengers.children", "در نسخه فعلی فقط مسافر بزرگسال پشتیبانی می‌شود؛ ترکیب مسافران را اصلاح کن.");
  if (!intent.origin) add("origin", "از کدوم شهر یا فرودگاه می‌خوای پرواز کنی؟");
  if (!intent.destination) add("destination", "مقصدت کدام شهر یا فرودگاه است؟");
  if (intent.origin && intent.origin === intent.destination) add("destination", "مبدأ و مقصد باید متفاوت باشند؛ مقصد را اصلاح کن.");
  if (!intent.departureDate) add("departureDate", "چه تاریخی برای سفرت در نظر داری؟");
  const checkDate = (field: "departureDate" | "returnDate") => {
    const selected = intent[field];
    if (selected && (selected < today || selected < context.dateBounds.min || selected > context.dateBounds.max)) add(field, "تاریخ خارج از بازه قابل جست‌وجو است؛ یک تاریخ آینده معتبر انتخاب کن.");
  };
  checkDate("departureDate");
  if (intent.tripType === "round-trip") {
    if (!intent.returnDate) add("returnDate", "برای برگشت چه تاریخی مدنظرته؟");
    checkDate("returnDate");
    if (intent.returnDate && intent.departureDate && intent.returnDate < intent.departureDate) add("returnDate", "تاریخ برگشت نباید قبل از رفت باشد؛ تاریخ را اصلاح کن.");
  }
  return { ready: issues.length === 0, question: issues[0]?.message ?? null, issues, query: issues.length ? null : { tripType: intent.tripType,
    query: { origin: intent.origin!, destination: intent.destination!, departureDate: intent.departureDate!, adults: intent.passengers.adults, currency: "IRR" },
    ...(intent.tripType === "round-trip" ? { returnDate: intent.returnDate! } : {}) } };
}

export function missingIntentQuestion(value: TravelIntent, context: AssistantDateContext): string | null {
  return validateAssistantIntent(value, context).question;
}
