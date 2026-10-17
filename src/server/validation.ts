import type { HistoricalRiskCategory } from "../domain/models";
import { parseLocalDate } from "../domain/time";
import { formatJalaliDate } from "../domain/jalali";
import type { SearchFilters, SearchMode, SearchRequest, SearchSort } from "../application/search-service";
import { AIRPORTS } from "../data/airports";
import { ALIBABA_REFERENCE_MANIFEST } from "../fixtures/alibaba/manifest";
import { DEMO_DATE_BOUNDS, isSupportedDemoDate } from "../domain/demo-date";
import { DEFAULT_SEARCH_MODE } from "../application/search-mode";

export interface ValidationField { field: string; message: string }

export class ValidationError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields?: ValidationField[];

  constructor(message: string, options: { code?: string; status?: number; fields?: ValidationField[] } = {}) {
    super(message);
    this.name = "ValidationError";
    this.code = options.code ?? "INVALID_REQUEST";
    this.status = options.status ?? 400;
    this.fields = options.fields;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reject(message: string, field: string): never {
  throw new ValidationError(message, { fields: [{ field, message }] });
}

function knownKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    reject("فیلد ناشناخته در درخواست جستجو وجود دارد.", field);
  }
}

function airport(value: unknown, field: string): string {
  if (typeof value !== "string") reject("کد فرودگاه معتبر را انتخاب کنید.", field);
  const normalized = value.trim().toUpperCase();
  if (!AIRPORTS.some((item) => item.code === normalized)) reject("این فرودگاه در فهرست فعلی جست‌وجو پشتیبانی نمی‌شود.", field);
  return normalized;
}

const SORTS: readonly SearchSort[] = ["recommended", "price", "duration", "departure", "history"];
const CATEGORIES: readonly HistoricalRiskCategory[] = ["low", "medium", "high", "unknown"];
const PERIODS: readonly NonNullable<SearchFilters["departurePeriod"]>[] = ["all", "morning", "afternoon", "evening"];

