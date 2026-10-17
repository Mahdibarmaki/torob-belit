import { describe, expect, it } from "vitest";
import type { CancellationHistory, Flight, FlightSegment, HistoricalRiskCategory, Money, SellerOffer } from "../src/domain/models";
import { formatToman, parseTomanInput, toRialMoney } from "../src/domain/money";
import { gregorianToJalali, jalaliToGregorian } from "../src/domain/jalali";
import { previousCompletedDaysWindow } from "../src/domain/time";
import { searchFlights, type SearchRequest } from "../src/application/search-service";
import { validateSearchRequest, ValidationError } from "../src/server/validation";
import { POST } from "../src/app/api/search/route";
import { AIRPORTS, DEMO_METADATA } from "../src/fixtures/demo";

const source = { mode: "demo" as const, id: "search-test-fixtures", label: "Synthetic test data" };
const query = { origin: "IKA", destination: "IST", departureDate: "2026-10-16", adults: 1, currency: "IRR" as const };
const request: SearchRequest = { query, filters: {}, sort: "recommended", mode: "demo" };

function flight(id: string, departureAt = "2026-10-16T04:30:00Z"): Flight {
  const segment: FlightSegment = {
    id: `${id}-leg`, airlineId: "demo-airline-0", airlineName: "Synthetic airline", flightNumber: "100",
    origin: "IKA", destination: "IST", departureAt, arrivalAt: "2026-10-16T08:30:00Z",
  };
  const result: Flight = { id, segments: [segment], durationMinutes: 240, stops: 0, offers: [], source };
  result.offers = [offer(result, `${id}-offer`, 50_000_000, 23)];
  return result;
}

function offer(item: Flight, id: string, amountRials: number, checkedKg: number | null): SellerOffer {
  return {
    id, flightId: item.id, sellerId: id, sellerName: "Synthetic seller", fareName: "Economy demo", adults: 1,
    totalPrice: { currency: "IRR", unit: "rial", amountRials }, priceComplete: true,
    baggage: item.segments.map((segment) => ({ segmentId: segment.id, checkedKg, carryOnKg: 7 })),
    availability: "available", ticketing: "single-ticket", refundability: "non-refundable", source,
  };
}

function history(segment: FlightSegment, rate: number | null, category: HistoricalRiskCategory): CancellationHistory {
  const knownCount = rate === null ? 8 : 100;
  const cancelledCount = rate === null ? 0 : rate * knownCount;
  return {
    segmentId: segment.id, identity: segment, asOf: DEMO_METADATA.asOf, source,
    window: previousCompletedDaysWindow(DEMO_METADATA.asOf, AIRPORTS.find((airport) => airport.code === segment.origin)!.timeZone),
    expectedCount: knownCount, cancelledCount, operatedCount: knownCount - cancelledCount,
    knownCount, unknownCount: 0, missingCount: 0, conflictingCount: 0, coverage: 1,
    cancellationRate: rate, observedRate: rate ?? 0, category,
    reasons: rate === null ? ["insufficient-sample"] : [], warnings: [], policyVersion: "history-v2-10-25",
  };
}

function withHistory(item: Flight, rate: number | null, category: HistoricalRiskCategory): Flight {
  return { ...item, history: item.segments.map((segment) => history(segment, rate, category)) };
}

function connection(id: string): Flight {
  const first = flight(id);
  first.segments[0] = { ...first.segments[0], destination: "DXB" };
  first.segments.push({
    ...first.segments[0], id: `${id}-leg-2`, origin: "DXB", destination: "IST", flightNumber: "101",
    departureAt: "2026-10-16T10:30:00Z", arrivalAt: "2026-10-16T12:30:00Z",
  });
  first.durationMinutes = 480;
  first.stops = 1;
  first.offers = [offer(first, `${id}-offer`, 50_000_000, 23)];
  return first;
}

