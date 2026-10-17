import { normalizeAssistantDateMention, parseIntentFields, parseTravelIntent, type AssistantDateContext, type IntentField, type TravelIntent } from "@/domain/assistant-intent";
import { isSearchDateWithinBounds } from "@/domain/journey-search";

const KEY = "torob-belit.assistant-preferences.v1";
export interface AssistantSession { intent: TravelIntent; confirmedFields: IntentField[] }

/** Only travel preferences survive a refresh; conversation text and passenger documents never enter this store. */
export function parseAssistantSession(raw: string | null, mode: TravelIntent["mode"], context?: AssistantDateContext): AssistantSession | null {
  if (raw === null) return null;
  if (raw.length > 16_384) throw new TypeError("ترجیحات ذخیره‌شده بیش از حد بزرگ است.");
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value) || !("intent" in value) || !("confirmedFields" in value) || Object.keys(value).some((key) => !["intent", "confirmedFields"].includes(key))) throw new TypeError("ترجیحات ذخیره‌شده معتبر نیست.");
  const intent = parseTravelIntent(value.intent);
  let confirmedFields = parseIntentFields(value.confirmedFields);
  // Explicit source navigation wins over a saved preference from another data mode.
  if (intent.mode !== mode) return null;
  if (context) {
    const expired = new Set<IntentField>();
    for (const field of ["departureDate", "returnDate"] as const) {
      const date = intent[field];
      // Imported fixtures intentionally retain their fixed historical date.
      if (date && (!isSearchDateWithinBounds(date, context.dateBounds)
        || (mode !== "fixture" && !normalizeAssistantDateMention({ kind: "iso", date }, context).date))) {
        intent[field] = null; expired.add(field);
      }
    }
    if (intent.returnDate && intent.departureDate && intent.returnDate < intent.departureDate) {
      intent.returnDate = null; expired.add("returnDate");
    }
    confirmedFields = confirmedFields.filter((field) => !expired.has(field));
  }
  return { intent, confirmedFields };
}

export function readAssistantSession(mode: TravelIntent["mode"], storage: Storage = window.sessionStorage): AssistantSession | null {
  return parseAssistantSession(storage.getItem(KEY), mode);
}

/** Stable primitive snapshots let React hydrate without rendering stale saved/default fields. */
export function assistantSessionSnapshot(): string | null | undefined {
  if (typeof window === "undefined") return undefined;
  try { return window.sessionStorage.getItem(KEY); }
  catch { return "!unreadable-session"; }
}
export function assistantSessionServerSnapshot(): undefined { return undefined; }
export function subscribeAssistantSession(onChange: () => void) {
  const storageChanged = (event: StorageEvent) => { if (event.key === KEY || event.key === null) onChange(); };
  window.addEventListener("storage", storageChanged);
  window.addEventListener("pageshow", onChange);
  return () => { window.removeEventListener("storage", storageChanged); window.removeEventListener("pageshow", onChange); };
}

export function saveAssistantSession(value: AssistantSession, storage: Storage = window.sessionStorage) {
  storage.setItem(KEY, JSON.stringify({ intent: parseTravelIntent(value.intent), confirmedFields: parseIntentFields(value.confirmedFields) }));
}

export function clearAssistantSession(storage: Storage = window.sessionStorage) { storage.removeItem(KEY); }
