import { describe, expect, it } from "vitest";
import { EMPTY_JOURNEY_SEARCH, journeyLegQuery, journeySearchUrl, validateJourneySearch, type JourneySearchDraft } from "../src/domain/journey-search";
import { loadExplorerState } from "../src/server/explorer-state";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JalaliDatePicker } from "../src/components/jalali-date-picker";

const options = { airportCodes: ["THR", "MHD", "SYZ"], dateBounds: { min: "2026-10-15", max: "2036-12-31" } };
const valid: JourneySearchDraft = { ...EMPTY_JOURNEY_SEARCH, origin: "THR", destination: "MHD", departureDate: "2026-10-16" };

describe("explicit unified journey search", () => {
  it("starts with no itinerary and one adult, and provides field-specific required errors", () => {
    expect(EMPTY_JOURNEY_SEARCH).toEqual({ tripType: "one-way", origin: "", destination: "", departureDate: "", returnDate: "", adults: 1 });
    const result = validateJourneySearch(EMPTY_JOURNEY_SEARCH, options);
    expect(result.search).toBeNull();
    expect(Object.keys(result.errors)).toEqual(["origin", "destination", "departureDate"]);
  });
  it.each([
    [{ origin: "ZZZ" }, "origin"], [{ destination: "THR" }, "destination"],
    [{ departureDate: "2026-02-30" }, "departureDate"], [{ departureDate: "2026-10-14" }, "departureDate"],
    [{ adults: 0 }, "adults"], [{ adults: 10 }, "adults"], [{ adults: 1.5 }, "adults"],
  ] as const)("rejects invalid criteria %j", (patch, field) => {
    const result = validateJourneySearch({ ...valid, ...patch }, options);
    expect(result.search).toBeNull(); expect(result.errors[field]).toBeTruthy();
  });
  it("requires a valid return date only for a round trip", () => {
    expect(validateJourneySearch({ ...valid, returnDate: "invalid" }, options).search?.tripType).toBe("one-way");
    expect(validateJourneySearch({ ...valid, tripType: "round-trip" }, options).errors.returnDate).toBeTruthy();
    expect(validateJourneySearch({ ...valid, tripType: "round-trip", returnDate: "2026-10-15" }, options).errors.returnDate).toBeTruthy();
    expect(validateJourneySearch({ ...valid, tripType: "round-trip", returnDate: "2026-10-16" }, options).search).not.toBeNull();
  });
  it("keeps distinct reversed airport/date contexts and preserves party pricing units", () => {
    const search = validateJourneySearch({ ...valid, tripType: "round-trip", returnDate: "2026-10-20", adults: 2 }, options).search!;
    expect(journeyLegQuery(search, "outbound")).toEqual({ origin: "THR", destination: "MHD", departureDate: "2026-10-16", adults: 2, currency: "IRR" });
    expect(journeyLegQuery(search, "inbound")).toEqual({ origin: "MHD", destination: "THR", departureDate: "2026-10-20", adults: 2, currency: "IRR" });
    expect(search.query.origin).toBe("THR");
    expect(journeySearchUrl(search, "demo")).toBe("/?origin=THR&destination=MHD&date=2026-10-16&adults=2&mode=demo&tripType=round-trip&returnDate=2026-10-20");
    expect(() => journeyLegQuery(validateJourneySearch(valid, options).search!, "inbound")).toThrow();
  });
  it("does not manufacture an initial search response for a bare homepage or mode switch", async () => {
    for (const params of [{}, { mode: "demo" }, { mode: "live" }, { mode: "fixture" }]) {
      const state = await loadExplorerState(params);
      expect(state.initialData).toBeNull(); expect(state.initialInboundData).toBeNull(); expect(state.initialSearch).toBeNull();
      expect(state.initialDraft).toEqual(EMPTY_JOURNEY_SEARCH);
    }
  });
  it("preserves incomplete deep-link drafts with field errors instead of replacing the route", async () => {
    const state = await loadExplorerState({ origin: "THR", date: "2026-10-16" });
    expect(state.initialData).toBeNull(); expect(state.initialDraft?.destination).toBe("");
    expect(state.initialFieldErrors?.destination).toBeTruthy();
  });
  it.each(["not-a-date", "2026-02-30", "2037-01-01"])("handles an invalid deep-link date %s without searching or crashing the picker", async (departureDate) => {
    const state = await loadExplorerState({ origin: "THR", destination: "MHD", date: departureDate, tripType: "round-trip", returnDate: "invalid" });
    expect(state.initialData).toBeNull(); expect(state.initialSearch).toBeNull();
    expect(state.initialFieldErrors?.departureDate).toBeTruthy(); expect(state.initialFieldErrors?.returnDate).toBeTruthy();
    const render = () => renderToStaticMarkup(createElement(JalaliDatePicker, { value: state.initialDraft!.departureDate, min: options.dateBounds.min, max: options.dateBounds.max, placeholder: "تاریخ رفت را انتخاب کنید", onChange: () => {} }));
    expect(render).not.toThrow();
  });
  it("loads both supported demo directions independently using their selected dates", async () => {
    const state = await loadExplorerState({ origin: "THR", destination: "MHD", date: "2026-10-16", returnDate: "2026-10-20", tripType: "round-trip", adults: "2", mode: "demo" });
    expect(state.initialData?.flights).toHaveLength(16); expect(state.initialInboundData?.flights).toHaveLength(16);
    expect(state.initialData?.query).toMatchObject({ origin: "THR", destination: "MHD", departureDate: "2026-10-16", adults: 2 });
    expect(state.initialInboundData?.query).toMatchObject({ origin: "MHD", destination: "THR", departureDate: "2026-10-20", adults: 2 });
    expect(state.initialData?.flights[0].flight.id).not.toBe(state.initialInboundData?.flights[0].flight.id);
  });
  it("does not replace unavailable reference return data or erase an independently successful outbound leg", async () => {
    const state = await loadExplorerState({ origin: "THR", destination: "MHD", date: "2026-10-15", returnDate: "2026-10-15", tripType: "round-trip", mode: "fixture" });
    expect(state.initialData?.unpricedFlights?.length).toBeGreaterThan(0);
    expect(state.initialInboundData).toBeNull(); expect(state.initialInboundError).toContain("جایگزینی انجام نشد");
  });
});
