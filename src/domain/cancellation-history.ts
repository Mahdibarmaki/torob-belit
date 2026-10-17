import type {
  CancellationHistory,
  CancellationHistoryInput,
  FlightIdentity,
  FlightOperation,
  HistoricalRiskCategory,
  ScheduledOperation,
  UnknownHistoryReason,
} from "./models";
import { CANCELLATION_HISTORY_POLICY } from "./policies";
import { instantIsAfter, instantIsInWindow, parseUtcInstant, previousCompletedDaysWindow } from "./time";

export function normalizeFlightIdentity(identity: FlightIdentity): FlightIdentity {
  const values = [identity.airlineId, identity.flightNumber, identity.origin, identity.destination];
  if (values.some((value) => typeof value !== "string" || !value.trim())) {
    throw new RangeError("Complete operating-flight identity is required.");
  }
  return {
    airlineId: identity.airlineId.trim(),
    flightNumber: identity.flightNumber.replace(/\s+/g, "").toUpperCase(),
    origin: identity.origin.trim().toUpperCase(),
    destination: identity.destination.trim().toUpperCase(),
  };
}

export function flightIdentityKey(identity: FlightIdentity): string {
  const value = normalizeFlightIdentity(identity);
  return JSON.stringify([value.airlineId, value.flightNumber, value.origin, value.destination]);
}

interface NormalizedObservation {
  key: string;
  operationId: string;
  originalScheduledDepartureAt: string;
  observedAt: string;
  status: FlightOperation["status"];
  revision?: number;
}

interface OutcomeGroup {
  observations: NormalizedObservation[];
  unresolved: boolean;
  conflicting: boolean;
}

function emptyGroup(): OutcomeGroup {
  return { observations: [], unresolved: false, conflicting: false };
}

function operationKey(identityKey: string, originalScheduledDepartureAt: string): string {
  return JSON.stringify([identityKey, originalScheduledDepartureAt]);
}

function stringCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function resolveGroup(group: OutcomeGroup): { status: FlightOperation["status"]; conflicting: boolean } {
  if (group.unresolved || group.conflicting) {
    return { status: "unknown", conflicting: group.conflicting };
  }
  const rows = group.observations;
  const hasRevisions = rows.some((row) => row.revision !== undefined);
  const hasUnversionedRows = rows.some((row) => row.revision === undefined);
  // Incomparable revision schemes need an adapter mapping rather than a guessed priority.
  if (hasRevisions && hasUnversionedRows) return { status: "unknown", conflicting: true };

  let authoritative: NormalizedObservation[];
  if (hasRevisions) {
    const revision = Math.max(...rows.map((row) => row.revision!));
    authoritative = rows.filter((row) => row.revision === revision);
  } else {
    const latest = rows.reduce((current, row) => (
      instantIsAfter(row.observedAt, current) ? row.observedAt : current
    ), rows[0].observedAt);
    authoritative = rows.filter((row) => row.observedAt === latest);
  }
  const statuses = new Set(authoritative.map((row) => row.status));
  return statuses.size === 1
    ? { status: authoritative[0].status, conflicting: false }
    : { status: "unknown", conflicting: true };
}

/**
 * Retrospective observed cancellation frequency; never a future-flight prediction.
 * Invalid history returns unknown while preserving valid diagnostic evidence.
 * Invalid request-level identity, reference instant, or zone throws for boundary validation.
 */
