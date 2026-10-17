import { describe, expect, it } from "vitest";
import { emptyTravelIntent, mergeIntentPatch, missingIntentQuestion, normalizeAssistantAirport, normalizeAssistantDateMention, parseIntentFields, parseIntentPatch, parseTravelIntent, validateAssistantIntent, type AssistantDateContext } from "../src/domain/assistant-intent";

const context: AssistantDateContext = { now: "2026-10-16T05:00:00Z", timeZone: "Asia/Tehran", dateBounds: { min: "2026-10-15", max: "2036-12-31" } };
const valid = () => ({ ...emptyTravelIntent(), origin: "THR", destination: "MHD", departureDate: "2026-10-20" });

describe("validated assistant travel intent", () => {
  it("starts incomplete and asks one essential question without manufacturing an itinerary", () => {
    const intent = emptyTravelIntent();
    expect(intent.origin).toBeNull(); expect(intent.departureDate).toBeNull();
    expect(intent.passengers).toEqual({ adults: 1, children: 0, infants: 0 });
    expect(validateAssistantIntent(intent, context)).toMatchObject({ ready: false, query: null });
    expect(missingIntentQuestion(intent, context)).toContain("از کدوم");
    expect(missingIntentQuestion({ ...intent, origin: "THR" }, context)).toContain("مقصد");
    expect(missingIntentQuestion({ ...intent, origin: "THR", destination: "MHD" }, context)).toContain("تاریخی");
  });
  it("strictly parses canonical values and normalizes reviewed airport and airline codes", () => {
    const intent = valid();
    expect(parseTravelIntent(intent)).toEqual(intent);
    expect(parseIntentPatch({ origin: " thr ", hard: { airlineIds: ["ir", "IRA"] } })).toEqual({ origin: "THR", hard: { airlineIds: ["IRA"] } });
    expect(parseIntentPatch({ hard: { maxTotalPriceRials: 30_000_001 } }).hard?.maxTotalPriceRials).toBe(30_000_001);
  });
  it.each([
    { endpoint: "https://bad.example" }, { departureDate: "1405/07/24" }, { origin: "ZZZ" },
    { hard: { maxTotalPriceRials: -1 } }, { hard: { maxTotalPriceRials: 1.1 } }, { hard: { maxTotalPriceRials: Number.MAX_SAFE_INTEGER + 1 } },
    { hard: { minimumCheckedKg: -1 } }, { hard: { refundableOnly: "yes" } }, { hard: { airlineIds: ["MADEUP"] } },
    { soft: { priorities: ["safety"] } }, { soft: { departurePeriod: "midnight" } }, { passengers: { adults: 0 } }, { passengers: { children: 10 } },
    { mode: "auto" }, { hard: { maxPriceToman: 3_000_000 } },
    { hard: { riskCategories: ["unknown"] } }, { hard: { departurePeriod: "tomorrow" } },
  ])("rejects unsafe, unknown, or invalid patch %j", (patch) => { expect(() => parseIntentPatch(patch)).toThrow(); });
  it("requires the complete versioned state instead of silently defaulting lost fields", () => {
    expect(() => parseTravelIntent({ ...valid(), schemaVersion: 2 })).toThrow();
    expect(() => parseTravelIntent({ ...valid(), soft: {} })).toThrow();
    expect(() => parseTravelIntent({ origin: "THR" })).toThrow();
  });
  it("merges nested refinements without replacing unrelated values or mutating prior state", () => {
    const previous = { ...valid(), hard: { ...valid().hard, maxTotalPriceRials: 40_000_000 }, soft: { ...valid().soft, departurePeriod: "morning" as const } };
    const result = mergeIntentPatch(previous, { hard: { refundableOnly: true }, soft: { priorities: ["price"] } });
    expect(result.intent).toMatchObject({ origin: "THR", destination: "MHD", hard: { maxTotalPriceRials: 40_000_000, refundableOnly: true }, soft: { departurePeriod: "morning", priorities: ["price"] } });
    expect(previous.hard.refundableOnly).toBe(false); expect(result.conflicts).toEqual([]);
  });
  it("protects manually confirmed selections while returning explicit model proposals for review", () => {
    const previous = valid();
    const result = mergeIntentPatch(previous, { destination: "KIH", hard: { maxTotalPriceRials: 40_000_000 } }, ["destination"]);
    expect(result.intent.destination).toBe("MHD"); expect(result.intent.hard.maxTotalPriceRials).toBe(40_000_000);
    expect(result.conflicts).toEqual([{ field: "destination", current: "MHD", proposed: "KIH" }]);
    expect(mergeIntentPatch(previous, { destination: "KIH" }, ["destination"], "manual").intent.destination).toBe("KIH");
    expect(() => parseIntentFields(["hard.endpoint"])).toThrow();
    expect(parseIntentFields(["destination", "hard.maxTotalPriceRials", "destination"])).toEqual(["destination", "hard.maxTotalPriceRials"]);
  });
  it("keeps unsupported passenger categories explicit and never searches as adults", () => {
    expect(validateAssistantIntent({ ...valid(), passengers: { adults: 2, children: 1, infants: 0 } }, context)).toMatchObject({ ready: false, query: null });
    expect(missingIntentQuestion({ ...valid(), passengers: { adults: 2, children: 0, infants: 1 } }, context)).toContain("فقط مسافر بزرگسال");
  });
  it("validates date bounds, route equality and mandatory round-trip return independently", () => {
    expect(validateAssistantIntent(valid(), context).query?.query.departureDate).toBe("2026-10-20");
    expect(validateAssistantIntent({ ...valid(), origin: "MHD" }, context).ready).toBe(false);
    expect(validateAssistantIntent({ ...valid(), departureDate: "2026-10-15" }, context).ready).toBe(false);
    expect(missingIntentQuestion({ ...valid(), tripType: "round-trip" }, context)).toContain("برگشت");
    expect(validateAssistantIntent({ ...valid(), tripType: "round-trip", returnDate: "2026-10-19" }, context).ready).toBe(false);
    expect(validateAssistantIntent({ ...valid(), tripType: "round-trip", returnDate: "2026-10-20" }, context).ready).toBe(true);
  });
});