/** Runtime boundary schema; it accepts proposed filters, never executable preference text. */
export function validateSearchRequest(input: unknown, options: { mode?: SearchMode } = {}): SearchRequest {
  if (!record(input)) reject("بدنه درخواست باید یک شیء JSON باشد.", "request");
  knownKeys(input, ["query", "filters", "sort", "mode"], "request");
  if (input.mode !== undefined && input.mode !== "live" && input.mode !== "demo" && input.mode !== "fixture") reject("حالت داده معتبر نیست.", "mode");
  const mode = options.mode ?? (input.mode as SearchMode | undefined) ?? DEFAULT_SEARCH_MODE;
  if (!record(input.query)) reject("اطلاعات مسیر، تاریخ و مسافران لازم است.", "query");
  const query = input.query;
  knownKeys(query, ["origin", "destination", "departureDate", "adults", "currency"], "query");
  const origin = airport(query.origin, "query.origin");
  const destination = airport(query.destination, "query.destination");
  if (origin === destination) reject("مبدأ و مقصد باید متفاوت باشند.", "query.destination");
  if (typeof query.departureDate !== "string") reject("تاریخ انتخاب‌شده معتبر نیست.", "query.departureDate");
  try {
    parseLocalDate(query.departureDate);
  } catch {
    reject("تاریخ انتخاب‌شده در تقویم معتبر نیست.", "query.departureDate");
  }
  if (typeof query.adults !== "number" || !Number.isInteger(query.adults) || query.adults < 1 || query.adults > 9) {
    reject("تعداد بزرگسالان باید عدد صحیح بین ۱ و ۹ باشد.", "query.adults");
  }
  if (query.currency !== "IRR") reject("قیمت‌ها به تومان نمایش داده می‌شوند؛ واحد پول درخواست باید IRR باشد.", "query.currency");
  if (input.filters !== undefined && !record(input.filters)) reject("فیلترها باید یک شیء JSON باشند.", "filters");
  const rawFilters = input.filters ?? {};
  knownKeys(rawFilters, ["riskCategories", "minPriceRials", "maxPriceRials", "nonstopOnly", "checkedBagOnly", "airlineIds", "departurePeriod"], "filters");
  const filters: SearchFilters = {};
  if (rawFilters.minPriceRials !== undefined) {
    if (typeof rawFilters.minPriceRials !== "number" || !Number.isSafeInteger(rawFilters.minPriceRials) || rawFilters.minPriceRials < 0) {
      reject("حداقل قیمت باید عدد صحیح نامنفی در واحد ریال باشد.", "filters.minPriceRials");
    }
    filters.minPriceRials = rawFilters.minPriceRials;
  }
  if (rawFilters.maxPriceRials !== undefined) {
    if (typeof rawFilters.maxPriceRials !== "number" || !Number.isSafeInteger(rawFilters.maxPriceRials) || rawFilters.maxPriceRials < 0) {
      reject("سقف قیمت تومان باید پیش از ارسال، به عدد صحیح نامنفی در واحد ریال تبدیل شود.", "filters.maxPriceRials");
    }
    filters.maxPriceRials = rawFilters.maxPriceRials;
  }
  if (filters.minPriceRials !== undefined && filters.maxPriceRials !== undefined && filters.minPriceRials > filters.maxPriceRials) {
    reject("حداقل قیمت نباید از حداکثر قیمت بیشتر باشد.", "filters.minPriceRials");
  }
  for (const key of ["nonstopOnly", "checkedBagOnly"] as const) {
    if (rawFilters[key] !== undefined) {
      if (typeof rawFilters[key] !== "boolean") reject("این فیلتر باید مقدار بولی داشته باشد.", `filters.${key}`);
      filters[key] = rawFilters[key];
    }
  }
  if (rawFilters.riskCategories !== undefined) {
    if (!Array.isArray(rawFilters.riskCategories) || rawFilters.riskCategories.length < 1 || rawFilters.riskCategories.length > 4
      || rawFilters.riskCategories.some((value) => typeof value !== "string" || !CATEGORIES.includes(value as HistoricalRiskCategory))) {
      reject("حداقل یک رده سابقه لغو معتبر انتخاب کنید.", "filters.riskCategories");
    }
    filters.riskCategories = [...new Set(rawFilters.riskCategories as HistoricalRiskCategory[])];
  }
  if (rawFilters.airlineIds !== undefined) {
    if (!Array.isArray(rawFilters.airlineIds) || rawFilters.airlineIds.length < 1 || rawFilters.airlineIds.length > 20
      || rawFilters.airlineIds.some((value) => typeof value !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value))) {
      reject("شناسه‌های محدود و معتبر شرکت هواپیمایی لازم است.", "filters.airlineIds");
    }
    filters.airlineIds = [...new Set(rawFilters.airlineIds as string[])];
  }
  if (rawFilters.departurePeriod !== undefined) {
    if (typeof rawFilters.departurePeriod !== "string" || !PERIODS.includes(rawFilters.departurePeriod as NonNullable<SearchFilters["departurePeriod"]>)) {
      reject("بازه زمان حرکت معتبر را انتخاب کنید.", "filters.departurePeriod");
    }
    filters.departurePeriod = rawFilters.departurePeriod as SearchFilters["departurePeriod"];
  }
  const sort = input.sort ?? "recommended";
  if (typeof sort !== "string" || !SORTS.includes(sort as SearchSort)) reject("روش مرتب‌سازی معتبر را انتخاب کنید.", "sort");
  if (mode === "fixture" && (sort === "price" || sort === "history")) throw new ValidationError("واحد مبلغ و سوابق عملیاتی تأیید نشده؛ مرتب‌سازی قیمت یا سابقه لغو در پاسخ مرجع پشتیبانی نمی‌شود.", { code: "UNSUPPORTED_FIXTURE_SORT", status: 422 });
  if (mode === "demo" && !isSupportedDemoDate(query.departureDate)) {
    throw new ValidationError(`تاریخ انتخابی خارج از بازه آزمایشی ${formatJalaliDate(DEMO_DATE_BOUNDS.min)} تا ${formatJalaliDate(DEMO_DATE_BOUNDS.max)} است.`, {
      code: "UNSUPPORTED_DEMO_DATE", status: 422,
      fields: [{ field: "query.departureDate", message: [DEMO_DATE_BOUNDS.min, DEMO_DATE_BOUNDS.max].map(formatJalaliDate).join(" تا ") }],
    });
  }
  if (mode === "fixture" && !ALIBABA_REFERENCE_MANIFEST.routes.some((route) => route.origin === origin && route.destination === destination && route.departureDates.some((date) => date === query.departureDate))) {
    throw new ValidationError("پاسخ مرجع فقط برای تهران مهرآباد به مشهد یا شیراز در ۲۳ مهر ۱۴۰۵ موجود است؛ مسیر و تاریخ دیگری جایگزین نمی‌شود.", { code: "UNSUPPORTED_FIXTURE_QUERY", status: 422 });
  }
  return {
    query: { origin, destination, departureDate: query.departureDate, adults: query.adults, currency: "IRR" },
    filters,
    sort: sort as SearchSort,
    mode,
  };
}
