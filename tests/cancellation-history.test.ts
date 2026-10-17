import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import {
  calculateCancellationHistory,
  historyUtility,
  summarizeHistoricalRisk,
} from "../src/domain/cancellation-history";
import type { CancellationHistoryInput, FlightIdentity, FlightOperation } from "../src/domain/models";
import { elapsedMinutes, previousCompletedDaysWindow } from "../src/domain/time";

const identity: FlightIdentity = {
  airlineId: "synthetic-airline",
  flightNumber: "100A",
  origin: "IKA",
  destination: "DXB",
};
const asOf = "2026-10-15T12:00:00Z";

function fixture(count = 20, cancellations = 0): CancellationHistoryInput {
  const operations: FlightOperation[] = Array.from({ length: count }, (_, index) => {
    const date = Temporal.PlainDate.from("2026-09-15").add({ days: index }).toString();
    return {
      ...identity,
      operationId: `operation-${index}`,
      originalScheduledDepartureAt: `${date}T08:00:00Z`,
      observedAt: `${date}T11:00:00Z`,
      status: index < cancellations ? "cancelled" : "operated",
      revision: 1,
    };
  });
  return {
    identity,
    asOf,
    originTimeZone: "UTC",
    roster: { verified: true, asOf, expected: operations.map((row) => ({ ...row })) },
    operations,
    source: { mode: "demo", id: "history-unit-fixture", label: "Synthetic test operations" },
    segmentId: "segment-1",
  };
}

describe("historical cancellation classification", () => {
  it.each([
    [20, 0, "low"],
    [20, 1, "low"],
    [10, 1, "medium"],
    [20, 4, "medium"],
    [20, 5, "high"],
    [20, 20, "high"],
  ] as const)("classifies %i known operations with %i cancellations as %s", (count, cancelled, category) => {
    const result = calculateCancellationHistory(fixture(count, cancelled));
    expect(result.category).toBe(category);
    expect(result.cancellationRate).toBe(cancelled / count);
    expect(result.knownCount).toBe(count);
    expect(result.segmentId).toBe("segment-1");
    expect(result.source.mode).toBe("demo");
  });

  it("keeps a small zero-cancellation sample unknown, with diagnostic counts", () => {
    const result = calculateCancellationHistory(fixture(9));
    expect(result.category).toBe("unknown");
    expect(result.cancellationRate).toBeNull();
    expect(result.observedRate).toBe(0);
    expect(result.knownCount).toBe(9);
    expect(result.reasons).toContain("insufficient-sample");
  });

  it("uses known outcomes as the denominator and the independent roster for coverage", () => {
    const input = fixture(20, 2);
    input.operations = input.operations.slice(0, 18).map((row, index) => (
      index >= 14 ? { ...row, status: "unknown" } : row
    ));
    const result = calculateCancellationHistory(input);
    expect(result.cancelledCount).toBe(2);
    expect(result.knownCount).toBe(14);
    expect(result.unknownCount).toBe(4);
    expect(result.missingCount).toBe(2);
    expect(result.expectedCount).toBe(20);
    expect(result.observedRate).toBe(2 / 14);
    expect(result.coverage).toBe(0.7);
    expect(result.cancellationRate).toBeNull();
    expect(result.reasons).toContain("low-coverage");
  });

  it("accepts exactly 80% coverage and rejects lower coverage", () => {
    const input = fixture(20, 4);
    input.operations = input.operations.slice(0, 16);
    const sufficient = calculateCancellationHistory(input);
    expect(sufficient.coverage).toBe(0.8);
    expect(sufficient.category).toBe("high");
    expect(sufficient.cancellationRate).toBe(0.25);
    input.operations.pop();
    const insufficient = calculateCancellationHistory(input);
    expect(insufficient.coverage).toBe(0.75);
    expect(insufficient.category).toBe("unknown");
  });

  it.each([false, null])("never derives expected operations from received rows (%s)", (verified) => {
    const input = fixture(20);
    input.roster = verified === null ? null : { ...input.roster!, verified };
    const result = calculateCancellationHistory(input);
    expect(result.knownCount).toBe(20);
    expect(result.observedRate).toBe(0);
    expect(result.expectedCount).toBeNull();
    expect(result.missingCount).toBeNull();
    expect(result.coverage).toBeNull();
    expect(result.cancellationRate).toBeNull();
    expect(result.category).toBe("unknown");
    expect(result.reasons).toContain("unverified-roster");
  });

  it("returns unknown for an empty verified schedule rather than 0%", () => {
    const result = calculateCancellationHistory(fixture(0));
    expect(result.expectedCount).toBe(0);
    expect(result.observedRate).toBeNull();
    expect(result.cancellationRate).toBeNull();
    expect(result.category).toBe("unknown");
    expect(result.reasons).toContain("no-expected-operations");
  });
});