describe("same-offer eligibility", () => {
  it("applies both inclusive range bounds and baggage to the same numeric seller total", () => {
    const item = flight("range-offers");
    item.offers = [offer(item, "below", 19_999_999, 23), offer(item, "floor", 20_000_000, 0),
      offer(item, "matching", 25_000_001, 23), offer(item, "ceiling", 30_000_000, 23), offer(item, "above", 30_000_001, 23)];
    const response = searchFlights({ ...request, filters: { minPriceRials: 20_000_000, maxPriceRials: 30_000_000, checkedBagOnly: true }, sort: "price" }, [item]);
    expect(response.flights[0].eligibleOffers.map((entry) => entry.id)).toEqual(["matching", "ceiling"]);
    expect(response.flights[0].selectedOffer.totalPrice.amountRials).toBe(25_000_001);
    expect(searchFlights({ ...request, filters: { minPriceRials: 30_000_000, maxPriceRials: 30_000_000 } }, [item]).flights[0].eligibleOffers.map((entry) => entry.id)).toEqual(["ceiling"]);
    expect(searchFlights({ ...request, filters: { minPriceRials: 40_000_000 } }, [item]).flights).toEqual([]);
  });
  it("normalizes explicitly tagged provider amounts once and sorts their numeric complete totals", () => {
    const cheaper = flight("cheaper");
    const dearer = flight("dearer");
    cheaper.offers = [
      { ...offer(cheaper, "rial-seller", 9_500_000, 23), totalPrice: toRialMoney({ unit: "rial", amount: 9_500_000 }) },
      { ...offer(cheaper, "toman-seller", 10_000_000, 23), totalPrice: toRialMoney({ unit: "toman", amount: 1_000_000 }) },
    ];
    dearer.offers = [offer(dearer, "dearer-seller", 10_000_000, 23)];
    const result = searchFlights({ ...request, sort: "price" }, [dearer, cheaper]);
    expect(result.flights.map((item) => item.flight.id)).toEqual(["cheaper", "dearer"]);
    expect(result.flights[0].selectedOffer.id).toBe("rial-seller");
    expect(result.flights[0].eligibleOffers.map((item) => item.totalPrice.amountRials)).toEqual([9_500_000, 10_000_000]);
    expect(formatToman(result.flights[0].selectedOffer.totalPrice)).toBe("۹۵۰٬۰۰۰ تومان");
    expect(formatToman(result.flights[1].selectedOffer.totalPrice)).toBe("۱٬۰۰۰٬۰۰۰ تومان");
    expect(result.flights[0].score).toBeGreaterThan(result.flights[1].score);
    expect(result.flights[0].reasons[0]).toContain("۹۵۰٬۰۰۰ تومان");
    expect(result.flights[0].reasons.join(" ")).not.toMatch(/USD|دلار/);
  });

  it("applies a user-entered toman budget as exact integer rials, including the inclusive boundary", () => {
    const boundary = flight("at-budget");
    const above = flight("one-rial-above-budget");
    boundary.offers = [offer(boundary, "boundary", 10_000_000, 23)];
    above.offers = [offer(above, "above", 10_000_001, 23)];
    const maxPriceRials = parseTomanInput("۱٬۰۰۰٬۰۰۰");
    expect(searchFlights({ ...request, filters: { maxPriceRials } }, [above, boundary]).flights.map((item) => item.flight.id)).toEqual(["at-budget"]);
  });

  it("rejects malformed monetary-unit tags and unsafe values instead of treating them as cheap offers", () => {
    const item = flight("money-tags");
    const valid = item.offers[0];
    const invalid: unknown[] = [
      { currency: "IRR", unit: "toman", amountRials: 1_000 },
      { currency: "IRR", amountRials: 1_000 },
      { currency: "USD", unit: "rial", amountRials: 1_000 },
      { currency: "IRR", unit: "rial", amountRials: Number.MAX_SAFE_INTEGER + 1 },
      { currency: "IRR", unit: "rial", amountRials: 1.5 },
    ];
    item.offers = invalid.map((totalPrice, index) => ({ ...valid, id: `invalid-${index}`, totalPrice: totalPrice as Money }));
    item.offers.push(valid);
    expect(searchFlights(request, [item]).flights[0].eligibleOffers.map((offer) => offer.id)).toEqual([valid.id]);
  });

  it("does not combine one seller's budget price with another seller's included bag", () => {
    const item = flight("coupled");
    item.offers = [offer(item, "cheap-no-bag", 22_500_000, 0), offer(item, "bag-fare", 50_000_000, 23)];
    const narrow = { ...request, filters: { maxPriceRials: 25_000_000, checkedBagOnly: true } };
    expect(searchFlights(narrow, [item])).toMatchObject({ totalBeforeFilters: 1, flights: [] });
    const matching = searchFlights({ ...narrow, filters: { ...narrow.filters, maxPriceRials: 50_000_000 } }, [item]);
    expect(matching.flights[0].selectedOffer.id).toBe("bag-fare");
    expect(matching.flights[0].eligibleOffers.map((entry) => entry.id)).toEqual(["bag-fare"]);
  });

  it("excludes incomplete, unavailable, wrong-party, self-transfer, and invalid-price quotes", () => {
    const item = flight("eligibility");
    const valid = offer(item, "valid", 50_000_000, 23);
    item.offers = [
      { ...valid, id: "incomplete", priceComplete: false, totalPrice: { currency: "IRR", unit: "rial", amountRials: 250_000 } },
      { ...valid, id: "unavailable", availability: "unavailable" },
      { ...valid, id: "unknown-availability", availability: "unknown" },
      { ...valid, id: "other-party", adults: 2 },
      { ...valid, id: "self-transfer", ticketing: "self-transfer" },
      { ...valid, id: "negative", totalPrice: { currency: "IRR", unit: "rial", amountRials: -250_000 } },
      valid,
    ];
    expect(searchFlights(request, [item]).flights[0].eligibleOffers.map((entry) => entry.id)).toEqual(["valid"]);
  });

  it("requires known positive checked baggage on every leg of a connection", () => {
    const item = connection("bags-every-leg");
    const full = offer(item, "full", 62_500_000, 23);
    const partial = { ...full, id: "partial", totalPrice: { currency: "IRR" as const, unit: "rial" as const, amountRials: 37_500_000 },
      baggage: [full.baggage[0], { ...full.baggage[1], checkedKg: null }] };
    item.offers = [partial, full];
    expect(searchFlights({ ...request, filters: { checkedBagOnly: true } }, [item]).flights[0].selectedOffer.id).toBe("full");
    item.offers = [partial];
    expect(searchFlights({ ...request, filters: { checkedBagOnly: true } }, [item]).flights).toEqual([]);
  });
});

