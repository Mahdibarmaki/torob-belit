import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSearchRequest, executeSearch } from "@/server/search";
import { POST } from "@/app/api/search/route";
import { providerAggregator, fixtureProviderAggregator } from "@/server/providers/registry";
import { validateSearchRequest } from "@/server/validation";
import { DEMO_DATE_BOUNDS, isSupportedDemoDate } from "@/domain/demo-date";

afterEach(() => vi.restoreAllMocks());

describe("self-contained default demo composition", () => {
  it("opens a populated domestic demo without touching either provider registry", async () => {
    const live = vi.spyOn(providerAggregator, "aggregate");
    const reference = vi.spyOn(fixtureProviderAggregator, "aggregate");
    const request = defaultSearchRequest();
    expect(request).toMatchObject({ mode: "demo", query: { origin: "THR", destination: "MHD" } });
    expect(isSupportedDemoDate(request.query.departureDate)).toBe(true);
    const response = await executeSearch({ ...request, mode: undefined });
    expect(response).toMatchObject({ mode: "demo", sourceState: "FIXTURE", freshness: "demo", dateBounds: DEMO_DATE_BOUNDS });
    expect(response.flights.length).toBeGreaterThanOrEqual(12);
    expect(response.providers).toBeUndefined();
    expect(live).not.toHaveBeenCalled(); expect(reference).not.toHaveBeenCalled();
  });
  it("uses the same default for HTTP requests with an omitted mode", async () => {
    const request = defaultSearchRequest();
    const response = await POST(new Request("http://localhost/api/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: { ...request.query, departureDate: "2028-03-20" }, filters: {}, sort: "price" }) }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ mode: "demo", source: { mode: "demo" }, sourceState: "FIXTURE" });
    expect(body.data.flights.length).toBeGreaterThanOrEqual(12);
  });
  it.each(["2026-10-15", "2026-11-01", "2028-02-29", "2036-12-31"])("supports deterministic future dates beyond the original seven days: %s", (departureDate) => {
    expect(isSupportedDemoDate(departureDate)).toBe(true);
    expect(validateSearchRequest({ ...defaultSearchRequest(), query: { ...defaultSearchRequest().query, departureDate } }).query.departureDate).toBe(departureDate);
  });
  it.each(["2026-10-14", "2037-01-01", "2027-02-29", "2028-2-29", "garbage"])("does not normalize unsupported or invalid dates into another day: %s", (date) => {
    expect(isSupportedDemoDate(date)).toBe(false);
  });
});