describe("history matching and calendar boundaries", () => {
  it("matches operating airline, number including suffix, and directed route exactly", () => {
    const input = fixture();
    const removed = input.operations.shift()!;
    input.operations.push(
      { ...removed, airlineId: "another-airline" },
      { ...removed, flightNumber: "100" },
      { ...removed, origin: "DXB", destination: "IKA" },
    );
    const result = calculateCancellationHistory(input);
    expect(result.knownCount).toBe(19);
    expect(result.missingCount).toBe(1);
    expect(result.expectedCount).toBe(20);
  });

  it("normalizes airport case and number spacing without losing meaningful suffixes", () => {
    const input = fixture();
    input.operations = input.operations.map((row) => ({ ...row, flightNumber: " 100 a ", origin: "ika" }));
    expect(calculateCancellationHistory(input).knownCount).toBe(20);
  });

  it("includes the origin-local window start, excludes its end and the current day", () => {
    const input = fixture(0);
    input.asOf = "2026-10-15T01:00:00Z";
    input.originTimeZone = "Asia/Tehran";
    const departures = [
      "2026-09-14T20:29:59Z",
      "2026-09-14T20:30:00Z",
      "2026-10-14T20:29:59Z",
      "2026-10-14T20:30:00Z",
      "2026-10-15T00:00:00Z",
    ];
    input.operations = departures.map((departure, index) => ({
      ...identity,
      operationId: `boundary-${index}`,
      originalScheduledDepartureAt: departure,
      observedAt: "2026-10-15T00:30:00Z",
      status: "operated",
    }));
    input.roster = { verified: true, asOf: input.asOf, expected: input.operations };
    const result = calculateCancellationHistory(input);
    expect(result.window.startLocalDate).toBe("2026-09-15");
    expect(result.window.endLocalDate).toBe("2026-10-15");
    expect(result.window.startAt).toBe("2026-09-14T20:30:00Z");
    expect(result.expectedCount).toBe(2);
    expect(result.knownCount).toBe(2);
  });

  it("uses calendar days rather than 720 UTC hours across daylight saving", () => {
    const window = previousCompletedDaysWindow("2026-11-05T12:00:00Z", "America/New_York");
    expect(window.startLocalDate).toBe("2026-10-06");
    expect(window.endLocalDate).toBe("2026-11-05");
    expect(window.startAt).toBe("2026-10-06T04:00:00Z");
    expect(window.endAt).toBe("2026-11-05T05:00:00Z");
    expect(elapsedMinutes(window.startAt, window.endAt)).toBe(30 * 24 * 60 + 60);
  });

  it("excludes future observations while accepting a correction known exactly at asOf", () => {
    const input = fixture();
    const first = input.operations[0];
    input.operations.push({ ...first, status: "cancelled", revision: 3, observedAt: "2026-10-15T12:00:00.001Z" });
    expect(calculateCancellationHistory(input).cancelledCount).toBe(0);
    input.operations.push({ ...first, status: "cancelled", revision: 2, observedAt: input.asOf });
    expect(calculateCancellationHistory(input).cancelledCount).toBe(1);
  });

  it("rejects a roster snapshot recorded after the reference instant", () => {
    const input = fixture();
    input.roster!.asOf = "2026-10-16T00:00:00Z";
    const result = calculateCancellationHistory(input);
    expect(result.category).toBe("unknown");
    expect(result.expectedCount).toBeNull();
    expect(result.knownCount).toBe(20);
    expect(result.reasons).toContain("invalid-matching-data");
  });
});