describe("historical filtering, sorting, and preference ranking", () => {
  it.each([-0.1, 1.2, Number.NaN, Number.POSITIVE_INFINITY])("sanitizes invalid headline rate %s in the returned per-leg evidence", (invalidRate) => {
    const item = withHistory(flight("invalid-rate"), 0.05, "low");
    item.history![0].cancellationRate = invalidRate;
    const result = searchFlights(request, [item]).flights[0];
    expect(result).toMatchObject({ historyCategory: "unknown", historySortRate: null });
    expect(result.flight.history?.[0]).toMatchObject({ category: "unknown", cancellationRate: null, observedRate: 0.05 });
    expect(result.flight.history?.[0].reasons).toContain("invalid-matching-data");
    expect(searchFlights({ ...request, filters: { riskCategories: ["low"] } }, [item]).flights).toEqual([]);
  });

  it("does not return an unrelated flight's history, counts, identity, or diagnostic fraction", () => {
    const item = withHistory(flight("wrong-identity"), 0.05, "low");
    item.history![0].identity = { ...item.history![0].identity, airlineId: "unrelated-airline", flightNumber: "999" };
    const result = searchFlights(request, [item]).flights[0];
    const returned = result.flight.history![0];
    expect(returned).toMatchObject({
      segmentId: item.segments[0].id, category: "unknown", cancellationRate: null, observedRate: null,
      expectedCount: null, coverage: null,
      identity: { airlineId: item.segments[0].airlineId, flightNumber: item.segments[0].flightNumber },
    });
    expect(returned.reasons).toEqual(["invalid-matching-data", "history-unavailable"]);
    expect(result.historyCategory).toBe("unknown");
  });

  it("suppresses a category inconsistent with the 10%/25% policy while retaining trustworthy diagnostics", () => {
    const item = withHistory(flight("wrong-category"), 0.25, "low");
    const result = searchFlights(request, [item]).flights[0];
    expect(result.flight.history?.[0]).toMatchObject({ category: "unknown", cancellationRate: null, observedRate: 0.25 });
    expect(result.flight.history?.[0].reasons).toContain("invalid-matching-data");
  });

  it("rechecks both the minimum known sample and verified-roster coverage before returning a headline rate", () => {
    const sample = withHistory(flight("too-small"), null, "unknown");
    sample.history![0] = { ...sample.history![0], category: "low", cancellationRate: 0 };
    const coverage = withHistory(flight("too-incomplete"), 0, "low");
    coverage.history![0] = {
      ...coverage.history![0], expectedCount: 100, knownCount: 20, operatedCount: 20, missingCount: 80, coverage: 0.2,
    };
    const result = searchFlights(request, [sample, coverage]);
    for (const item of result.flights) {
      expect(item.historyCategory).toBe("unknown");
      expect(item.flight.history?.[0].cancellationRate).toBeNull();
    }
    expect(result.flights.find((item) => item.flight.id === sample.id)?.flight.history?.[0].reasons).toContain("insufficient-sample");
    expect(result.flights.find((item) => item.flight.id === coverage.id)?.flight.history?.[0].reasons).toContain("low-coverage");
  });

  it("binds evidence to the reference clock/window and suppresses malformed counts", () => {
    const clock = withHistory(flight("stale-clock"), 0.05, "low");
    clock.history![0].asOf = "2026-10-14T12:00:00Z";
    const counts = withHistory(flight("bad-counts"), 0.05, "low");
    counts.history![0].knownCount = -1;
    const window = withHistory(flight("wrong-window"), 0.05, "low");
    window.history![0].window.endLocalDate = "2026-10-14";
    for (const result of searchFlights(request, [clock, counts, window]).flights) {
      expect(result.flight.history?.[0]).toMatchObject({ category: "unknown", cancellationRate: null, observedRate: null });
      expect(result.flight.history?.[0].reasons).toContain("history-unavailable");
    }
  });

  it("returns exactly one identity-bound row per segment in leg order and fills missing history safely", () => {
    const item = connection("out-of-order-evidence");
    item.history = [history(item.segments[1], 0.25, "high"), history(item.segments[0], 0.05, "low")];
    const ordered = searchFlights(request, [item]).flights[0].flight.history!;
    expect(ordered.map((row) => row.segmentId)).toEqual(item.segments.map((segment) => segment.id));
    expect(ordered.map((row) => row.cancellationRate)).toEqual([0.05, 0.25]);
    item.history.pop();
    const partial = searchFlights(request, [item]).flights[0];
    expect(partial.historyCategory).toBe("unknown");
    expect(partial.flight.history?.[0]).toMatchObject({ cancellationRate: null, observedRate: null, category: "unknown" });
    expect(partial.flight.history?.[1].cancellationRate).toBe(0.25);
  });

  it("includes unknown only when explicitly requested and never uses its diagnostic zero as a rate", () => {
    const low = withHistory(flight("low"), 0.05, "low");
    const unknown = withHistory(flight("unknown"), null, "unknown");
    expect(searchFlights({ ...request, filters: { riskCategories: ["low"] } }, [unknown, low]).flights.map((entry) => entry.flight.id)).toEqual(["low"]);
    const result = searchFlights({ ...request, filters: { riskCategories: ["unknown"] } }, [low, unknown]).flights[0];
    expect(result.historyCategory).toBe("unknown");
    expect(result.historySortRate).toBeNull();
    expect(result.flight.history?.[0]).toMatchObject({ cancellationRate: null, observedRate: 0 });
  });

  it("sorts sufficient numeric rates within the same category and puts unknown last", () => {
    const higher = withHistory(flight("higher"), 0.05, "low");
    const lower = withHistory(flight("lower"), 0.01, "low");
    const unknown = withHistory(flight("unknown"), null, "unknown");
    const result = searchFlights({ ...request, sort: "history" }, [unknown, higher, lower]);
    expect(result.flights.map((entry) => entry.flight.id)).toEqual(["lower", "higher", "unknown"]);
    // Fixed category utility deliberately does not reward small within-category differences.
    expect(result.flights[0].score).toBe(result.flights[1].score);
  });

  it("uses a connection's worst sufficient leg only as a sorting key and preserves incomplete unknown", () => {
    const known = connection("known-connection");
    known.history = [history(known.segments[0], 0.01, "low"), history(known.segments[1], 0.25, "high")];
    const incomplete = connection("incomplete-connection");
    incomplete.history = [history(incomplete.segments[0], 0.25, "high"), history(incomplete.segments[1], null, "unknown")];
    const result = searchFlights({ ...request, sort: "history" }, [incomplete, known]);
    expect(result.flights[0]).toMatchObject({ historyCategory: "high", historySortRate: 0.25 });
    expect(result.flights[1]).toMatchObject({ historyCategory: "unknown", historySortRate: null });
    expect(result.flights[0].flight.history?.map((entry) => entry.cancellationRate)).toEqual([0.01, 0.25]);
  });

  it("keeps scores stable when an unrelated candidate is removed and provider order changes", () => {
    const a = withHistory(flight("a"), 0.01, "low");
    a.offers.push(offer(a, "z-other-offer", 75_000_000, 23));
    const b = withHistory(flight("b"), 0.1, "medium");
    const snapshot = structuredClone([a, b]);
    const original = searchFlights(request, [a, b]);
    const reordered = searchFlights(request, [{ ...b, offers: [...b.offers].reverse() }, { ...a, offers: [...a.offers].reverse() }]);
    expect(reordered).toEqual(original);
    expect(searchFlights(request, [a]).flights[0].score).toBe(original.flights.find((entry) => entry.flight.id === "a")?.score);
    expect([a, b]).toEqual(snapshot);
  });

  it("matches departure date and time period in the origin zone, including a previous UTC day", () => {
    const originLocalDay = flight("previous-utc-day", "2026-10-15T21:30:00Z");
    const nextLocalDay = flight("next-local-day", "2026-10-16T21:30:00Z");
    const morning = flight("morning", "2026-10-16T04:30:00Z");
    const noon = flight("noon", "2026-10-16T08:30:00Z");
    const inventory = [originLocalDay, nextLocalDay, morning, noon];
    expect(searchFlights(request, inventory).flights.map((entry) => entry.flight.id).sort()).toEqual(["morning", "noon", "previous-utc-day"]);
    expect(searchFlights({ ...request, filters: { departurePeriod: "morning" } }, inventory).flights.map((entry) => entry.flight.id)).toEqual(["morning"]);
    expect(searchFlights({ ...request, filters: { departurePeriod: "afternoon" } }, inventory).flights.map((entry) => entry.flight.id)).toEqual(["noon"]);
    // Evening is the UI's wraparound 18:00–06:00 local interval.
    expect(searchFlights({ ...request, filters: { departurePeriod: "evening" } }, inventory).flights.map((entry) => entry.flight.id)).toEqual(["previous-utc-day"]);
  });

  it("matches a selected Jalali day using its Gregorian date-only value without timestamp conversion", () => {
    const departureDate = jalaliToGregorian({ year: 1405, month: 7, day: 24 });
    expect(departureDate).toBe("2026-10-16");
    const midnight = flight("origin-midnight", "2026-10-15T21:30:00Z");
    const tomorrow = flight("origin-tomorrow", "2026-10-16T21:30:00Z");
    const result = searchFlights({ ...request, query: { ...query, departureDate } }, [midnight, tomorrow]);
    expect(result.query.departureDate).toBe("2026-10-16");
    expect(gregorianToJalali(result.query.departureDate)).toEqual({ year: 1405, month: 7, day: 24 });
    expect(result.flights.map((item) => item.flight.id)).toEqual(["origin-midnight"]);
  });

  it("requires every operating leg to match a carrier filter and applies non-stop restrictions", () => {
    const direct = flight("direct");
    const connected = connection("connected");
    connected.segments[1].airlineId = "demo-airline-1";
    expect(searchFlights({ ...request, filters: { airlineIds: ["demo-airline-0"] } }, [direct, connected]).flights.map((entry) => entry.flight.id)).toEqual(["direct"]);
    expect(searchFlights({ ...request, filters: { nonstopOnly: true } }, [connected]).flights).toEqual([]);
  });
});

