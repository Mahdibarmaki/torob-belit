import "server-only";
import { emptyTravelIntent, mergeIntentPatch, missingIntentQuestion, normalizeAssistantAirport, normalizeAssistantDateMention, parseIntentFields, parseIntentPatch, parseTravelIntent, type AssistantDateContext, type IntentPatch, type TravelIntent } from "@/domain/assistant-intent";
import type { AssistantInterpretRequest, AssistantInterpretation } from "@/domain/assistant-provider";
import { parseTomanInput } from "@/domain/money";
import { toLatinDigits } from "@/domain/numerals";
import { AssistantHttpError } from "@/server/assistant-http";
import { MODEL_CLEAR_FIELDS, TRAVEL_PATCH_SCHEMA } from "./contract";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid object");
  return value as Record<string, unknown>;
}

function text(value: unknown, max = 2_000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new AssistantHttpError("پیام باید بین ۱ تا ۲۰۰۰ نویسه باشد.");
  return value.trim();
}

/** Conservative boundary screen, not a guarantee that all personal information is detectable. */
export function containsSensitiveAssistantText(value: string): boolean {
  const normalized = toLatinDigits(value).normalize("NFKC");
  return /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u.test(normalized)
    || /(?:\+98|0098|0)9[\s-]*(?:\d[\s-]*){9}(?!\d)/u.test(normalized)
    || /(?:کد\s*ملی|شماره\s*(?:ملی|گذرنامه|پاسپورت)|national\s*(?:id|identity)|passport|identity\s*document)/iu.test(normalized)
    || /(?:شماره\s*کارت|card\s*number|cvv|رمز\s*(?:پویا|کارت))/iu.test(normalized);
}

export function parseAssistantInterpretRequest(value: unknown): AssistantInterpretRequest {
  const row = record(value);
  if (Object.keys(row).some((key) => !["message", "intent", "confirmedFields", "history"].includes(key))) throw new AssistantHttpError("فیلد درخواست مجاز نیست.");
  const message = text(row.message);
  const intent = parseTravelIntent(row.intent);
  const confirmedFields = parseIntentFields(row.confirmedFields);
  let history: AssistantInterpretRequest["history"] = [];
  if (row.history !== undefined) {
    if (!Array.isArray(row.history) || row.history.length > 20) throw new AssistantHttpError("تاریخچه گفتگو بیش از حد طولانی است.");
    history = row.history.map((entry) => {
      const item = record(entry);
      if (Object.keys(item).some((key) => !["role", "content"].includes(key)) || !["user", "assistant"].includes(String(item.role))) throw new AssistantHttpError("تاریخچه گفتگو معتبر نیست.");
      return { role: item.role as "user" | "assistant", content: text(item.content) };
    });
  }
  if ([message, ...history.map((entry) => entry.content)].some(containsSensitiveAssistantText)) {
    throw new AssistantHttpError("اطلاعات هویتی، تماس یا پرداخت را در گفتگو نفرستید؛ فقط ترجیحات سفر را بنویسید.", 422, "PERSONAL_DATA_NOT_ALLOWED");
  }
  return { message, intent, confirmedFields, history: history.slice(-6).map((entry) => ({ ...entry, content: entry.content.slice(0, 1_000) })) };
}

/** Runtime subset validator mirrors only our fixed strict transport schema, never a model-supplied schema. */
function validateSchema(value: unknown, schemaValue: unknown): void {
  const schema = record(schemaValue);
  if (Array.isArray(schema.anyOf)) {
    if (!schema.anyOf.some((branch) => { try { validateSchema(value, branch); return true; } catch { return false; } })) throw new TypeError("Schema alternative mismatch");
    return;
  }
  if (Object.hasOwn(schema, "const") && value !== schema.const) throw new TypeError("Schema constant mismatch");
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) throw new TypeError("Schema enum mismatch");
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = value === null ? "null" : Array.isArray(value) ? "array" : Number.isSafeInteger(value) ? "integer" : typeof value;
    if (!types.includes(actual)) throw new TypeError("Schema type mismatch");
  }
  if (typeof value === "string" && value.length > 120) throw new TypeError("Model string too long");
  if (Array.isArray(value)) {
    if (value.length > 20) throw new TypeError("Model array too long");
    for (const item of value) validateSchema(item, schema.items);
  }
  if (schema.type === "object") {
    const row = record(value); const properties = record(schema.properties);
    if (Object.keys(row).some((key) => !Object.hasOwn(properties, key)) || (schema.required as string[]).some((key) => !Object.hasOwn(row, key))) throw new TypeError("Unknown or missing model field");
    for (const [key, child] of Object.entries(row)) validateSchema(child, properties[key]);
  }
}