describe("reconciliation and duplicate observations", () => {
  it("deduplicates repeated observations and different IDs for the same original operation", () => {
    const input = fixture();
    const duplicate = { ...input.operations[0], operationId: "provider-alias" };
    input.operations.push(input.operations[0], duplicate);
    input.roster!.expected.push({ ...duplicate });
    const result = calculateCancellationHistory(input);
    expect(result.expectedCount).toBe(20);
    expect(result.knownCount).toBe(20);
    expect(result.category).toBe("low");
  });

  it("preserves separate operations on the same local day", () => {
    const input = fixture();
    const second = {
      ...input.operations[0],
      operationId: "same-day-evening",
      originalScheduledDepartureAt: "2026-09-15T16:00:00Z",
      observedAt: "2026-09-15T19:00:00Z",
    };
    input.operations.push(second);
    input.roster!.expected.push(second);
    expect(calculateCancellationHistory(input).knownCount).toBe(21);
  });

  it("uses the final known authoritative revision instead of counting corrections twice", () => {
    const input = fixture(20, 1);
    const first = input.operations[0];
    input.operations.push({ ...first, status: "operated", revision: 2, observedAt: "2026-09-15T14:00:00Z" });
    const result = calculateCancellationHistory(input);
    expect(result.cancelledCount).toBe(0);
    expect(result.operatedCount).toBe(20);
    expect(result.expectedCount).toBe(20);
  });

  it("keeps equal-revision conflicting outcomes unknown and reconciles the denominator", () => {
    const input = fixture();
    input.operations.push({ ...input.operations[0], status: "cancelled", observedAt: "2026-09-15T14:00:00Z" });
    const result = calculateCancellationHistory(input);
    expect(result.conflictingCount).toBe(1);
    expect(result.unknownCount).toBe(1);
    expect(result.knownCount).toBe(19);
    expect(result.expectedCount).toBe(result.knownCount + result.unknownCount + result.missingCount!);
    expect(result.cancelledCount).toBe(0);
  });

  it("uses latest observation time when revisions are unavailable, with equal-time conflicts unknown", () => {
    const input = fixture();
    input.operations = input.operations.map((row) => ({ ...row, revision: undefined }));
    const first = input.operations[0];
    input.operations.push({ ...first, status: "cancelled", observedAt: "2026-09-15T14:00:00Z" });
    expect(calculateCancellationHistory(input).cancelledCount).toBe(1);
    input.operations.push({ ...first, status: "operated", observedAt: "2026-09-15T14:00:00Z" });
    const result = calculateCancellationHistory(input);
    expect(result.cancelledCount).toBe(0);
    expect(result.conflictingCount).toBe(1);
    expect(result.knownCount).toBe(19);
  });

  it("invalidates complete-roster claims contradicted by matching in-window observations", () => {
    const input = fixture();
    input.roster!.expected.shift();
    const result = calculateCancellationHistory(input);
    expect(result.category).toBe("unknown");
    expect(result.cancellationRate).toBeNull();
    expect(result.expectedCount).toBeNull();
    expect(result.coverage).toBeNull();
    expect(result.knownCount).toBe(20);
    expect(result.reasons).toContain("invalid-matching-data");
  });

  it("degrades malformed matching history to unknown while retaining valid diagnostics", () => {
    const input = fixture();
    input.operations[0] = { ...input.operations[0], status: "invalid" as FlightOperation["status"] };
    const result = calculateCancellationHistory(input);
    expect(result.category).toBe("unknown");
    expect(result.cancellationRate).toBeNull();
    expect(result.knownCount).toBe(19);
    expect(result.unknownCount).toBe(1);
    expect(result.reasons).toContain("invalid-matching-data");
  });

  it("is deterministic under provider reordering without mutating inputs", () => {
    const input = fixture();
    input.operations.push({ ...input.operations[0], status: "cancelled" });
    const original = structuredClone(input);
    const result = calculateCancellationHistory(input);
    const reordered = structuredClone(input);
    reordered.operations.reverse();
    reordered.roster!.expected.reverse();
    expect(calculateCancellationHistory(reordered)).toEqual(result);
    expect(input).toEqual(original);
  });
});

describe("connecting-flight history", () => {
  it("summarizes the worst known category only when all legs have sufficient evidence", () => {
    const low = calculateCancellationHistory(fixture(20));
    const high = calculateCancellationHistory(fixture(20, 5));
    const unknown = calculateCancellationHistory(fixture(9));
    expect(summarizeHistoricalRisk([low, high])).toBe("high");
    expect(summarizeHistoricalRisk([low, unknown])).toBe("unknown");
    expect(summarizeHistoricalRisk([high, unknown])).toBe("unknown");
    expect(summarizeHistoricalRisk([])).toBe("unknown");
    expect(historyUtility([unknown])).toBe(0.5);
    expect(historyUtility([low, unknown])).toBe(0.5);
    expect(historyUtility([high, unknown])).toBe(0);
  });
});