describe("runtime search validation", () => {
  it("normalizes exact airport codes and provides safe empty-filter/default-sort values", () => {
    expect(validateSearchRequest({ query: { ...query, origin: " ika ", destination: "ist" } })).toEqual(request);
  });

  it.each([
    null,
    [],
    { query, tool: "fetch" },
    { query: { ...query, origin: "XXX" } },
    { query: { ...query, destination: "IKA" } },
    { query: { ...query, departureDate: "2026-02-30" } },
    { query: { ...query, adults: 0 } },
    { query: { ...query, adults: 10 } },
    { query: { ...query, adults: 1.5 } },
    { query: { ...query, adults: "1" } },
    { query: { ...query, currency: "EUR" } },
    { query: { ...query, currency: "USD" } },
    { query, filters: { maxPriceMinor: 100 } },
    { query, filters: { maxPriceRials: -1 } },
    { query, filters: { maxPriceRials: 100.5 } },
    { query, filters: { maxPriceRials: Number.MAX_SAFE_INTEGER + 1 } },
    { query, filters: { minPriceRials: -1 } },
    { query, filters: { minPriceRials: 100.5 } },
    { query, filters: { minPriceRials: Number.MAX_SAFE_INTEGER + 1 } },
    { query, filters: { minPriceRials: 101, maxPriceRials: 100 } },
    { query, filters: { nonstopOnly: "true" } },
    { query, filters: { riskCategories: [] } },
    { query, filters: { riskCategories: ["safe"] } },
    { query, filters: { airlineIds: ["https://example.com"] } },
    { query, filters: { departurePeriod: "whenever" } },
    { query, filters: { hiddenForecast: true } },
    { query, sort: "predictive" },
  ])("rejects invalid or unknown request data: %j", (input) => {
    expect(() => validateSearchRequest(input)).toThrow(ValidationError);
    try {
      validateSearchRequest(input);
    } catch (error) {
      expect(error).toMatchObject({ status: 400, code: "INVALID_REQUEST" });
    }
  });

  it("distinguishes a valid unsupported fixture date from invalid calendar input", () => {
    expect(() => validateSearchRequest({ query: { ...query, departureDate: "2037-01-01" } })).toThrow(ValidationError);
    try {
      validateSearchRequest({ query: { ...query, departureDate: "2037-01-01" } });
    } catch (error) {
      expect(error).toMatchObject({ code: "UNSUPPORTED_DEMO_DATE", status: 422 });
    }
  });
});