export function calculateCancellationHistory(input: CancellationHistoryInput): CancellationHistory {
  const identity = normalizeFlightIdentity(input.identity);
  const identityKey = flightIdentityKey(identity);
  const asOf = parseUtcInstant(input.asOf).toString();
  const window = previousCompletedDaysWindow(asOf, input.originTimeZone);
  const warnings = new Set<string>();
  const expectedKeys = new Set<string>();
  const rosterIds = new Map<string, string>();
  let invalidData = false;
  let rosterTrusted = input.roster?.verified === true;

  const invalidate = (message: string): void => {
    invalidData = true;
    warnings.add(message);
  };

  const normalizeScheduled = (row: ScheduledOperation): { key: string; original: string } | null => {
    if (flightIdentityKey(row) !== identityKey) return null;
    const original = parseUtcInstant(row.originalScheduledDepartureAt).toString();
    if (!instantIsInWindow(original, window)) return null;
    if (typeof row.operationId !== "string" || !row.operationId.trim()) {
      throw new RangeError("A canonical operation ID is required.");
    }
    return { key: operationKey(identityKey, original), original };
  };

  if (input.roster?.asOf !== undefined) {
    try {
      if (instantIsAfter(input.roster.asOf, asOf)) {
        rosterTrusted = false;
        invalidate("The expected-operation roster was recorded after the reference instant.");
      }
    } catch {
      rosterTrusted = false;
      invalidate("The expected-operation roster has an invalid snapshot timestamp.");
    }
  }

  for (const row of input.roster?.expected ?? []) {
    try {
      const normalized = normalizeScheduled(row);
      if (!normalized) continue;
      const id = row.operationId.trim();
      const previous = rosterIds.get(id);
      if (previous !== undefined && previous !== normalized.key) {
        rosterTrusted = false;
        invalidate("A roster operation ID has conflicting original scheduled departures.");
      }
      rosterIds.set(id, normalized.key);
      expectedKeys.add(normalized.key);
    } catch {
      rosterTrusted = false;
      invalidate("A matching expected operation is malformed.");
    }
  }

  const observations: NormalizedObservation[] = [];
  const unresolvedRosterKeys = new Set<string>();
  for (const row of input.operations) {
    try {
      if (flightIdentityKey(row) !== identityKey) continue;
      // Apply the knowledge cutoff before considering status or schedule revisions.
      const observedAt = parseUtcInstant(row.observedAt).toString();
      if (instantIsAfter(observedAt, asOf)) {
        warnings.add("Observations recorded after the reference instant were excluded.");
        continue;
      }
      const normalized = normalizeScheduled(row);
      if (!normalized) continue;
      if (!["operated", "cancelled", "unknown"].includes(row.status)) {
        throw new RangeError("Invalid operation outcome.");
      }
      if (row.revision !== undefined && (!Number.isSafeInteger(row.revision) || row.revision < 0)) {
        throw new RangeError("Invalid operation revision.");
      }
      observations.push({
        key: normalized.key,
        operationId: row.operationId.trim(),
        originalScheduledDepartureAt: normalized.original,
        observedAt,
        status: row.status,
        revision: row.revision,
      });
    } catch {
      invalidate("A matching operation observation is malformed.");
      const key = typeof row?.operationId === "string" ? rosterIds.get(row.operationId.trim()) : undefined;
      if (key !== undefined) unresolvedRosterKeys.add(key);
    }
  }

  // Exact in-window observations missing from a complete roster contradict its completeness.
  if (rosterTrusted && observations.some((row) => !expectedKeys.has(row.key) && !rosterIds.has(row.operationId))) {
    rosterTrusted = false;
    invalidate("Matching observations are absent from the supposedly complete expected roster.");
  }

  observations.sort((left, right) => (
    stringCompare(left.key, right.key)
    || stringCompare(left.operationId, right.operationId)
    || stringCompare(left.observedAt, right.observedAt)
    || stringCompare(left.status, right.status)
  ));
  const groups = new Map<string, OutcomeGroup>();
  if (rosterTrusted) {
    for (const key of expectedKeys) groups.set(key, emptyGroup());
  }
  const ids = rosterTrusted ? new Map(rosterIds) : new Map<string, string>();
  for (const row of observations) {
    const previousKey = ids.get(row.operationId);
    const key = previousKey ?? row.key;
    const group = groups.get(key) ?? emptyGroup();
    if (previousKey !== undefined && previousKey !== row.key) {
      group.conflicting = true;
      invalidate("An operation ID has conflicting original scheduled departures.");
    }
    group.observations.push(row);
    groups.set(key, group);
    ids.set(row.operationId, key);
  }
  if (rosterTrusted) {
    for (const key of unresolvedRosterKeys) {
      const group = groups.get(key);
      if (group) group.unresolved = true;
    }
  }

  let cancelledCount = 0;
  let operatedCount = 0;
  let unknownCount = 0;
  let missingCount = 0;
  let conflictingCount = 0;
  for (const group of groups.values()) {
    if (group.observations.length === 0 && !group.unresolved) {
      missingCount += 1;
      continue;
    }
    const outcome = resolveGroup(group);
    if (outcome.status === "cancelled") cancelledCount += 1;
    else if (outcome.status === "operated") operatedCount += 1;
    else unknownCount += 1;
    if (outcome.conflicting) conflictingCount += 1;
  }

  const knownCount = cancelledCount + operatedCount;
  const expectedCount = rosterTrusted ? expectedKeys.size : null;
  const observedRate = knownCount > 0 ? cancelledCount / knownCount : null;
  const coverage = expectedCount !== null && expectedCount > 0 ? knownCount / expectedCount : null;
  const reasons: UnknownHistoryReason[] = [];
  if (invalidData) reasons.push("invalid-matching-data");
  if (!rosterTrusted) reasons.push("unverified-roster");
  if (expectedCount === 0) reasons.push("no-expected-operations");
  if (knownCount === 0) reasons.push("no-known-outcomes");
  if (knownCount < CANCELLATION_HISTORY_POLICY.minimumKnownOperations) reasons.push("insufficient-sample");
  if (expectedCount !== null && expectedCount > 0
    && knownCount * 100 < expectedCount * CANCELLATION_HISTORY_POLICY.minimumCoveragePercent) {
    reasons.push("low-coverage");
  }
  if (rosterTrusted && expectedCount !== knownCount + unknownCount + missingCount) {
    reasons.push("invalid-matching-data");
    warnings.add("Expected-operation counts do not reconcile.");
  }

  const sufficient = reasons.length === 0 && observedRate !== null;
  const category: HistoricalRiskCategory = !sufficient ? "unknown"
    : cancelledCount * 100 < knownCount * CANCELLATION_HISTORY_POLICY.lowUpperPercent ? "low"
      : cancelledCount * 100 < knownCount * CANCELLATION_HISTORY_POLICY.mediumUpperPercent ? "medium" : "high";

  return {
    ...(input.segmentId !== undefined ? { segmentId: input.segmentId } : {}),
    identity,
    asOf,
    source: { ...input.source },
    window,
    expectedCount,
    cancelledCount,
    operatedCount,
    knownCount,
    unknownCount,
    missingCount: rosterTrusted ? missingCount : null,
    conflictingCount,
    coverage,
    cancellationRate: sufficient ? observedRate : null,
    observedRate,
    category,
    reasons: [...new Set(reasons)],
    warnings: [...warnings].sort(),
    policyVersion: CANCELLATION_HISTORY_POLICY.version,
  };
}

export function summarizeHistoricalRisk(histories: readonly CancellationHistory[]): HistoricalRiskCategory {
  if (histories.length === 0 || histories.some((history) => history.category === "unknown")) return "unknown";
  if (histories.some((history) => history.category === "high")) return "high";
  if (histories.some((history) => history.category === "medium")) return "medium";
  return "low";
}

/** An explicit preference heuristic, not a risk estimate. Unknown evidence is neutral. */
export function historyRiskUtility(category: HistoricalRiskCategory): number {
  return category === "low" ? 1 : category === "high" ? 0 : 0.5;
}

export function historyUtility(histories: readonly CancellationHistory[]): number {
  return histories.length === 0 ? 0.5 : Math.min(...histories.map((history) => historyRiskUtility(history.category)));
}
