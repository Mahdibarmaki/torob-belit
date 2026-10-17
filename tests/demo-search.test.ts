import { describe, expect, it } from "vitest";
import { searchFlights, type SearchFilters, type SearchRequest, type SearchSort } from "../src/application/search-service";
import { IRANIAN_AIRLINES } from "../src/data/airlines";
import { DEMO_DATE_BOUNDS } from "../src/domain/demo-date";
import { formatToman } from "../src/domain/money";
import { elapsedMinutes, localDateAt, localMinuteAt } from "../src/domain/time";
import { AIRPORTS, DEMO_METADATA, DEMO_ROUTES, loadDemoFlights } from "../src/fixtures/demo";

function request(origin = "THR", destination = "MHD", date = "2026-10-16", filters: SearchFilters = {}, sort: SearchSort = "recommended"): SearchRequest {
  return { mode: "demo", query: { origin, destination, departureDate: date, adults: 1, currency: "IRR" }, filters, sort };
}

const destinations = ["MHD", "SYZ", "KIH", "IFN", "TBZ", "AWZ"];

describe("rich offline domestic inventory", () => {
  it.each(destinations.flatMap((destination) => [["THR", destination], [destination, "THR"]]))("populates %s–%s with distinct schedules and seller fares", (origin, destination) => {
    const result = searchFlights(request(origin, destination));
    expect(result.flights).toHaveLength(16);
    expect(result.totalBeforeFilters).toBe(16);
    expect(new Set(result.flights.map((item) => item.flight.id)).size).toBe(16);
    expect(new Set(result.flights.map((item) => item.flight.segments[0].airlineId)).size).toBe(11);
    expect(result.flights.filter((item) => item.flight.stops === 0)).toHaveLength(14);
    expect(result.flights.filter((item) => item.flight.stops === 1)).toHaveLength(2);
    expect(new Set(result.flights.map((item) => item.historyCategory))).toEqual(new Set(["low", "medium", "high", "unknown"]));
    for (const { flight, eligibleOffers } of result.flights) {
      expect(flight.segments[0].origin).toBe(origin);
      expect(flight.segments.at(-1)?.destination).toBe(destination);
      expect(localDateAt(flight.segments[0].departureAt, "Asia/Tehran")).toBe("2026-10-16");
      expect(flight.durationMinutes).toBe(elapsedMinutes(flight.segments[0].departureAt, flight.segments.at(-1)!.arrivalAt));
      expect(flight.source).toMatchObject({ mode: "demo", id: DEMO_METADATA.datasetId });
      expect(eligibleOffers).toHaveLength(3);
      expect(new Set(eligibleOffers.map((offer) => offer.sellerId)).size).toBe(3);
      expect(eligibleOffers.every((offer) => offer.totalPrice.currency === "IRR" && offer.totalPrice.unit === "rial" && offer.sourceState === "FIXTURE")).toBe(true);
      for (let leg = 1; leg < flight.segments.length; leg++) {
        expect(flight.segments[leg - 1].destination).toBe(flight.segments[leg].origin);
        expect(elapsedMinutes(flight.segments[leg - 1].arrivalAt, flight.segments[leg].departureAt)).toBeGreaterThan(0);
      }
    }
  });

  it.each(["2026-10-15", "2026-11-01", "2027-03-21", "2028-02-29", "2030-07-12", "2036-12-31"])("generates supported date %s deterministically without shifting the frozen history clock", (date) => {
    const search = request("THR", "MHD", date);
    const first = searchFlights(search);
    const second = searchFlights(search);
    expect(first).toEqual(second);
    expect(first.flights).toHaveLength(16);
    expect(first.asOf).toBe("2026-10-15T12:00:00Z");
    for (const item of first.flights) {
      expect(localDateAt(item.flight.segments[0].departureAt, "Asia/Tehran")).toBe(date);
      for (const history of item.flight.history ?? []) {
        expect(history.asOf).toBe(DEMO_METADATA.asOf);
        expect(history.source.mode).toBe("demo");
        expect(history.window.endLocalDate).toBe("2026-10-15");
      }
    }
  });

  it("does not fabricate an unsupported route or an invalid/out-of-horizon date", () => {
    expect(searchFlights(request("MHD", "SYZ")).flights).toEqual([]);
    expect(searchFlights(request("LHR", "DXB")).flights).toEqual([]);
    expect(loadDemoFlights(request("THR", "MHD", "2026-02-30").query)).toEqual([]);
    expect(loadDemoFlights(request("THR", "MHD", "2037-01-01").query)).toEqual([]);
    expect(DEMO_METADATA.dateBounds).toEqual(DEMO_DATE_BOUNDS);
    expect(DEMO_ROUTES).toHaveLength(18);
    expect(AIRPORTS.some((airport) => airport.code === "AWZ")).toBe(true);
  });

  it("uses genuine catalog identities with only their documented illustrative models", () => {
    const catalog = new Map(IRANIAN_AIRLINES.map((airline) => [airline.id, airline]));
    expect(catalog.size).toBe(11);
    for (const route of DEMO_ROUTES) {
      for (const flight of loadDemoFlights(request(route.origin, route.destination).query)) {
        for (const segment of flight.segments) {
          const airline = catalog.get(segment.airlineId);
          expect(airline).toBeDefined();
          expect(segment.airlineName).toBe(airline!.name);
          expect(airline!.aircraftModels).toContain(segment.aircraftModel);
          expect(segment.flightNumber).toMatch(/^\d{3,4}$/);
          expect(segment.airlineName).not.toMatch(/اطلس|افق|نمایشی/);
        }
      }
    }
  });

  it("keeps the original seven-flight overseas search and authored numeric prices available", () => {
    const results = searchFlights(request("IKA", "IST"));
    expect(results.flights).toHaveLength(7);
    const firstLegacy = results.flights.find((item) => item.flight.segments[0].flightNumber === "101");
    expect(firstLegacy?.selectedOffer.totalPrice.amountRials).toBe(62_000_000);
    expect(firstLegacy?.flight.segments[0].airlineName).toBe("ایران‌ایر");
    const longerRoute = loadDemoFlights(request("IKA", "LHR").query);
    expect(longerRoute.every((flight) => flight.segments.every((segment) => ["Airbus A321", "Airbus A310"].includes(segment.aircraftModel!)))).toBe(true);
  });

  it("produces independent inventory values across calls and scales exact complete party totals", () => {
    const query = request().query;
    const oneAdult = loadDemoFlights(query);
    const threeAdults = loadDemoFlights({ ...query, adults: 3 });
    for (let index = 0; index < oneAdult.length; index++) {
      for (let tier = 0; tier < 3; tier++) {
        const one = oneAdult[index].offers[tier].totalPrice.amountRials;
        const three = threeAdults[index].offers[tier].totalPrice.amountRials;
        expect(three).toBe((one - 3_750_000) * 3 + 3_750_000);
      }
    }
    oneAdult[0].offers[0].totalPrice.amountRials = 0;
    expect(loadDemoFlights(query)[0].offers[0].totalPrice.amountRials).toBeGreaterThan(0);
    expect(searchFlights({ ...request(), query: { ...query, adults: 9 } }).flights.length).toBeGreaterThanOrEqual(15);
  });
});

