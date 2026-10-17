import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlibabaResponseError, parseAlibabaResponse } from "@/server/providers/alibaba-parser";
import { ALIBABA_REFERENCE_FIXTURES, ALIBABA_REFERENCE_MANIFEST } from "@/fixtures/alibaba/manifest";

const firstRawRecord = (ALIBABA_REFERENCE_FIXTURES[0].payload as { result: { departing: Record<string, unknown>[] } }).result.departing[0];
const response = (rows: unknown[]) => ({ success: true, result: { departing: rows } });
const parseRow = (changes: Record<string, unknown> = {}) => parseAlibabaResponse(response([{ ...firstRawRecord, ...changes }]));

afterEach(() => { vi.unstubAllEnvs(); });

describe("inspected saved Alibaba response fixtures", () => {
  it.each(ALIBABA_REFERENCE_FIXTURES)("parses every sanitized $destination record without converting its unverified price", (fixture) => {
    const { records, issues } = parseAlibabaResponse(fixture.payload);
    expect(issues).toEqual([]);
    expect(records).toHaveLength(fixture.recordCount);
    expect(records.every((record) => record.origin === fixture.origin && record.destination === fixture.destination)).toBe(true);
    expect(records.every((record) => record.priceUnit === "unverified")).toBe(true);
    expect(records.every((record) => fixture.departureDates.includes(record.departureLocal.slice(0, 10) as "2026-10-15"))).toBe(true);
    expect(records.map((record) => record.referenceIndex)).toEqual(Array.from({ length: fixture.recordCount }, (_, index) => index));
    expect(records.filter((record) => record.availability === "available")).toHaveLength(fixture.destination === "MHD" ? 45 : 9);
    expect(records.filter((record) => record.availability === "unavailable")).toHaveLength(fixture.destination === "MHD" ? 10 : 5);
  });

  it("retains the actual raw price and leading zeros instead of the reference's inferred conversion", () => {
    const mhd = parseAlibabaResponse(ALIBABA_REFERENCE_FIXTURES[0].payload).records;
    const syz = parseAlibabaResponse(ALIBABA_REFERENCE_FIXTURES[1].payload).records;
    expect(mhd[0].adultPriceRaw).toBe(75_281_000);
    expect(syz[0].adultPriceRaw).toBe(98_325_000);
    expect(syz[0].flightNumber).toBe("0048");
    expect(syz[1].flightNumber).toBe("048");
    expect(mhd[7].flightNumber).toBe("1838.");
    expect(mhd[0].cabin).toBe("E");
    expect(mhd[0].fareClass).toBe("Q");
    expect(mhd[0]).not.toHaveProperty("totalPrice");
    expect(mhd[0]).not.toHaveProperty("currency");
  });

  it("records source hashes and preserves the supplied originals", () => {
    expect(ALIBABA_REFERENCE_MANIFEST.capturedAt).toBeNull();
    expect(ALIBABA_REFERENCE_MANIFEST.priceUnit).toBe("unverified");
    for (const source of ALIBABA_REFERENCE_MANIFEST.sources) {
      const original = readFileSync(new URL(`../${source.originalPath}`, import.meta.url));
      const sanitized = readFileSync(new URL(`../${source.sanitizedPath}`, import.meta.url));
      expect(createHash("sha256").update(original).digest("hex")).toBe(source.originalSha256);
      expect(createHash("sha256").update(sanitized).digest("hex")).toBe(source.sanitizedSha256);
    }
  });

  it("removes opaque identifiers and request metadata from both saved copies and parser output", () => {
    for (const fixture of ALIBABA_REFERENCE_FIXTURES) {
      const serialized = JSON.stringify(fixture.payload);
      for (const field of ["proposalId", "uniqueKey", "flightId", "systemKey", "__traceId", "targetUrl", "ab-alohomora"]) expect(serialized).not.toContain(field);
    }
    const { records, issues } = parseRow({ proposalId: "private-marker", uniqueKey: "private-marker", flightId: "private-marker", headers: { authorization: "private-marker" } });
    expect(JSON.stringify({ records, issues })).not.toContain("private-marker");
  });
});

