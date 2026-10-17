import { parseLocalDate } from "./time";

/** Fixed simulation horizon; generated schedules never depend on the browser clock. */
export const DEMO_DATE_BOUNDS = { min: "2026-10-15", max: "2036-12-31" } as const;

export function isSupportedDemoDate(value: string): boolean {
  try { parseLocalDate(value); } catch { return false; }
  return value >= DEMO_DATE_BOUNDS.min && value <= DEMO_DATE_BOUNDS.max;
}