describe("restored demo search interactions", () => {
  it("sorts canonical numeric prices rather than Persian formatted text", () => {
    const result = searchFlights(request("THR", "MHD", "2026-10-16", {}, "price"));
    const prices = result.flights.map((item) => item.selectedOffer.totalPrice.amountRials);
    expect(prices).toEqual([...prices].sort((left, right) => left - right));
    const price = formatToman(result.flights[0].selectedOffer.totalPrice);
    expect(price).toContain("تومان");
    expect(price).toContain("٬");
    expect(price).toMatch(/[۰-۹]/);
    expect(price).not.toMatch(/[0-9]/);
  });

  it("filters genuine airline identities on every connection leg", () => {
    const result = searchFlights(request("THR", "MHD", "2026-10-16", { airlineIds: ["TBZ"] }));
    expect(result.flights.length).toBeGreaterThan(1);
    expect(result.flights.every((item) => item.flight.segments.every((segment) => segment.airlineId === "TBZ"))).toBe(true);
    expect(searchFlights(request("THR", "MHD", "2026-10-16", { airlineIds: ["nonexistent"] })).flights).toEqual([]);
  });

  it.each(["morning", "afternoon", "evening"] as const)("has useful %s departure results in the origin-local calendar", (period) => {
    const result = searchFlights(request("THR", "MHD", "2026-10-16", { departurePeriod: period }));
    expect(result.flights.length).toBeGreaterThan(2);
    for (const item of result.flights) {
      const minute = localMinuteAt(item.flight.segments[0].departureAt, "Asia/Tehran");
      expect(period === "morning" ? minute >= 360 && minute < 720
        : period === "afternoon" ? minute >= 720 && minute < 1080 : minute >= 1080 || minute < 360).toBe(true);
    }
  });

  it("retains direct and connecting alternatives while respecting stop and same-offer bag/budget filters", () => {
    const baseline = searchFlights(request());
    const nonstop = searchFlights(request("THR", "MHD", "2026-10-16", { nonstopOnly: true }));
    expect(nonstop.flights).toHaveLength(14);
    const noBag = baseline.flights.find((item) => item.selectedOffer.baggage[0].checkedKg === 0)!;
    expect(noBag).toBeDefined();
    const constrained = searchFlights(request("THR", "MHD", "2026-10-16", {
      checkedBagOnly: true, maxPriceRials: noBag.selectedOffer.totalPrice.amountRials,
    }));
    expect(constrained.flights.some((item) => item.flight.id === noBag.flight.id)).toBe(false);
    const baggage = searchFlights(request("THR", "MHD", "2026-10-16", { checkedBagOnly: true }));
    expect(baggage.flights).toHaveLength(16);
    const withBag = baggage.flights.find((item) => item.flight.id === noBag.flight.id)!;
    expect(withBag.selectedOffer.totalPrice.amountRials).toBeGreaterThan(noBag.selectedOffer.totalPrice.amountRials);
    expect(withBag.selectedOffer.baggage.every((bag) => (bag.checkedKg ?? 0) > 0)).toBe(true);
  });

  it("keeps retrospective synthetic risk filtering and unknown-last sorting operational", () => {
    const low = searchFlights(request("THR", "MHD", "2026-10-16", { riskCategories: ["low"] }));
    expect(low.flights.length).toBeGreaterThan(2);
    for (const result of low.flights) {
      expect(result.historyCategory).toBe("low");
      expect(result.flight.history![0].cancellationRate).toBeLessThan(0.1);
      expect(result.flight.history![0].source.mode).toBe("demo");
    }
    const ordered = searchFlights(request("THR", "MHD", "2026-10-16", {}, "history"));
    const firstUnknown = ordered.flights.findIndex((item) => item.historyCategory === "unknown");
    expect(firstUnknown).toBeGreaterThan(0);
    expect(ordered.flights.slice(firstUnknown).every((item) => item.historyCategory === "unknown" && item.historySortRate === null)).toBe(true);
  });
});