describe("grounded assistant airport and date normalization", () => {
  it("resolves bilingual airports and refuses the ambiguous Tehran city", () => {
    expect(normalizeAssistantAirport("mhd").airportCode).toBe("MHD");
    expect(normalizeAssistantAirport("مشهد").airportCode).toBe("MHD");
    expect(normalizeAssistantAirport("Mashhad").airportCode).toBe("MHD");
    expect(normalizeAssistantAirport("Tehran Mehrabad").airportCode).toBe("THR");
    expect(normalizeAssistantAirport("تهران مهرآباد").airportCode).toBe("THR");
    expect(normalizeAssistantAirport("تهران")).toMatchObject({ airportCode: null, candidates: ["THR", "IKA"] });
    expect(normalizeAssistantAirport("تهران").question).toBeTruthy();
    expect(normalizeAssistantAirport("Atlantis").airportCode).toBeNull();
  });
  it("uses the explicit Tehran server day for relative dates, without host timezone shifts", () => {
    expect(normalizeAssistantDateMention({ kind: "relative", days: 1 }, context).date).toBe("2026-10-17");
    expect(normalizeAssistantDateMention({ kind: "relative", days: 1 }, { ...context, now: "2026-10-16T23:00:00Z" }).date).toBe("2026-10-18");
  });
  it("resolves strict Jalali month boundaries and leap Esfand without implicit dates", () => {
    expect(normalizeAssistantDateMention({ kind: "jalali", year: 1405, month: 7, day: 24 }, context).date).toBe("2026-10-16");
    const earlier = { ...context, now: "2025-01-01T00:00:00Z", dateBounds: { min: "2025-01-01", max: "2026-12-31" } };
    expect(normalizeAssistantDateMention({ kind: "jalali", year: 1403, month: 12, day: 30 }, earlier).date).toBe("2025-03-20");
    expect(() => normalizeAssistantDateMention({ kind: "jalali", year: 1404, month: 12, day: 30 }, earlier)).toThrow();
  });
  it("asks for ambiguous weekdays and weekends, with Iranian Saturday-based explicit weeks", () => {
    expect(normalizeAssistantDateMention({ kind: "weekday", weekday: 5, week: null }, context)).toMatchObject({ date: null });
    expect(normalizeAssistantDateMention({ kind: "weekend" }, context).question).toContain("پنجشنبه");
    expect(normalizeAssistantDateMention({ kind: "weekday", weekday: 5, week: "this" }, context).date).toBe("2026-10-16");
    expect(normalizeAssistantDateMention({ kind: "weekday", weekday: 5, week: "next" }, context).date).toBe("2026-10-23");
    expect(normalizeAssistantDateMention({ kind: "weekday", weekday: 6, week: "this" }, context).date).toBeNull();
  });
  it("rejects impossible dates, unknown model fields, negative offsets, and out-of-range dates", () => {
    expect(() => normalizeAssistantDateMention({ kind: "iso", date: "2026-02-30" }, context)).toThrow();
    expect(() => normalizeAssistantDateMention({ kind: "relative", days: -1 }, context)).toThrow();
    expect(() => normalizeAssistantDateMention({ kind: "relative", days: 1, endpoint: "bad" }, context)).toThrow();
    expect(normalizeAssistantDateMention({ kind: "iso", date: "2037-01-01" }, context).date).toBeNull();
  });
});