function apiRequest(body: string, headers: Record<string, string> = { "Content-Type": "application/json" }): Request {
  return new Request("http://localhost/api/search", { method: "POST", body, headers });
}

describe("search API contract", () => {
  it("returns deterministic synthetic results and no-store metadata for a valid query", async () => {
    const response = await POST(apiRequest(JSON.stringify(request)));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const result = await response.json();
    expect(result).toMatchObject({ ok: true, data: { asOf: DEMO_METADATA.asOf, source: { mode: "demo" } } });
    expect(result.data.flights.length).toBeGreaterThan(0);
  });

  it("returns empty success for a supported date/airports without a fixture route", async () => {
    const response = await POST(apiRequest(JSON.stringify({ ...request, query: { ...query, origin: "LHR", destination: "DXB" } })));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, data: { flights: [], totalBeforeFilters: 0 } });
  });

  it("returns invalid JSON and unsupported content type as typed client failures", async () => {
    const invalid = await POST(apiRequest("{broken"));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ ok: false, error: { code: "INVALID_JSON" } });
    const media = await POST(apiRequest(JSON.stringify(request), { "Content-Type": "text/plain" }));
    expect(media.status).toBe(415);
    expect(media.headers.get("cache-control")).toBe("no-store");
  });

  it("enforces the byte limit with or without a declared content length", async () => {
    const declared = await POST(apiRequest("{}", { "Content-Type": "application/json", "Content-Length": "16385" }));
    expect(declared.status).toBe(413);
    const actual = await POST(apiRequest(" ".repeat(16_385) + JSON.stringify(request)));
    expect(actual.status).toBe(413);
    expect(await actual.json()).toMatchObject({ ok: false, error: { code: "REQUEST_TOO_LARGE" } });
  });

  it("returns the supported fixture range in a typed unsupported-date response", async () => {
    const response = await POST(apiRequest(JSON.stringify({ ...request, query: { ...query, departureDate: "2037-01-01" } })));
    expect(response.status).toBe(422);
    const result = await response.json();
    expect(result).toMatchObject({ ok: false, error: { code: "UNSUPPORTED_DEMO_DATE" } });
    expect(result.error.message).toContain("مهر ۱۴۰۵");
    expect(result.error.message).not.toMatch(/2026|2026-10/);
    expect(result.error.fields[0].message).toContain("۲۳ مهر ۱۴۰۵");
  });
});

