import { afterEach, describe, expect, it, vi } from "vitest";
import { createAlibabaFixtureAdapter } from "@/server/providers/alibaba-fixture";
import type { UnpricedFlightOffer } from "@/domain/provider";
import type { FlightSearchInput } from "@/domain/models";
import { ALIBABA_REFERENCE_FIXTURES, ALIBABA_REFERENCE_MANIFEST } from "@/fixtures/alibaba/manifest";

const QUERY: FlightSearchInput = { origin: "THR", destination: "MHD", departureDate: "2026-10-15", adults: 1, currency: "IRR" };
const context = () => ({ signal: new AbortController().signal });
async function search(changes: Partial<FlightSearchInput> = {}): Promise<UnpricedFlightOffer[]> {
  return await createAlibabaFixtureAdapter().search({ ...QUERY, ...changes }, context()) as UnpricedFlightOffer[];
}

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("explicit Alibaba saved-reference adapter", () => {
  it("reads only offline sanitized records and exposes fixture provenance", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Offline only."));
    const adapter = createAlibabaFixtureAdapter();
    const offers = await search();
    expect(offers).toHaveLength(50);
    expect(adapter.mode).toBe("FIXTURE");
    expect(adapter.readiness.status).toBe("fixture");
    expect(adapter.fixture).toEqual({ source: { mode: "demo", id: ALIBABA_REFERENCE_MANIFEST.id, label: ALIBABA_REFERENCE_MANIFEST.label }, asOf: ALIBABA_REFERENCE_MANIFEST.importedAt });
    expect(offers.every((offer) => offer.sourceState === "FIXTURE" && offer.source.mode === "demo")).toBe(true);
    expect(offers.every((offer) => offer.fetchedAt === ALIBABA_REFERENCE_MANIFEST.importedAt && offer.capturedAt === null)).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never converts or multiplies an unresolved per-adult price into a party total", async () => {
    const one = (await search())[0], three = (await search({ adults: 3 }))[0];
    expect(one.priceEvidence).toEqual({ rawAmount: 75_281_000, field: "priceAdult", unit: "unverified" });
    expect(three.priceEvidence).toEqual(one.priceEvidence);
    expect(three.adults).toBe(3);
    expect(one.totalPrice).toBeNull();
    expect(three.totalPrice).toBeNull();
    expect(one.priceComplete).toBe(false);
    expect(three.priceComplete).toBe(false);
  });

  it.each([
    { destination: "DXB" }, { origin: "IKA" }, { origin: "MHD", destination: "THR" },
    { departureDate: "2026-10-16" }, { departureDate: "2026-10-14" },
  ])("does not use another route or date as a fallback %#", async (changes) => {
    expect(await search(changes)).toEqual([]);
  });

  it("retains source identity and leading zeros while excluding unsupported flight-number punctuation", async () => {
    const mhd = await search();
    expect(mhd.every((offer) => offer.cabin === "economy" && offer.stops === 0)).toBe(true);
    expect(mhd.some((offer) => offer.segments[0].flightNumber === "1838.")).toBe(false);
    const syz = await search({ destination: "SYZ" });
    expect(syz).toHaveLength(13);
    expect(syz[0].segments[0]).toMatchObject({ airlineId: "IV", airlineName: "کاسپین", flightNumber: "0048", origin: "THR", destination: "SYZ" });
    expect(syz[1].segments[0].flightNumber).toBe("048");
  });

  it("assigns explicit airport time zones without host-zone date shifts", async () => {
    const values = [];
    for (const zone of ["UTC", "Asia/Tehran", "America/Los_Angeles"]) {
      vi.stubEnv("TZ", zone);
      values.push((await search())[0].segments[0]);
    }
    expect(values[1]).toEqual(values[0]);
    expect(values[2]).toEqual(values[0]);
    expect(values[0]).toMatchObject({ departureAt: "2026-10-15T11:30:00Z", arrivalAt: "2026-10-15T12:45:00Z", originTimeZone: "Asia/Tehran", destinationTimeZone: "Asia/Tehran" });
  });

  it("keeps unknown baggage units and ticketing separate from usable kilogram allowances", async () => {
    const offer = (await search())[0];
    expect(offer.baggageRaw).toBe(20);
    expect(offer.baggage).toEqual([{ segmentId: offer.segments[0].id, checkedKg: null, carryOnKg: null }]);
    expect(offer.ticketing).toBe("unknown");
    expect(offer.refundability).toBe("refundable");
    expect(offer.fareConditions).toEqual({ changes: null, refunds: null });
    expect(offer.bookingUrl).toBeNull();
    expect(offer).not.toHaveProperty("history");
    expect(offer).not.toHaveProperty("cancellationRate");
  });

  it("retains unavailable records and checks party capacity without inventing seats", async () => {
    const one = await search(), nine = await search({ adults: 9 });
    expect(one[0].availability).toBe("available");
    expect(nine[0].availability).toBe("unavailable");
    expect(one.some((offer) => offer.availability === "unavailable")).toBe(true);
    expect(nine.every((offer) => offer.priceComplete === false && offer.totalPrice === null)).toBe(true);
  });

  it("provides stable opaque-free identities and independent returned objects", async () => {
    const first = await search(), next = await search();
    expect(first.map((offer) => offer.providerOfferId)).toEqual(next.map((offer) => offer.providerOfferId));
    expect(new Set(first.map((offer) => offer.providerOfferId)).size).toBe(first.length);
    expect(first[0].providerOfferId).toMatch(/^alibaba-reference-sanitized-v1:[a-f0-9]{64}$/);
    first[0].priceEvidence.rawAmount = 1;
    first[0].segments[0].flightNumber = "mutated";
    expect(next[0].priceEvidence.rawAmount).toBe(75_281_000);
    expect(next[0].segments[0].flightNumber).toBe("4044");
  });

  it("deduplicates identical public records despite different source array indexes", async () => {
    const rows = (ALIBABA_REFERENCE_FIXTURES[0].payload as { result: { departing: Record<string, unknown>[] } }).result.departing;
    const before = await search();
    rows.push({ ...rows[0] });
    try {
      const after = await search();
      expect(after.map((offer) => offer.providerOfferId)).toEqual(before.map((offer) => offer.providerOfferId));
    } finally { rows.pop(); }
  });

  it.each([0, -1, 10, 1.5, Number.NaN])("rejects unsupported passenger count %s", async (adults) => {
    await expect(search({ adults })).rejects.toThrow("Unsupported fixture passenger count");
  });

  it("honors abort without starting a provider request", async () => {
    const controller = new AbortController();
    const reason = new Error("Fixture read cancelled.");
    controller.abort(reason);
    await expect(createAlibabaFixtureAdapter().search(QUERY, { signal: controller.signal })).rejects.toBe(reason);
  });
});