function amountRials(value: unknown, unit: unknown): number {
  if (typeof value !== "string" || value.length > 64) throw new TypeError("Invalid budget amount");
  if (unit === "toman") {
    const amount = parseTomanInput(value);
    if (amount === undefined) throw new TypeError("Empty budget");
    return amount;
  }
  const normalized = toLatinDigits(value).trim();
  if (unit !== "rial" || !/^(?:\d+|\d{1,3}(?:[٬,\s]\d{3})+)$/u.test(normalized)) throw new TypeError("Invalid rial amount");
  const amount = BigInt(normalized.replace(/[٬,\s]/gu, ""));
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("Unsafe rial budget");
  return Number(amount);
}

function assign(patch: IntentPatch, field: string, value: unknown) {
  const [name, child] = field.split(".");
  const target = patch as unknown as Record<string, unknown>;
  if (child) {
    target[name] ??= {};
    (target[name] as Record<string, unknown>)[child] = value;
  } else target[name] = value;
}

function ambiguousDateQuestion(message: string): string | null {
  const normalized = toLatinDigits(message).normalize("NFKC").replace(/[\u200c\u200d\u064b-\u065f]/gu, " ");
  const explicitCalendar = /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/u.test(normalized)
    || /\d{1,2}\s*(?:فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)/u.test(normalized);
  const anchored = explicitCalendar || /(?:این|همین|آینده|بعدی|بعد)\s*هفته|هفته\s*(?:آینده|بعدی|بعد)|فردا|امروز|پس\s*فردا/iu.test(normalized);
  if (/آخر\s*هفته|weekend/iu.test(normalized) && !explicitCalendar) return anchored ? "برای آخر هفته، پنجشنبه را می‌خواهی یا جمعه؟" : "برای آخر هفته، پنجشنبه را می‌خواهی یا جمعه؛ این هفته یا هفته آینده؟";
  if (/(?:شنبه|یکشنبه|یک\s*شنبه|دوشنبه|دو\s*شنبه|سه\s*شنبه|چهار\s*شنبه|پنج\s*شنبه|جمعه|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/iu.test(normalized) && !anchored) return "منظورت این هفته است یا هفته آینده؟";
  return null;
}

function userBudgetUnit(message: string): "toman" | "rial" | null {
  const toman = /تومان|تومن|\btomans?\b|\btmn\b/iu.test(message);
  const rial = /ریال|ريال|\brials?\b|\birr\b/iu.test(message);
  const foreign = /دلار|یورو|پوند|درهم|\b(?:usd|eur|gbp|aed|dollars?|euros?)\b|[$€£]/iu.test(message);
  if (foreign || (toman && rial)) return null;
  // Product-wide user input convention, independent of provider-price normalization.
  return rial ? "rial" : "toman";
}

export function normalizeModelInterpretation(value: unknown, input: AssistantInterpretRequest, context: AssistantDateContext, model: string): AssistantInterpretation {
  validateSchema(value, TRAVEL_PATCH_SCHEMA);
  const row = record(value); const patch: IntentPatch = {};
  let question: string | null = null;
  const ask = (value: string | null) => { question ??= value; };
  const ambiguousDate = ambiguousDateQuestion(input.message);
  ask(ambiguousDate);
  for (const field of ["origin", "destination"] as const) if (row[field] !== null) {
    const normalized = normalizeAssistantAirport(row[field] as string);
    if (normalized.airportCode) patch[field] = normalized.airportCode;
    else ask(normalized.question);
  }
  for (const field of ["departureDate", "returnDate"] as const) if (row[field] !== null) {
    // A model cannot turn an unanchored weekday/weekend into an authoritative ISO date.
    if (ambiguousDate) continue;
    const normalized = normalizeAssistantDateMention(row[field], context);
    if (normalized.date) patch[field] = normalized.date;
    else ask(normalized.question);
  }
  if (row.tripType !== null) patch.tripType = row.tripType as TravelIntent["tripType"];
  for (const group of ["passengers", "hard", "soft"] as const) {
    for (const [field, value] of Object.entries(record(row[group]))) if (value !== null) assign(patch, `${group}.${field}`, value);
  }
  if (row.budget !== null) {
    const budget = record(row.budget);
    const unit = userBudgetUnit(input.message);
    const partySize = (patch.passengers?.adults ?? input.intent.passengers.adults) + (patch.passengers?.children ?? input.intent.passengers.children) + (patch.passengers?.infants ?? input.intent.passengers.infants);
    const explicitTotal = /مجموع|جمع\s*کل|کل\s*(?:سفر|مسافران|افراد)|برای\s*همه|total|whole\s*party/iu.test(input.message);
    const explicitPerPerson = /نفری|هر\s*نفر|per\s*person/iu.test(input.message);
    if (unit === null) ask("بودجه را به تومان یا ریال مشخص می‌کنی؟ تبدیل ارز در این نسخه انجام نمی‌شود.");
    else if (partySize > 1 && (!explicitTotal || explicitPerPerson)) ask("سقف بودجه برای مجموع مسافران چقدر است؟ بودجه هر نفر را به‌جای مجموع اعمال نمی‌کنم.");
    else if (budget.unit !== "unspecified" && budget.unit !== unit) throw new TypeError("Model budget unit conflicts with user input convention");
    else assign(patch, "hard.maxTotalPriceRials", amountRials(budget.amount, unit));
  }
  if (row.ambiguity === "budget-unit") ask("بودجه را به تومان می‌گویی یا ریال؟ سقف بودجه برای مجموع مسافران است؟");
  if (row.ambiguity === "unknown-preference") ask("این ترجیح را دقیق‌تر می‌گویی تا شرط اشتباهی اعمال نشود؟");
  if (row.ambiguity === "passenger-category") ask("تعداد بزرگسال، کودک و نوزاد را جداگانه مشخص می‌کنی؟ نسخه فعلی فقط بزرگسال را پشتیبانی می‌کند.");
  const defaults = emptyTravelIntent();
  for (const field of row.clearFields as typeof MODEL_CLEAR_FIELDS[number][]) {
    const [group, child] = field.split(".");
    const proposed = patch as unknown as Record<string, unknown>;
    if ((!child && Object.hasOwn(proposed, group)) || (child && proposed[group] && Object.hasOwn(proposed[group] as object, child))) throw new TypeError("Conflicting patch and reset");
    const baseline = defaults as unknown as Record<string, unknown>;
    assign(patch, field, child ? (baseline[group] as Record<string, unknown>)[child] : baseline[group]);
  }
  const validated = parseIntentPatch(patch);
  // mode/source state is deliberately absent from both the transport schema and patch allowlist.
  if (Object.hasOwn(validated, "mode")) throw new TypeError("A model cannot change the source mode");
  const merged = mergeIntentPatch(input.intent, validated, input.confirmedFields, "model");
  if (merged.conflicts.length) ask("این تغییر با انتخاب تأییدشده‌ات فرق دارد؛ تغییر پیشنهادی را تأیید می‌کنی؟");
  ask(missingIntentQuestion(merged.intent, context));
  return { state: "interpreted", intent: merged.intent, patch: validated, conflicts: merged.conflicts, question,
    message: "ترجیحاتت بررسی شد؛ پیشنهادها فقط از داده‌های موجود و رتبه‌بندی قابل توضیح ساخته می‌شوند.", needsClarification: question !== null, model };
}
