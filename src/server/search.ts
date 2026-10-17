import "server-only";
import { Temporal } from "@js-temporal/polyfill";
import { searchFlights, type SearchMode, type SearchRequest, type SearchResponse } from "@/application/search-service";
import { searchUnpricedReferenceOffers } from "@/application/reference-search";
import { groupFlightOffers } from "@/application/normalize-offers";
import { isPricedFlightOffer, type UnpricedFlightOffer } from "@/domain/provider";
import { ALIBABA_REFERENCE_MANIFEST } from "@/fixtures/alibaba/manifest";
import { providerAggregator, fixtureProviderAggregator } from "./providers/registry";
import { ValidationError } from "./validation";
import { DEFAULT_SEARCH_MODE } from "@/application/search-mode";
import { DEMO_DATE_BOUNDS, isSupportedDemoDate } from "@/domain/demo-date";

export function liveDateBounds() {
  const today = Temporal.Now.plainDateISO("Asia/Tehran");
  return { min: today.toString(), max: today.add({ days: 365 }).toString() };
}

export function defaultSearchRequest(mode: SearchMode = DEFAULT_SEARCH_MODE): SearchRequest {
  const tomorrow = Temporal.Now.plainDateISO("Asia/Tehran").add({ days: 1 }).toString();
  const departureDate = mode === "fixture" ? "2026-10-15" : mode === "demo" && !isSupportedDemoDate(tomorrow) ? DEMO_DATE_BOUNDS.min : tomorrow;
  return { query: { origin: mode === "live" ? "IKA" : "THR", destination: mode === "live" ? "IST" : "MHD", departureDate, adults: 1, currency: "IRR" }, filters: {}, sort: "recommended", mode };
}

export async function executeSearch(request: SearchRequest): Promise<SearchResponse> {
  request = { ...request, mode: request.mode ?? DEFAULT_SEARCH_MODE };
  if (request.mode === "demo") {
    if (!isSupportedDemoDate(request.query.departureDate)) throw new ValidationError("تاریخ خارج از بازه تقویم آزمایشی است.", { code: "UNSUPPORTED_DEMO_DATE", status: 422 });
    const result = searchFlights(request);
    return { ...result, freshness: "demo", dateBounds: { ...DEMO_DATE_BOUNDS } };
  }
  const fixture = request.mode === "fixture";
  if (fixture && (request.sort === "price" || request.sort === "history")) throw new ValidationError("واحد مبلغ و سوابق عملیاتی تأیید نشده؛ مرتب‌سازی قیمت یا سابقه لغو در پاسخ مرجع پشتیبانی نمی‌شود.", { code: "UNSUPPORTED_FIXTURE_SORT", status: 422 });
  const dateBounds = fixture ? { min: "2026-10-15", max: "2026-10-15" } : liveDateBounds();
  if (fixture && !ALIBABA_REFERENCE_MANIFEST.routes.some((route) => route.origin === request.query.origin && route.destination === request.query.destination && route.departureDates.some((date) => date === request.query.departureDate))) throw new ValidationError("مسیر و تاریخ در پاسخ مرجع موجود نیست؛ جایگزینی انجام نشد.", { code: "UNSUPPORTED_FIXTURE_QUERY", status: 422 });
  if (!fixture && (request.query.departureDate < dateBounds.min || request.query.departureDate > dateBounds.max)) throw new ValidationError("تاریخ رفت باید از امروز تا یک سال آینده باشد.", { code: "UNSUPPORTED_SEARCH_DATE", status: 422 });
  const aggregation = await (fixture ? fixtureProviderAggregator.aggregate(request.query, "FIXTURE") : providerAggregator.aggregate(request.query));
  const active = aggregation.providers.filter((provider) => provider.status === "live" || provider.status === "cached" || provider.status === "fixture");
  const times = active.map((provider) => provider.lastSuccessfulAt).filter((time): time is string => time !== null).sort();
  const source = fixture ? { mode: "demo" as const, id: ALIBABA_REFERENCE_MANIFEST.id, label: ALIBABA_REFERENCE_MANIFEST.label } : { mode: "live" as const, id: "provider-aggregation", label: "جست‌وجوی منابع مجاز" };
  const response = searchFlights(request, groupFlightOffers(aggregation.offers.filter(isPricedFlightOffer), aggregation.freshnessByProvider), {
    source, asOf: fixture ? ALIBABA_REFERENCE_MANIFEST.importedAt : aggregation.queriedAt, supportedDates: fixture ? ["2026-10-15"] : [],
  });
  const unpriced = aggregation.offers.filter((offer): offer is UnpricedFlightOffer => !isPricedFlightOffer(offer));
  const unpricedFlights = searchUnpricedReferenceOffers(unpriced, request);
  return { ...response, mode: request.mode ?? "live", sourceState: active.length === 0 ? "UNAVAILABLE" : fixture ? "FIXTURE" : "LIVE",
    totalBeforeFilters: response.totalBeforeFilters + searchUnpricedReferenceOffers(unpriced, { ...request, filters: {} }).length,
    source: active.length === 0 ? { mode: "unavailable", id: "provider-aggregation", label: "موجودی واقعی در دسترس نیست" } : response.source,
    providers: aggregation.providers, dateBounds, lastSuccessfulAt: times.at(-1) ?? null, unpricedFlights,
    warnings: fixture ? ["پاسخ مرجع آفلاین است. واحد مبلغ، زمان دریافت اصلی و کامل بودن هزینه‌ها تأیید نشده؛ قیمت به تومان تبدیل نمی‌شود. ردیف‌های بدون قیمت تأییدشده از سقف قیمت و امتیازدهی قیمتی خارج‌اند."] : [],
    freshness: active.length === 0 ? "unavailable" : fixture ? "demo" : active.every((provider) => provider.status === "cached") ? "cached" : active.every((provider) => provider.status === "live") ? "live" : "mixed" };
}
