import { describe, expect, it, vi } from "vitest";
import { createProviderAggregator } from "@/server/providers/aggregator";
import { ProviderError, type ProviderAdapter } from "@/server/providers/contracts";
import { descriptor, NOW, QUERY, testOffer } from "./provider-fixtures";
import type { ProviderId } from "@/domain/provider";

function adapter(id: ProviderId = "alibaba", search: ProviderAdapter["search"] = async () => [testOffer(id)]): ProviderAdapter {
  return { mode: "LIVE", provider: descriptor(id), readiness: { status: "connected", message: "Synthetic test adapter only", authorizationReference: "test-contract-not-real-access" }, search };
}
const options = { now: () => NOW, retryDelayMs: 10, wait: async () => {} };

describe("authorized aggregation orchestration with test transports", () => {
  it("does not call disconnected adapters or fabricate a fallback", async () => {
    const search = vi.fn();
    const a = adapter("alibaba", search); a.readiness = { status: "unverified", message: "No verified contract" };
    const b = adapter("flytoday", search); b.readiness = { status: "awaiting-credentials", message: "No credentials" };
    const result = await createProviderAggregator([a, b], options).aggregate(QUERY);
    expect(search).not.toHaveBeenCalled(); expect(result.offers).toEqual([]);
    expect(result.providers.map((p) => p.status)).toEqual(["unverified", "awaiting-credentials"]);
    expect(result.providers.every((p) => p.lastSuccessfulAt === null)).toBe(true);
  });
  it("requires an authorization reference even when configured connected", async () => {
    const search = vi.fn(); const a = adapter("alibaba", search); delete a.readiness.authorizationReference;
    expect((await createProviderAggregator([a], options).aggregate(QUERY)).providers[0].status).toBe("unverified");
    expect(search).not.toHaveBeenCalled();
  });
  it("returns partial results and sanitized source-specific failure statuses", async () => {
    const result = await createProviderAggregator([adapter(), adapter("flytoday", async () => { throw new Error("secret-key-123"); })], options).aggregate(QUERY);
    expect(result.offers).toHaveLength(1); expect(result.offers[0].providerId).toBe("alibaba");
    expect(result.providers.map((p) => p.status)).toEqual(["live", "error"]);
    expect(JSON.stringify(result)).not.toContain("secret-key-123");
  });
  it("preserves timestamp/source on cache hit, deduplicates in-flight queries, and copies outputs", async () => {
    let clock = NOW; const search = vi.fn(async () => { await Promise.resolve(); return [testOffer()]; });
    const service = createProviderAggregator([adapter("alibaba", search)], { ...options, now: () => clock, cacheTtlMs: 100 });
    const [a, b] = await Promise.all([service.aggregate(QUERY), service.aggregate(QUERY)]);
    expect(search).toHaveBeenCalledTimes(1); expect(a.providers[0].status).toBe("live");
    a.offers[0].totalPrice!.amountRials = 1;
    expect(b.offers[0].totalPrice!.amountRials).toBe(60_000_001);
    clock += 10; const c = await service.aggregate(QUERY);
    expect(c.providers[0].status).toBe("cached"); expect(Date.parse(c.offers[0].fetchedAt)).toBe(NOW);
    expect(c.providers[0].lastSuccessfulAt).toBe(new Date(NOW).toISOString());
    clock += 100; await service.aggregate(QUERY); expect(search).toHaveBeenCalledTimes(2);
  });
  it("does not conflate party, date, currency, or route in cache keys", async () => {
    const search = vi.fn(async () => []); const service = createProviderAggregator([adapter("alibaba", search)], options);
    await service.aggregate(QUERY); await service.aggregate({ ...QUERY, adults: 2 });
    await service.aggregate({ ...QUERY, departureDate: "2026-10-17" });
    await service.aggregate({ ...QUERY, destination: "DXB" });
    expect(search).toHaveBeenCalledTimes(4);
  });
  it("caches successful empty responses without inventing offers", async () => {
    const search = vi.fn(async () => []); const service = createProviderAggregator([adapter("alibaba", search)], options);
    const a = await service.aggregate(QUERY); const b = await service.aggregate(QUERY);
    expect(a.offers).toEqual([]); expect(a.providers[0].status).toBe("live");
    expect(b.providers[0].status).toBe("cached"); expect(search).toHaveBeenCalledTimes(1);
  });
  it("times out a non-cooperative adapter, aborts its signal, and keeps other results", async () => {
    let signal: AbortSignal | undefined;
    const hanging = adapter("flytoday", async (_, context) => { signal = context.signal; return new Promise(() => {}); });
    const result = await createProviderAggregator([adapter(), hanging], { ...options, timeoutMs: 10 }).aggregate(QUERY);
    expect(result.providers[1].status).toBe("timeout"); expect(signal?.aborted).toBe(true); expect(result.offers).toHaveLength(1);
  });
  it("retries explicit transient failures with bounded exponential backoff", async () => {
    const wait = vi.fn(async () => {}); let attempts = 0;
    const search = vi.fn(async () => { if (++attempts < 3) throw new ProviderError("transient"); return [testOffer()]; });
    const result = await createProviderAggregator([adapter("alibaba", search)], { ...options, wait }).aggregate(QUERY);
    expect(search).toHaveBeenCalledTimes(3); expect(wait.mock.calls).toEqual([[10], [20]]);
    expect(result.providers[0].status).toBe("live");
  });
  it.each(["auth", "forbidden", "invalid-data"] as const)("does not retry %s", async (code) => {
    const search = vi.fn(async () => { throw new ProviderError(code); });
    await createProviderAggregator([adapter("alibaba", search)], options).aggregate(QUERY);
    expect(search).toHaveBeenCalledTimes(1);
  });
  it("honors rate-limit cooldown across different queries without rotating access", async () => {
    let clock = NOW; const search = vi.fn(async () => { throw new ProviderError("rate-limited", 120_000); });
    const service = createProviderAggregator([adapter("alibaba", search)], { ...options, now: () => clock });
    await service.aggregate(QUERY); await service.aggregate({ ...QUERY, adults: 2 });
    clock += 60_001; await service.aggregate(QUERY); expect(search).toHaveBeenCalledTimes(1);
    clock += 60_000; await service.aggregate(QUERY); expect(search).toHaveBeenCalledTimes(2);
  });
  it("never serves stale offers after expiration and a failed refresh", async () => {
    let clock = NOW; let success = true;
    const service = createProviderAggregator([adapter("alibaba", async () => { if (!success) throw new Error("fail"); return [testOffer()]; })], { ...options, now: () => clock, cacheTtlMs: 5 });
    await service.aggregate(QUERY); success = false; clock += 6;
    const response = await service.aggregate(QUERY);
    expect(response.offers).toEqual([]); expect(response.providers[0].status).toBe("error");
    expect(response.providers[0].lastSuccessfulAt).toBe(new Date(NOW).toISOString());
  });
  it("rejects synthetic, mismatched, malformed or stale adapter payloads", async () => {
    for (const row of [testOffer("flytoday"), { ...testOffer(), source: { mode: "demo" } }, { ...testOffer(), fetchedAt: "2026-10-15T11:00:00Z" }, { bad: true }]) {
      const result = await createProviderAggregator([adapter("alibaba", async () => [row])], options).aggregate(QUERY);
      expect(result.offers).toEqual([]); expect(result.providers[0].status).toBe("error");
    }
  });
  it("evicts bounded cache entries instead of retaining unbounded inventory", async () => {
    const search = vi.fn(async () => []); const service = createProviderAggregator([adapter("alibaba", search)], { ...options, maxEntries: 1 });
    await service.aggregate(QUERY); await service.aggregate({ ...QUERY, adults: 2 }); await service.aggregate(QUERY);
    expect(search).toHaveBeenCalledTimes(3);
  });
});

