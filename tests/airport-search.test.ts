import { describe, expect, it } from "vitest";
import { AIRPORTS, type Airport } from "../src/data/airports";
import { searchAirports } from "../src/lib/airport-search";

const codes = (query: string) => searchAirports(AIRPORTS, query).map((airport) => airport.code);

describe("airport selector search", () => {
  it("finds both existing Tehran airports in their original order", () => {
    expect(codes("تهران")).toEqual(["THR", "IKA"]);
    expect(codes("tehran")).toEqual(["THR", "IKA"]);
  });

  it.each(["MHD", "mhd", " MhD ", "mh"])("finds Mashhad by a partial or case-insensitive IATA query %j", (query) => {
    expect(codes(query)).toEqual(["MHD"]);
  });

  it.each([
    ["mashh", "MHD"],
    ["Mehrabad", "THR"],
    ["Imam Khomeini", "IKA"],
    ["hashemi-nejad", "MHD"],
    ["Esfahan", "IFN"],
    ["heath", "LHR"],
  ])("matches the search-only English city/airport alias %j", (query, expectedCode) => {
    expect(codes(query)).toEqual([expectedCode]);
  });

  it.each(["هاشمی‌نژاد", "هاشمی نژاد", "هاشمینژاد", "هاشمي نژاد", "هَاشمی‌نِژاد"])("matches Persian airport spelling and spacing variants %j", (query) => {
    expect(codes(query)).toEqual(["MHD"]);
  });

  it("normalizes Arabic kaf, decorative elongation and directional marks", () => {
    expect(codes("كيش")).toEqual(["KIH"]);
    expect(codes("تهـران")).toEqual(["THR", "IKA"]);
    expect(codes("\u200fMHD\u200e")).toEqual(["MHD"]);
  });

  it("returns no invented airport for unknown names, codes or absent identities", () => {
    expect(codes("ZZZ")).toEqual([]);
    expect(codes("ناموجود")).toEqual([]);
    expect(searchAirports(AIRPORTS.filter((airport) => airport.code !== "MHD"), "Mashhad")).toEqual([]);
    expect(searchAirports([], "تهران")).toEqual([]);
  });

  it.each(["", "  ", "\t\n"])("returns a new ordered array of unchanged references for empty query %j", (query) => {
    const results = searchAirports(AIRPORTS, query);
    expect(results).toEqual(AIRPORTS);
    expect(results).not.toBe(AIRPORTS);
    results.forEach((airport, index) => expect(airport).toBe(AIRPORTS[index]));
  });

  it("accepts frozen input without mutating airport metadata or its order", () => {
    const input: readonly Airport[] = Object.freeze(AIRPORTS.map((airport) => Object.freeze({ ...airport })));
    const snapshot = JSON.stringify(input);
    const results = searchAirports(input, "tehran");
    expect(results).toEqual([input[0], input[2]]);
    expect(results[0]).toBe(input[0]);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(Object.keys(results[0])).toEqual(["code", "name", "city", "timeZone"]);
  });
});
