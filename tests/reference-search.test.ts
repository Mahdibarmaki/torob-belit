import { describe, expect, it } from "vitest";
import { executeSearch, defaultSearchRequest } from "@/server/search";
import { normalizeFlightOffer } from "@/application/normalize-offers";
import { createAlibabaFixtureAdapter } from "@/server/providers/alibaba-fixture";
import { searchUnpricedReferenceOffers } from "@/application/reference-search";
import { ALIBABA_REFERENCE_MANIFEST } from "@/fixtures/alibaba/manifest";
import { validateSearchRequest, ValidationError } from "@/server/validation";
import { POST } from "@/app/api/search/route";
import { formatOfferPrice } from "@/domain/offer-display";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { FlightCard } from "@/components/flight-card";

const request = defaultSearchRequest("fixture");
describe("reference fixtures through the existing API and UI boundary", () => {
  it("returns Alibaba-only offline records plus three disconnected statuses", async () => {
    const result = await executeSearch(request);
    expect(result).toMatchObject({ mode: "fixture", sourceState: "FIXTURE", freshness: "demo", lastSuccessfulAt: null });
    expect(result.flights).toEqual([]);
    expect(result.unpricedFlights!.length).toBeGreaterThan(0);
    expect(result.providers).toHaveLength(4);
    expect(result.providers![0]).toMatchObject({ id: "alibaba", sourceState: "FIXTURE", lastSuccessfulAt: null });
    expect(result.providers!.slice(1).every((status) => status.sourceState === "UNAVAILABLE" && status.offerCount === 0)).toBe(true);
    for (const item of result.unpricedFlights!) {
      expect(item.selectedOffer.totalPrice).toBeNull(); expect(item.selectedOffer.priceComplete).toBe(false);
      expect(item.selectedOffer.sourceState).toBe("FIXTURE"); expect(item.score).toBeNull();
      expect(item.flight.history![0]).toMatchObject({ cancellationRate: null, source: { mode: "unavailable" } });
    }
  });
  it("supports the second exact saved route without silently using Mashhad", async () => {
    const result = await executeSearch({ ...request, query: { ...request.query, destination: "SYZ" } });
    expect(result.unpricedFlights!.length).toBeGreaterThan(0);
    expect(result.unpricedFlights!.every((result) => result.flight.segments.at(-1)!.destination === "SYZ")).toBe(true);
    expect(() => validateSearchRequest({ ...request, query: { ...request.query, destination: "IST" } })).toThrow(ValidationError);
    await expect(executeSearch({ ...request, query: { ...request.query, departureDate: "2026-10-16" } })).rejects.toThrow();
  });
  it("never treats unknown raw price units or bag units as satisfying budgets/bag filters", async () => {
    expect((await executeSearch({ ...request, filters: { maxPriceRials: Number.MAX_SAFE_INTEGER } })).unpricedFlights).toEqual([]);
    expect((await executeSearch({ ...request, filters: { minPriceRials: 0 } })).unpricedFlights).toEqual([]);
    expect((await executeSearch({ ...request, filters: { checkedBagOnly: true } })).unpricedFlights).toEqual([]);
    expect((await executeSearch({ ...request, filters: { riskCategories: ["low"] } })).unpricedFlights).toEqual([]);
  });
  it("does not infer money from numeric magnitudes or count price as a rank factor", async () => {
    const a = createAlibabaFixtureAdapter();
    const [raw] = await a.search(request.query, { signal: new AbortController().signal });
    const offer = normalizeFlightOffer(raw, a.provider, request.query, ALIBABA_REFERENCE_MANIFEST.importedAt, a.fixture!.source);
    expect(offer.totalPrice).toBeNull(); expect(formatOfferPrice(null)).toBe("واحد مبلغ تأیید نشده");
    expect(() => normalizeFlightOffer(raw, a.provider, request.query, ALIBABA_REFERENCE_MANIFEST.importedAt)).toThrow();
    const invalid = { ...(raw as object), totalPrice: null, priceComplete: true };
    expect(() => normalizeFlightOffer(invalid, a.provider, request.query, ALIBABA_REFERENCE_MANIFEST.importedAt, a.fixture!.source)).toThrow();
    const changed = { ...(raw as object), priceEvidence: { rawAmount: -1, field: "priceAdult", unit: "unverified" } };
    expect(() => normalizeFlightOffer(changed, a.provider, request.query, ALIBABA_REFERENCE_MANIFEST.importedAt, a.fixture!.source)).toThrow();
  });
  it("renders the original FlightCard with honest units/provenance and no made-up quote link", async () => {
    const result = (await executeSearch(request)).unpricedFlights![0];
    const html = renderToStaticMarkup(createElement(FlightCard, { result, selectedForComparison: false, onCompare: () => {} }));
    expect(html).toContain("واحد مبلغ تأیید نشده"); expect(html).toContain("پاسخ مرجع آفلاین");
    expect(html).toContain("۲۳ مهر ۱۴۰۵"); expect(html).toContain("اطلاعات کافی موجود نیست");
    const displayedPrices = [...html.matchAll(/class="(?:price|offer-price)"[^>]*>([^<]*)</g)].map((match) => match[1]);
    expect(displayedPrices.length).toBeGreaterThan(0);
    expect(displayedPrices.every((price) => price === "واحد مبلغ تأیید نشده")).toBe(true);
    expect(html).not.toContain("قیمت ساختگی");
    expect(html).not.toContain("هزینه‌های الزامی شامل است"); expect(html).not.toContain("بلیت یکپارچه");
    expect(html).not.toContain("https://www.alibaba.ir"); expect(html).not.toContain("ALBBDOM");
  });
  it.each([NaN, Infinity, -1, "x".repeat(129), "bad\u0000bag"])("rejects invalid raw baggage at the normalized boundary: %s", async (baggageRaw) => {
    const adapter = createAlibabaFixtureAdapter();
    const [raw] = await adapter.search(request.query, { signal: new AbortController().signal });
    expect(() => normalizeFlightOffer({ ...(raw as object), baggageRaw }, adapter.provider, request.query, ALIBABA_REFERENCE_MANIFEST.importedAt, adapter.fixture!.source)).toThrow();
  });
  it("fixture HTTP requests are explicit and never replace an invalid route/date", async () => {
    const response = await POST(new Request("http://localhost/api/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) }));
    expect(response.status).toBe(200); expect((await response.json()).data.sourceState).toBe("FIXTURE");
    const bad = await POST(new Request("http://localhost/api/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...request, query: { ...request.query, origin: "IKA" } }) }));
    expect(bad.status).toBe(422); expect((await bad.json()).error.code).toBe("UNSUPPORTED_FIXTURE_QUERY");
  });
  it("keeps independent known money conversion exact for genuine tagged/demo prices", () => {
    expect(formatOfferPrice({ currency: "IRR", unit: "rial", amountRials: 10_000_001 })).toBe("۱٬۰۰۰٬۰۰۰٫۱ تومان");
  });
  it("has no unpriced output when only known categories are requested", () => {
    expect(searchUnpricedReferenceOffers([], { ...request, filters: { riskCategories: ["high"] } })).toEqual([]);
  });
  it("keeps the shared reference search scoped to the exact query and source", async () => {
    const adapter = createAlibabaFixtureAdapter();
    const rows = await adapter.search(request.query, { signal: new AbortController().signal });
    const offers = rows.map((row) => normalizeFlightOffer(row, adapter.provider, request.query, ALIBABA_REFERENCE_MANIFEST.importedAt, adapter.fixture!.source)).filter((offer) => offer.totalPrice === null);
    expect(searchUnpricedReferenceOffers(offers, { ...request, query: { ...request.query, destination: "SYZ" } })).toEqual([]);
    expect(searchUnpricedReferenceOffers(offers, { ...request, query: { ...request.query, departureDate: "2026-10-16" } })).toEqual([]);
  });
  it.each(["price", "history"] as const)("rejects unsupported fixture %s ranking instead of implying evidence", async (sort) => {
    expect(() => validateSearchRequest({ ...request, sort })).toThrow("مرتب‌سازی");
    await expect(executeSearch({ ...request, sort })).rejects.toMatchObject({ code: "UNSUPPORTED_FIXTURE_SORT" });
  });
});