describe("interview deadlines, mode isolation and parallelism", () => {
  it("starts all four provider searches before any completes", async () => {
    const started: string[] = [];
    const resolvers: (() => void)[] = [];
    const ids: ProviderId[] = ["alibaba", "flytoday", "safarmarket", "snapptrip"];
    const service = createProviderAggregator(ids.map((id) => adapter(id, async () => {
      started.push(id);
      await new Promise<void>((resolve) => resolvers.push(resolve));
      return [testOffer(id)];
    })), options);
    const pending = service.aggregate(QUERY);
    await vi.waitFor(() => expect(started).toHaveLength(4));
    resolvers.forEach((resolve) => resolve());
    const result = await pending;
    expect(result.offers).toHaveLength(4);
    expect(result.providers.every((provider) => provider.sourceState === "LIVE")).toBe(true);
  });
  it("aborts at the default 6-second total deadline", async () => {
    vi.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const service = createProviderAggregator([adapter("alibaba", async (_, context) => {
        signal = context.signal; return new Promise(() => {});
      })], options);
      const promise = service.aggregate(QUERY);
      await vi.advanceTimersByTimeAsync(5999); expect(signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      const result = await promise;
      expect(result.providers[0]).toMatchObject({ status: "timeout", sourceState: "UNAVAILABLE", fetchedAt: null });
      expect(signal?.aborted).toBe(true);
    } finally { vi.useRealTimers(); }
  });
  it("includes backoff/retries in one deadline and never starts a late retry", async () => {
    vi.useFakeTimers();
    try {
      const search = vi.fn(async () => { await new Promise((resolve) => setTimeout(resolve, 5900)); throw new ProviderError("transient"); });
      const service = createProviderAggregator([adapter("alibaba", search)], { now: () => NOW });
      const promise = service.aggregate(QUERY);
      await vi.advanceTimersByTimeAsync(6000);
      expect((await promise).providers[0].status).toBe("timeout");
      await vi.advanceTimersByTimeAsync(1000);
      expect(search).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it("uses exactly 60 seconds of cache and preserves real retrieval provenance", async () => {
    let clock = NOW;
    const search = vi.fn(async () => [testOffer("alibaba", { fetchedAt: new Date(clock).toISOString() })]);
    const service = createProviderAggregator([adapter("alibaba", search)], { ...options, now: () => clock });
    const first = await service.aggregate(QUERY);
    clock += 59_999;
    const hit = await service.aggregate(QUERY);
    expect(hit.providers[0]).toMatchObject({ sourceState: "LIVE", status: "cached", cache: "hit" });
    expect(hit.offers[0].fetchedAt).toBe(first.offers[0].fetchedAt);
    clock++;
    expect((await service.aggregate(QUERY)).providers[0].status).toBe("live");
    expect(search).toHaveBeenCalledTimes(2);
  });
  it("isolates fixture and live cache/inflight work for the same provider/query", async () => {
    const source = { mode: "demo" as const, id: "test-offline-v1", label: "Offline test data" };
    const offlineSearch = vi.fn(async () => [testOffer("alibaba", { sourceState: "FIXTURE", source })]);
    const offline: ProviderAdapter = { provider: descriptor(), mode: "FIXTURE", fixture: { source, asOf: new Date(NOW).toISOString() }, readiness: { status: "fixture", message: "Test offline" }, search: offlineSearch };
    const liveSearch = vi.fn(async () => [testOffer()]);
    const service = createProviderAggregator([adapter("alibaba", liveSearch), offline], options);
    const [live, fixture] = await Promise.all([service.aggregate(QUERY), service.aggregate(QUERY, "FIXTURE")]);
    expect(live.providers[0].sourceState).toBe("LIVE");
    expect(fixture.providers[0]).toMatchObject({ sourceState: "FIXTURE", status: "fixture", lastSuccessfulAt: null });
    const hit = await service.aggregate(QUERY, "FIXTURE");
    expect(hit.providers[0]).toMatchObject({ sourceState: "FIXTURE", status: "fixture", cache: "hit" });
    expect(liveSearch).toHaveBeenCalledTimes(1); expect(offlineSearch).toHaveBeenCalledTimes(1);
    const attemptedMix = await createProviderAggregator([adapter("alibaba", offlineSearch)], options).aggregate(QUERY);
    expect(attemptedMix.offers).toEqual([]); expect(attemptedMix.providers[0].sourceState).toBe("UNAVAILABLE");
  });
});