describe("bounded parser boundary and invalid record isolation", () => {
  it.each([null, undefined, [], {}, { success: "true" }, { success: true }, { success: true, result: [] }, { success: true, result: { departing: {} } }, response(Array(2001).fill(null))])("rejects malformed root data %# with a typed sanitized error", (input) => {
    expect(() => parseAlibabaResponse(input)).toThrow(AlibabaResponseError);
    expect(() => parseAlibabaResponse(input)).toThrow("Invalid saved Alibaba response.");
  });

  it.each([{ success: false, error: { message: "private-marker" } }, { ...response([]), unauthorizedRequest: true }])("rejects failed or unauthorized saved responses %#", (input) => {
    expect(() => parseAlibabaResponse(input)).toThrowError(expect.objectContaining({ code: "provider-rejected" }));
    try { parseAlibabaResponse(input); } catch (error) { expect(String(error)).not.toContain("private-marker"); }
  });

  it("accepts a successful empty response without fabricating records", () => {
    expect(parseAlibabaResponse(response([]))).toEqual({ records: [], issues: [] });
  });

  it.each([
    { priceAdult: -1 }, { priceAdult: 1.5 }, { priceAdult: Number.MAX_SAFE_INTEGER + 1 },
    { priceAdult: Number.POSITIVE_INFINITY }, { priceAdult: Number.NaN }, { priceAdult: "75281000" },
  ])("skips invalid monetary records %# while retaining their source indexes", (changes) => {
    const parsed = parseAlibabaResponse(response([firstRawRecord, { ...firstRawRecord, ...changes }, firstRawRecord]));
    expect(parsed.records.map((record) => record.referenceIndex)).toEqual([0, 2]);
    expect(parsed.issues).toEqual([{ index: 1, code: "invalid-price" }]);
  });

  it.each([
    { origin: "thr" }, { destination: "THR" }, { origin: "TEHRAN" },
    { airlineCode: "" }, { airlineName: "bad\u0000name" }, { airlineName: "x".repeat(257) },
    { flightNumber: 48 }, { flightNumber: "" }, { class: "" }, { classType: undefined },
    { maxAllowedBaggage: -1 }, { maxAllowedBaggage: {} },
  ])("excludes malformed identity or fare fields %#", (changes) => {
    const parsed = parseRow(changes);
    expect(parsed.records).toEqual([]);
    expect(parsed.issues).toHaveLength(1);
  });

  it("retains null and raw textual baggage without inventing an allowance", () => {
    expect(parseRow({ maxAllowedBaggage: null }).records[0].baggageRaw).toBeNull();
    expect(parseRow({ maxAllowedBaggage: undefined }).records[0].baggageRaw).toBeNull();
    expect(parseRow({ maxAllowedBaggage: "۲۰ کیلوگرم" }).records[0].baggageRaw).toBe("۲۰ کیلوگرم");
  });
});

describe("timezone-less local schedules", () => {
  it("does not shift a saved local date when the host time zone changes", () => {
    const results = ["UTC", "Asia/Tehran", "America/Los_Angeles"].map((zone) => {
      vi.stubEnv("TZ", zone);
      return parseRow().records[0];
    });
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(results[0].departureLocal).toBe("2026-10-15T15:00:00");
  });

  it("accepts a valid leap date and overnight year boundary without constructing timestamps", () => {
    expect(parseRow({ leaveDateTime: "2024-02-29T23:00:00", arrivalDateTime: "2024-03-01T01:00:00" }).records).toHaveLength(1);
    expect(parseRow({ leaveDateTime: "2026-12-31T23:30:00", arrivalDateTime: "2027-01-01T01:00:00" }).records).toHaveLength(1);
  });

  it.each([
    { leaveDateTime: "2026-02-29T15:00:00" }, { leaveDateTime: "2026-13-15T15:00:00" },
    { leaveDateTime: "2026-10-15T24:00:00" }, { leaveDateTime: "2026-10-15T15:00:60" },
    { leaveDateTime: "2026-10-15T15:00:00Z" }, { leaveDateTime: "2026-10-15T15:00:00+03:30" },
    { arrivalDateTime: "2026-10-15T14:59:00" }, { arrivalDateTime: "2026-10-15T15:00:00" },
  ])("rejects invalid, offset-bearing or nonpositive schedules %#", (changes) => {
    expect(parseRow(changes)).toEqual({ records: [], issues: [{ index: 0, code: "invalid-schedule" }] });
  });
});

describe("conservative saved inventory status, separate from operational history", () => {
  it.each([
    { change: { status: "X" }, expected: "unavailable" },
    { change: { status: "C" }, expected: "unavailable" },
    { change: { seat: 0 }, expected: "unavailable" },
    { change: { isAllowedToBuy: false }, expected: "unavailable" },
    { change: { seat: undefined }, expected: "unknown" },
    { change: { seat: -1 }, expected: "unknown" },
    { change: { seat: "7" }, expected: "unknown" },
    { change: { status: undefined }, expected: "unknown" },
    { change: { status: "unexpected" }, expected: "unknown" },
    { change: { status: 7 }, expected: "unknown" },
    { change: { isAllowedToBuy: undefined }, expected: "unknown" },
    { change: { isAllowedToBuy: "true" }, expected: "unknown" },
    { change: { status: "10", seat: 10, isAllowedToBuy: true }, expected: "available" },
  ])("reports inventory $expected for $change", ({ change, expected }) => {
    const record = parseRow(change).records[0];
    expect(record.availability).toBe(expected);
    expect(record).not.toHaveProperty("cancellationRate");
    expect(record).not.toHaveProperty("history");
  });

  it("preserves connection/refund missingness without creating connecting legs", () => {
    const known = parseRow({ hasConnection: true, isRefundable: false }).records[0];
    expect(known.hasConnection).toBe(true);
    expect(known.refundable).toBe(false);
    const missing = parseRow({ hasConnection: undefined, isRefundable: "yes" }).records[0];
    expect(missing.hasConnection).toBeNull();
    expect(missing.refundable).toBeNull();
    expect(known).not.toHaveProperty("segments");
  });
});