describe("explicit authorized-provider search boundary", () => {
  it("keeps explicitly requested real sources separate and never falls back when access is unavailable", async () => {
    const { defaultSearchRequest } = await import("../src/server/search");
    const live = defaultSearchRequest("live");
    const response = await POST(apiRequest(JSON.stringify({ mode: "live", query: live.query, filters: {}, sort: "price" })));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ flights: [], freshness: "unavailable", source: { mode: "unavailable" }, lastSuccessfulAt: null });
    expect(body.data.providers).toHaveLength(4);
    expect(body.data.providers.every((provider: { status: string; fetchedAt: string | null }) => !["live", "cached"].includes(provider.status) && provider.fetchedAt === null)).toBe(true);
    expect(JSON.stringify(body)).not.toContain("demo-airline");
  });
  it("validates live ISO dates independently of the fixed synthetic manifest", () => {
    expect(validateSearchRequest({ query: { ...query, departureDate: "2027-01-01" }, mode: "live" }).query.departureDate).toBe("2027-01-01");
    expect(() => validateSearchRequest({ query, mode: "pretend-live" })).toThrow(ValidationError);
  });
  it("requires explicit live inventory and never treats synthetic history as real", () => {
    const context = { source: { mode: "live" as const, id: "test", label: "Test live boundary" }, asOf: DEMO_METADATA.asOf, supportedDates: [] };
    expect(() => searchFlights({ ...request, mode: "live" }, undefined, context)).toThrow();
    const item = withHistory(flight("test-live-history-is-not-inventory"), 0.01, "low");
    item.source = context.source;
    item.offers = item.offers.map((offer) => ({ ...offer, source: context.source }));
    const result = searchFlights({ ...request, mode: "live" }, [item], context).flights[0];
    expect(result.historyCategory).toBe("unknown");
    expect(result.flight.history![0]).toMatchObject({ cancellationRate: null, observedRate: null, source: { mode: "unavailable" }, reasons: ["history-unavailable"] });
  });
});
