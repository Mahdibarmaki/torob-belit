import { describe, expect, it } from "vitest";
import { emptyTravelIntent, type AssistantDateContext } from "@/domain/assistant-intent";
import { clearAssistantSession, parseAssistantSession, readAssistantSession, saveAssistantSession, type AssistantSession } from "@/lib/assistant-session";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const key = "torob-belit.assistant-preferences.v1";
function preferences(): AssistantSession {
  return { intent: { ...emptyTravelIntent(), origin: "THR", destination: "MHD", departureDate: "2026-10-20" }, confirmedFields: ["origin", "destination", "departureDate", "hard.maxTotalPriceRials"] };
}

describe("bounded preference-only assistant session storage", () => {
  const context: AssistantDateContext = { now: "2026-10-17T09:00:00Z", timeZone: "Asia/Tehran", dateBounds: { min: "2026-10-15", max: "2036-12-31" } };
  it("reads the latest saved values rather than a previously decoded component snapshot", () => {
    const storage = new MemoryStorage(); const first = preferences();
    saveAssistantSession(first, storage);
    expect(readAssistantSession("demo", storage)?.intent.destination).toBe("MHD");
    const latest = preferences(); latest.intent.destination = "SYZ"; latest.intent.departureDate = "2026-10-24";
    latest.intent.passengers.adults = 2; latest.intent.hard.maxTotalPriceRials = 60_000_001;
    latest.intent.soft.priorities = ["history", "baggage"];
    saveAssistantSession(latest, storage);
    expect(readAssistantSession("demo", storage)).toEqual(latest);
  });
  it("restores every valid supplied value and manual lock with a fresh source clock", () => {
    const session = preferences(); session.intent.tripType = "round-trip"; session.intent.returnDate = "2026-10-24";
    session.intent.passengers.adults = 2; session.intent.hard.maxTotalPriceRials = 60_000_001;
    session.intent.hard.minimumCheckedKg = 23; session.intent.soft.departurePeriod = "morning"; session.intent.soft.priorities = ["history"];
    expect(parseAssistantSession(JSON.stringify(session), "demo", context)).toEqual(session);
  });
  it("clears expired dates without inventing replacements or discarding valid preferences", () => {
    const session = preferences(); session.intent.departureDate = "2026-10-16";
    session.intent.hard.maxTotalPriceRials = 30_000_001; session.intent.soft.priorities = ["history"];
    const result = parseAssistantSession(JSON.stringify(session), "demo", context)!;
    expect(result.intent).toEqual({ ...session.intent, departureDate: null });
    expect(result.confirmedFields).toEqual(session.confirmedFields.filter((field) => field !== "departureDate"));
  });
  it("uses the Tehran date boundary rather than the UTC day or execution host timezone", () => {
    const session = preferences(); session.intent.departureDate = "2026-10-17";
    const nextTehranDay = { ...context, now: "2026-10-17T21:00:00Z" };
    expect(parseAssistantSession(JSON.stringify(session), "demo", context)?.intent.departureDate).toBe("2026-10-17");
    expect(parseAssistantSession(JSON.stringify(session), "demo", nextTehranDay)?.intent.departureDate).toBeNull();
  });
  it("clears only an invalid return chronology and preserves the valid outbound", () => {
    const session = preferences(); session.intent.tripType = "round-trip"; session.intent.returnDate = "2026-10-19";
    session.confirmedFields.push("returnDate");
    const result = parseAssistantSession(JSON.stringify(session), "demo", context)!;
    expect(result.intent.departureDate).toBe("2026-10-20"); expect(result.intent.returnDate).toBeNull();
    expect(result.confirmedFields).not.toContain("returnDate"); expect(result.confirmedFields).toContain("departureDate");
  });
  it("keeps the imported fixture's intentional historical date but removes out-of-source dates", () => {
    const session = preferences(); session.intent.mode = "fixture"; session.intent.departureDate = "2026-10-15";
    const fixtureContext = { ...context, dateBounds: { min: "2026-10-15", max: "2026-10-15" } };
    expect(parseAssistantSession(JSON.stringify(session), "fixture", fixtureContext)).toEqual(session);
    session.intent.departureDate = "2026-10-20";
    expect(parseAssistantSession(JSON.stringify(session), "fixture", fixtureContext)?.intent.departureDate).toBeNull();
  });
  it("restores only validated preferences and confirmed paths, never creating a search from an empty store", () => {
    const storage = new MemoryStorage();
    expect(readAssistantSession("demo", storage)).toBeNull();
    const session = preferences(); session.intent.hard.maxTotalPriceRials = 30_000_001;
    saveAssistantSession(session, storage);
    expect(readAssistantSession("demo", storage)).toEqual(session);
    expect(storage.length).toBe(1);
  });
  it("does not persist chat, model output, passenger identities, contact details, or unrelated wrapper keys", () => {
    const storage = new MemoryStorage();
    const input = { ...preferences(), messages: [{ text: "private conversation" }], identityNumber: "0123456789", phone: "09123456789", apiKey: "secret-token" };
    saveAssistantSession(input, storage);
    const saved = storage.getItem(key)!;
    expect(Object.keys(JSON.parse(saved))).toEqual(["intent", "confirmedFields"]);
    for (const secret of ["private conversation", "0123456789", "09123456789", "secret-token", "messages", "identityNumber", "apiKey"]) expect(saved).not.toContain(secret);
    expect(JSON.parse(saved).intent.passengers).toEqual({ adults: 1, children: 0, infants: 0 });
  });
  it("requires explicit source selection and ignores a valid preference saved for another mode", () => {
    const storage = new MemoryStorage(); saveAssistantSession(preferences(), storage);
    expect(readAssistantSession("live", storage)).toBeNull();
    expect(readAssistantSession("fixture", storage)).toBeNull();
    expect(readAssistantSession("demo", storage)?.intent.mode).toBe("demo");
    expect(storage.getItem(key)).not.toBeNull();
  });
  it.each(["{bad-json", "null", "[]", "{}", JSON.stringify({ ...preferences(), messages: [] }), JSON.stringify({ ...preferences(), confirmedFields: ["passengers.identityNumber"] })])("rejects corrupt or expanded saved state %s", (raw) => {
    const storage = new MemoryStorage(); storage.setItem(key, raw);
    expect(() => readAssistantSession("demo", storage)).toThrow();
  });
  it("rejects oversized stored text before JSON decoding, and incomplete or unknown intent fields", () => {
    const storage = new MemoryStorage(); storage.setItem(key, " ".repeat(16_385));
    expect(() => readAssistantSession("demo", storage)).toThrow(/بیش از حد/);
    storage.setItem(key, JSON.stringify({ ...preferences(), intent: { ...preferences().intent, passengers: { adults: 1, children: 0, infants: 0, identityNumber: "0123456789" } } }));
    expect(() => readAssistantSession("demo", storage)).toThrow();
    storage.setItem(key, JSON.stringify({ ...preferences(), intent: { origin: "THR" } }));
    expect(() => readAssistantSession("demo", storage)).toThrow();
  });
  it("rejects invalid preferences and confirmed paths before writing a replacement", () => {
    const storage = new MemoryStorage(); saveAssistantSession(preferences(), storage);
    const previous = storage.getItem(key);
    expect(() => saveAssistantSession({ ...preferences(), intent: { ...preferences().intent, origin: "ZZZ" } }, storage)).toThrow();
    const untrusted: unknown = { ...preferences(), confirmedFields: ["endpoint"] };
    expect(() => saveAssistantSession(untrusted as AssistantSession, storage)).toThrow();
    expect(storage.getItem(key)).toBe(previous);
  });
  it("propagates blocked reads, quota failures and failed removals instead of claiming persistence", () => {
    const blocked = new MemoryStorage();
    blocked.getItem = () => { throw new DOMException("Blocked", "SecurityError"); };
    expect(() => readAssistantSession("demo", blocked)).toThrow("Blocked");
    blocked.setItem = () => { throw new DOMException("Quota exceeded", "QuotaExceededError"); };
    expect(() => saveAssistantSession(preferences(), blocked)).toThrow("Quota exceeded");
    expect(blocked.length).toBe(0);
    blocked.removeItem = () => { throw new DOMException("Blocked", "SecurityError"); };
    expect(() => clearAssistantSession(blocked)).toThrow("Blocked");
  });
  it("clears only the assistant preference key, preserving checkout and unrelated session state", () => {
    const storage = new MemoryStorage(); saveAssistantSession(preferences(), storage);
    storage.setItem("torob-belit.checkout.v1.example", "untouched");
    clearAssistantSession(storage);
    expect(readAssistantSession("demo", storage)).toBeNull();
    expect(storage.getItem("torob-belit.checkout.v1.example")).toBe("untouched");
  });
});
