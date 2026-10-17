import "server-only";
import { Temporal } from "@js-temporal/polyfill";
import type { AssistantDateContext, TravelIntent } from "@/domain/assistant-intent";
import { DEMO_DATE_BOUNDS } from "@/domain/demo-date";
import { liveDateBounds } from "./search";

/** The request clock resolves language only; it never changes the fixed synthetic operations history. */
export function assistantDateContext(mode: TravelIntent["mode"] = "demo"): AssistantDateContext {
  return { now: Temporal.Now.instant().toString(), timeZone: "Asia/Tehran", dateBounds: mode === "live" ? liveDateBounds() : mode === "fixture" ? { min: "2026-10-15", max: "2026-10-15" } : { ...DEMO_DATE_BOUNDS } };
}
