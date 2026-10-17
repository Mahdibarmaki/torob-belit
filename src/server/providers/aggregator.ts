import type { FlightSearchInput } from "@/domain/models";
import type { NormalizedFlightOffer, ProviderId, ProviderStatus } from "@/domain/provider";
import { normalizeFlightOffer } from "@/application/normalize-offers";
import { ProviderError, type ProviderAdapter } from "./contracts";

interface Options {
  now?: () => number;
  wait?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
  cacheTtlMs?: number;
  maxEntries?: number;
  retryDelayMs?: number;
}
export const PROVIDER_TIMEOUT_MS = 6000;
export const PROVIDER_CACHE_TTL_MS = 60_000;
export interface AggregationResult {
  offers: NormalizedFlightOffer[];
  providers: ProviderStatus[];
  queriedAt: string;
  freshnessByProvider: Partial<Record<ProviderId, "live" | "cached" | "fixture">>;
}
interface ProviderResult { offers: NormalizedFlightOffer[]; status: ProviderStatus }
interface CacheEntry { result: ProviderResult; expires: number }
class DeadlineError extends Error {}

/** Server orchestration. A provider's entire retry workflow shares one deadline. */
export function createProviderAggregator(adapters: readonly ProviderAdapter[], options: Options = {}) {
  const now = options.now ?? Date.now;
  const timeoutMs = Math.max(1, Math.min(options.timeoutMs ?? PROVIDER_TIMEOUT_MS, 10_000));
  const cacheTtlMs = Math.max(0, Math.min(options.cacheTtlMs ?? PROVIDER_CACHE_TTL_MS, 60_000));
  const maxEntries = Math.max(1, Math.min(options.maxEntries ?? 200, 1000));
  const retryDelayMs = Math.max(0, Math.min(options.retryDelayMs ?? 250, 1000));
  const cache = new Map<string, CacheEntry>();
  const pending = new Map<string, Promise<ProviderResult>>();
  const cooldowns = new Map<ProviderId, number>();
  if (new Set(adapters.map((adapter) => `${adapter.mode}:${adapter.provider.id}`)).size !== adapters.length) throw new Error("Duplicate provider registry entry.");

  async function backoff(ms: number, signal: AbortSignal) {
    if (signal.aborted) throw new DeadlineError();
    if (options.wait) await options.wait(ms);
    else await new Promise<void>((resolve, reject) => {
      const finish = () => { signal.removeEventListener("abort", abort); resolve(); };
      const timer = setTimeout(finish, ms);
      const abort = () => { clearTimeout(timer); reject(new DeadlineError()); };
      signal.addEventListener("abort", abort, { once: true });
    });
    if (signal.aborted) throw new DeadlineError();
  }

  async function attempt(adapter: ProviderAdapter, query: FlightSearchInput, signal: AbortSignal): Promise<NormalizedFlightOffer[]> {
    if (signal.aborted) throw new DeadlineError();
    const rows = await adapter.search(structuredClone(query), { signal });
    if (signal.aborted) throw new DeadlineError();
    if (!Array.isArray(rows) || rows.length > 2000) throw new ProviderError("invalid-data");
    const retrievedAt = new Date(now()).toISOString();
    try {
      const offers = adapter.mode === "FIXTURE"
        ? rows.map((row) => normalizeFlightOffer(row, adapter.provider, query, retrievedAt, adapter.fixture!.source))
        : rows.map((row) => normalizeFlightOffer(row, adapter.provider, query, retrievedAt));
      if (adapter.mode === "LIVE" && offers.some((offer) => now() - Date.parse(offer.fetchedAt) > 60_000)) throw new ProviderError("invalid-data");
      if (adapter.mode === "FIXTURE" && offers.some((offer) => Date.parse(offer.fetchedAt) !== Date.parse(adapter.fixture!.asOf))) throw new ProviderError("invalid-data");
      return offers;
    } catch { throw new ProviderError("invalid-data"); }
  }

  function base(adapter: ProviderAdapter): ProviderStatus {
    return { id: adapter.provider.id, name: adapter.provider.name, sourceState: "UNAVAILABLE", cache: "none", status: "unverified", message: "اتصال تأیید نشده است.", fetchedAt: null, lastSuccessfulAt: null, offerCount: 0, missingRequirements: [...(adapter.readiness.missingRequirements ?? [])] };
  }

  async function retrieve(adapter: ProviderAdapter, query: FlightSearchInput, previous: CacheEntry | undefined): Promise<ProviderResult> {
    const status = base(adapter);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const work = async () => {
        for (let index = 0; ; index++) {
          try { return await attempt(adapter, query, controller.signal); }
          catch (error) {
            if (controller.signal.aborted) throw new DeadlineError();
            if (!(error instanceof ProviderError && error.code === "transient") || index === 2) throw error;
            await backoff(retryDelayMs * 2 ** index, controller.signal);
          }
        }
      };
      const offers = await Promise.race([
        work(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new DeadlineError()); }, timeoutMs); }),
      ]);
      if (adapter.mode === "FIXTURE") return { offers, status: { ...status, sourceState: "FIXTURE", cache: "miss", status: "fixture", message: "پاسخ ذخیره‌شده مرجع برای دمو؛ موجودی و قیمت زنده نیست.", fetchedAt: adapter.fixture!.asOf, offerCount: offers.length } };
      const fetchedAt = new Date(now()).toISOString();
      return { offers, status: { ...status, sourceState: "LIVE", cache: "miss", status: "live", message: offers.length ? "دریافت مستقیم از منبع مجاز" : "منبع پاسخ داد؛ پیشنهادی برای این جست‌وجو برنگرداند.", fetchedAt, lastSuccessfulAt: fetchedAt, offerCount: offers.length } };
    } catch (failure) {
      const rateLimited = failure instanceof ProviderError && failure.code === "rate-limited";
      if (rateLimited && adapter.mode === "LIVE") {
        const requested = failure.retryAfterMs;
        cooldowns.set(adapter.provider.id, now() + (requested !== undefined && Number.isFinite(requested) && requested >= 0 ? Math.max(60_000, requested) : 60_000));
      }
      const timeout = failure instanceof DeadlineError;
      return { offers: [], status: { ...status, status: rateLimited ? "rate-limited" : timeout ? "timeout" : "error", message: rateLimited ? "محدودیت درخواست منبع؛ دریافت متوقف شد." : timeout ? "مهلت پاسخ منبع تمام شد." : "دریافت معتبر از منبع انجام نشد.", lastSuccessfulAt: previous?.result.status.lastSuccessfulAt ?? null } };
    } finally { if (timer) clearTimeout(timer); }
  }

  async function providerSearch(adapter: ProviderAdapter, query: FlightSearchInput): Promise<ProviderResult> {
    const fixtureReady = adapter.mode === "FIXTURE" && adapter.readiness.status === "fixture" && adapter.fixture?.source.mode === "demo";
    const liveReady = adapter.mode === "LIVE" && adapter.readiness.status === "connected" && Boolean(adapter.readiness.authorizationReference?.trim());
    if (!fixtureReady && !liveReady) {
      const status = adapter.readiness.status === "connected" || adapter.readiness.status === "fixture" ? "unverified" : adapter.readiness.status;
      return { offers: [], status: { ...base(adapter), status, message: adapter.readiness.status === "connected" ? "مجوز اتصال بررسی نشده است." : adapter.readiness.message } };
    }
    const key = JSON.stringify([adapter.mode, adapter.provider.id, adapter.fixture?.source.id ?? adapter.readiness.authorizationReference, adapter.fixture?.asOf ?? null, query.origin, query.destination, query.departureDate, query.adults, query.currency]);
    const previous = cache.get(key);
    if (previous && previous.expires > now()) return structuredClone({ offers: previous.result.offers, status: { ...previous.result.status, cache: "hit" as const, status: adapter.mode === "FIXTURE" ? "fixture" as const : "cached" as const, message: adapter.mode === "FIXTURE" ? "پاسخ مرجع دمو از حافظه؛ داده زنده نیست." : "پاسخ ذخیره‌شده؛ دریافت زنده جدید نیست." } });
    if (adapter.mode === "LIVE" && (cooldowns.get(adapter.provider.id) ?? 0) > now()) return { offers: [], status: { ...base(adapter), status: "rate-limited", message: "دریافت تا پایان مهلت محدودیت منبع متوقف است.", lastSuccessfulAt: previous?.result.status.lastSuccessfulAt ?? null } };
    const inflight = pending.get(key);
    if (inflight) return structuredClone(await inflight);
    if (pending.size >= maxEntries) return { offers: [], status: { ...base(adapter), status: "error", message: "ظرفیت دریافت هم‌زمان تکمیل است؛ دوباره تلاش کنید." } };
    const promise = retrieve(adapter, query, previous);
    pending.set(key, promise);
    try {
      const result = await promise;
      if (result.status.status === "live" || result.status.status === "fixture") {
        cache.delete(key); cache.set(key, { result: structuredClone(result), expires: now() + cacheTtlMs });
        while (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
      }
      return structuredClone(result);
    } finally { pending.delete(key); }
  }

  return {
    async aggregate(query: FlightSearchInput, mode: "LIVE" | "FIXTURE" = "LIVE"): Promise<AggregationResult> {
      const queriedAt = new Date(now()).toISOString();
      const results = await Promise.all(adapters.filter((adapter) => adapter.mode === mode).map((adapter) => providerSearch(adapter, query)));
      const freshnessByProvider: AggregationResult["freshnessByProvider"] = {};
      for (const result of results) if (["live", "cached", "fixture"].includes(result.status.status)) freshnessByProvider[result.status.id] = result.status.status as "live" | "cached" | "fixture";
      return { offers: results.flatMap((result) => result.offers), providers: results.map((result) => result.status), queriedAt, freshnessByProvider };
    },
  };
}
