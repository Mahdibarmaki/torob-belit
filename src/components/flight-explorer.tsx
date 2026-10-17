"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import { ArrowLeftRight, CalendarDays, Check, PlaneLanding, PlaneTakeoff, Search, SlidersHorizontal, Trash2, Users } from "lucide-react";
import type { SearchFilters, SearchMode, SearchResponse, SearchSort } from "@/application/search-service";
import type { DisplayFlightResult, DisplaySellerOffer } from "@/application/reference-search";
import type { Flight, Money, SellerOffer } from "@/domain/models";
import { journeyTotal, type JourneySelection } from "@/domain/journey-selection";
import { EMPTY_JOURNEY_SEARCH, isSearchDateWithinBounds, journeyLegQuery, journeySearchUrl, validateJourneySearch, type JourneyDirection, type JourneySearch, type JourneySearchDraft, type SearchFieldErrors, type TripType } from "@/domain/journey-search";
import { formatJalaliDate } from "@/domain/jalali";
import { OfferPrice } from "./offer-price";
import { priceRangeBounds } from "@/domain/price-range";
import { AIRPORTS } from "@/data/airports";
import { SourceStatus } from "./source-status";
import { ComparisonPanel } from "./comparison-panel";
import { FlightCard } from "./flight-card";
import { countActiveFilters, FilterPanel } from "./filter-panel";
import { JalaliDatePicker } from "./jalali-date-picker";
import { AirportSelector } from "./airport-selector";
import { AssistantEntry } from "./assistant-entry";
import assistantEntryStyles from "./assistant-entry.module.css";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { Badge, Button, Dialog, Icon, Select } from "./ui";

const number = new Intl.NumberFormat("fa-IR");
interface Selection { result: DisplayFlightResult; offerId: string; }
interface LegState { data: SearchResponse | null; base: SearchResponse | null; filters: SearchFilters; draftFilters: SearchFilters; sort: SearchSort; busy: boolean; error: string; }
interface SelectedLeg { flight: Flight; offer: SellerOffer; }
function createLeg(data: SearchResponse | null, error = ""): LegState { return { data, base: data, filters: data?.filters ?? {}, draftFilters: data?.filters ?? {}, sort: data?.sort ?? "recommended", busy: false, error }; }
function cityName(code: string) { return AIRPORTS.find((airport) => airport.code === code)?.city.replace(/\s*\([^)]*\)/g, "") ?? code; }

export interface FlightExplorerProps {
  initialData: SearchResponse | null;
  initialInboundData?: SearchResponse | null;
  initialDraft?: JourneySearchDraft;
  initialSearch?: JourneySearch | null;
  initialFieldErrors?: SearchFieldErrors;
  initialError?: string;
  initialInboundError?: string;
  mode: SearchMode;
  dateBounds: { min: string; max: string };
  referenceAsOf?: string | null;
}

export function FlightExplorer({ initialData, initialInboundData = null, initialDraft = EMPTY_JOURNEY_SEARCH, initialSearch = null, initialFieldErrors = {}, initialError = "", initialInboundError = "", mode, dateBounds }: FlightExplorerProps) {
  const fixture = mode === "fixture";
  const demo = mode !== "live";
  const [draft, setDraft] = useState<JourneySearchDraft>(initialDraft);
  const [submitted, setSubmitted] = useState<JourneySearch | null>(initialSearch);
  const [fieldErrors, setFieldErrors] = useState<SearchFieldErrors>(initialFieldErrors);
  const [legs, setLegs] = useState<Record<JourneyDirection, LegState>>({ outbound: createLeg(initialData, initialError), inbound: createLeg(initialInboundData, initialInboundError) });
  const [activeLeg, setActiveLeg] = useState<JourneyDirection>("outbound");
  const activeLegRef = useRef<JourneyDirection>("outbound");
  const [chosenLegs, setChosenLegs] = useState<Partial<Record<JourneyDirection, SelectedLeg>>>({});
  const [announcement, setAnnouncement] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [methodOpen, setMethodOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [selections, setSelections] = useState<Selection[]>([]);
  const selectionsRef = useRef<Selection[]>([]);
  const requests = useRef<Partial<Record<JourneyDirection, AbortController>>>({});
  const generation = useRef(0);
  const current = legs[activeLeg];
  const data = current.data;
  const busy = current.busy;
  const filters = current.filters;
  const draftFilters = current.draftFilters;
  const sort = current.sort;
  const activeQuery = submitted ? journeyLegQuery(submitted, activeLeg) : null;
  const roundTrip = submitted?.tripType === "round-trip";

  useEffect(() => () => { Object.values(requests.current).forEach((request) => request.abort()); }, []);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => { setNarrow(media.matches); if (!media.matches) setMobileFiltersOpen(false); };
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function patchLeg(direction: JourneyDirection, patch: Partial<LegState>) { setLegs((previous) => ({ ...previous, [direction]: { ...previous[direction], ...patch } })); }
  function updateSelections(next: Selection[]) { selectionsRef.current = next; setSelections(next); }
  function changeLeg(direction: JourneyDirection) { activeLegRef.current = direction; setActiveLeg(direction); updateSelections([]); setCompareOpen(false); setMobileFiltersOpen(false); }
  function setDraftFilters(next: SearchFilters) { patchLeg(activeLeg, { draftFilters: next }); }
  function updateDraft<K extends keyof JourneySearchDraft>(field: K, value: JourneySearchDraft[K]) {
    setDraft((previous) => ({ ...previous, [field]: value, ...(field === "departureDate" && previous.returnDate && previous.returnDate < String(value) ? { returnDate: "" } : {}) }));
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  }
  function changeTripType(type: TripType) {
    setDraft((previous) => ({ ...previous, tripType: type, returnDate: type === "round-trip" && previous.returnDate && previous.departureDate && previous.returnDate < previous.departureDate ? "" : previous.returnDate }));
    setFieldErrors((previous) => ({ ...previous, returnDate: undefined }));
  }
  function tripTabKeys(event: KeyboardEvent<HTMLButtonElement>, type: TripType) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "one-way" : event.key === "End" ? "round-trip" : type === "one-way" ? "round-trip" : "one-way";
    changeTripType(next); document.getElementById(`trip-tab-${next}`)?.focus();
  }

  async function requestLeg(search: JourneySearch, direction: JourneyDirection, nextFilters: SearchFilters, nextSort: SearchSort, resetBase: boolean, requestGeneration = generation.current) {
    requests.current[direction]?.abort();
    const controller = new AbortController(); requests.current[direction] = controller;
    patchLeg(direction, { busy: true, error: "" });
    try {
      const response = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ query: journeyLegQuery(search, direction), filters: nextFilters, sort: nextSort, mode }) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error?.message ?? "جست‌وجو انجام نشد. دوباره تلاش کنید.");
      if (controller.signal.aborted || requestGeneration !== generation.current) return false;
      const next: SearchResponse = body.data;
      patchLeg(direction, { data: next, ...(resetBase ? { base: next, draftFilters: next.filters } : {}), filters: next.filters, sort: next.sort, error: "" });
      if (direction === activeLegRef.current) {
        const latest = selectionsRef.current;
        const valid = latest.flatMap((selection) => {
          const result = [...next.flights, ...(next.unpricedFlights ?? [])].find((item) => item.flight.id === selection.result.flight.id);
          return result?.eligibleOffers.some((offer) => offer.id === selection.offerId) ? [{ result, offerId: selection.offerId }] : [];
        });
        updateSelections(valid);
      }
      setAnnouncement(`${direction === "inbound" ? "برگشت: " : "رفت: "}${number.format(next.flights.length + (next.unpricedFlights?.length ?? 0))} پرواز پیدا شد.`);
      return true;
    } catch (failure) {
      if (controller.signal.aborted || requestGeneration !== generation.current) return false;
      patchLeg(direction, { error: failure instanceof Error ? failure.message : "خطا در دریافت نتایج" });
      return false;
    } finally { if (requests.current[direction] === controller) patchLeg(direction, { busy: false }); }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = validateJourneySearch(draft, { airportCodes: AIRPORTS.map((airport) => airport.code), dateBounds });
    setFieldErrors(checked.errors);
    if (!checked.search) { setAnnouncement("فیلدهای مشخص‌شده را بررسی کنید."); requestAnimationFrame(() => document.querySelector<HTMLElement>('#flight-search [data-invalid="true"], #flight-search [aria-invalid="true"]')?.focus()); return; }
    Object.values(requests.current).forEach((request) => request.abort());
    const nextGeneration = ++generation.current;
    setSubmitted(checked.search); activeLegRef.current = "outbound"; setActiveLeg("outbound"); setChosenLegs({}); setSelectionError(""); updateSelections([]); setCompareOpen(false); setMobileFiltersOpen(false);
    setLegs({ outbound: createLeg(null), inbound: createLeg(null) });
    window.history.pushState(window.history.state, "", journeySearchUrl(checked.search, mode));
    const search = checked.search;
    void Promise.all([requestLeg(search, "outbound", {}, "recommended", true, nextGeneration), ...(search.tripType === "round-trip" ? [requestLeg(search, "inbound", {}, "recommended", true, nextGeneration)] : [])]);
  }
  async function runSearch(nextFilters: SearchFilters, nextSort: SearchSort = sort) { return submitted ? requestLeg(submitted, activeLeg, nextFilters, nextSort, false) : false; }
  function toggleComparison(result: DisplayFlightResult, offerId?: string) {
    const previous = selectionsRef.current;
    const existing = previous.find((item) => item.result.flight.id === result.flight.id);
    if (existing && (offerId === undefined || existing.offerId === offerId)) { updateSelections(previous.filter((item) => item.result.flight.id !== result.flight.id)); setAnnouncement("پرواز از مقایسه حذف شد."); return; }
    if (!existing && previous.length >= 3) { setAnnouncement("برای افزودن پرواز دیگر، یک انتخاب را حذف کنید."); return; }
    updateSelections([...previous.filter((item) => item.result.flight.id !== result.flight.id), { result, offerId: offerId ?? result.selectedOffer.id }]);
    setAnnouncement(existing ? "پیشنهاد فروشنده تغییر کرد." : "پرواز به مقایسه اضافه شد.");
  }
  function clearFilters() { setDraftFilters({}); void runSearch({}, sort); }
  async function applyFilters() { if (await runSearch(draftFilters, sort)) setMobileFiltersOpen(false); }
  function popularRoute(destination: string) { setDraft((previous) => ({ ...previous, origin: "THR", destination })); document.getElementById("flight-search")?.scrollIntoView({ behavior: "smooth", block: "center" }); setAnnouncement("مسیر انتخاب شد؛ تاریخ سفر را انتخاب کنید و جست‌وجو را بزنید."); }
  function chooseOffer(result: DisplayFlightResult, offer: DisplaySellerOffer) {
    if (!submitted || submitted.tripType !== "round-trip" || !offer.totalPrice || !offer.priceComplete || offer.availability !== "available" || offer.ticketing !== "single-ticket" || "priceEvidence" in offer) { setSelectionError("این پیشنهاد برای انتخاب سفر کامل و قابل مقایسه نیست."); return; }
    const selected: SelectedLeg = { flight: { ...result.flight, offers: result.flight.offers.filter((item): item is SellerOffer => item.totalPrice !== null) }, offer };
    setSelectionError("");
    if (activeLeg === "inbound" && chosenLegs.outbound && new Date(selected.flight.segments[0].departureAt).getTime() <= new Date(chosenLegs.outbound.flight.segments.at(-1)!.arrivalAt).getTime()) { setSelectionError("پرواز برگشت باید پس از پایان پرواز رفت باشد؛ زمان دیگری انتخاب کنید."); return; }
    setChosenLegs((previous) => ({ ...previous, [activeLeg]: selected, ...(activeLeg === "outbound" && previous.inbound && new Date(previous.inbound.flight.segments[0].departureAt).getTime() <= new Date(selected.flight.segments.at(-1)!.arrivalAt).getTime() ? { inbound: undefined } : {}) }));
    if (activeLeg === "outbound") { changeLeg("inbound"); setAnnouncement("پرواز رفت انتخاب شد. اکنون پرواز برگشت را انتخاب کنید."); }
    else { setAnnouncement("هر دو پرواز انتخاب شدند؛ خلاصه سفر را بررسی کنید."); requestAnimationFrame(() => document.getElementById("journey-selection")?.scrollIntoView({ behavior: "smooth", block: "center" })); }
  }

  const allFlights: DisplayFlightResult[] = data ? [...data.flights, ...(data.unpricedFlights ?? [])] : [];
  const activeFilters = countActiveFilters(filters);
  const canClearFilters = activeFilters > 0 || countActiveFilters(draftFilters) > 0;
  const baseFlights = current.base ? [...current.base.flights, ...(current.base.unpricedFlights ?? [])] : [];
  const priceBounds = priceRangeBounds(current.base?.flights.flatMap((result) => result.eligibleOffers.map((offer) => offer.totalPrice.amountRials)) ?? []);
  const airlines = [...new Map(baseFlights.flatMap((result) => result.flight.segments.map((segment) => [segment.airlineId, segment.airlineName] as const))).entries()];
  const routeTitle = activeQuery ? `${cityName(activeQuery.origin)} به ${cityName(activeQuery.destination)}` : "";
  const returnMinimum = isSearchDateWithinBounds(draft.departureDate, dateBounds) ? draft.departureDate : dateBounds.min;
  const filterContent = <FilterPanel draft={draftFilters} onChange={setDraftFilters} onApply={() => void applyFilters()} onClear={clearFilters} canClear={canClearFilters} busy={busy} bounds={priceBounds} airlines={airlines} />;
  const selectedJourney: JourneySelection | null = chosenLegs.outbound && chosenLegs.inbound && submitted ? { tripType: "round-trip", adults: submitted.query.adults, legs: [{ direction: "outbound", ...chosenLegs.outbound }, { direction: "inbound", ...chosenLegs.inbound }] } : null;
  let combinedPrice: Money | null = null;
  let combinedPriceError = "";
  if (selectedJourney) {
    try { combinedPrice = journeyTotal(selectedJourney); }
    catch (failure) { combinedPriceError = failure instanceof Error ? failure.message : "جمع قیمت قابل محاسبه نیست."; }
  }
  const errorFor = (field: keyof JourneySearchDraft) => fieldErrors[field] ? <span id={`search-error-${field}`} className="search-field-error">{fieldErrors[field]}</span> : null;

  return <div className="app-shell">
    <a href="#flight-search" className="skip-link">رفتن به جست‌وجوی پرواز</a>
    <SiteHeader />
    <main className="page-container">
      <section className="hero-search" aria-label="جست‌وجوی پرواز">
        <div className="hero-editorial"><div className="hero-copy"><p className="hero-eyebrow">ترب بلیط؛ جست‌وجو و مقایسه پرواز</p><h1>پروازها رو مقایسه کن، بهتر انتخاب کن.</h1><p className="hero-description">قیمت، ساعت پرواز و سابقه لغو رو یک‌جا ببین و پرواز مناسب خودت رو پیدا کن.</p></div><Image className="hero-background" src="/images/hero-airplane.png" alt="" aria-hidden="true" fill sizes="(max-width: 767px) 1260px, (max-width: 1023px) 1200px, (max-width: 1220px) 1140px, (max-width: 1440px) calc(100vw - 80px), 1360px" preload /></div>
        <div className={`search-panel ${assistantEntryStyles.searchPanel}`}>
          <AssistantEntry mode={mode} />
          <div className="nav-tabs search-tabs" role="tablist" aria-label="نوع سفر">{(["one-way", "round-trip"] as const).map((type) => <button key={type} id={`trip-tab-${type}`} type="button" role="tab" className={`nav-tab${draft.tripType === type ? " active" : ""}`} aria-selected={draft.tripType === type} aria-controls="trip-search-panel" tabIndex={draft.tripType === type ? 0 : -1} onClick={() => changeTripType(type)} onKeyDown={(event) => tripTabKeys(event, type)}><Icon icon={type === "one-way" ? PlaneTakeoff : ArrowLeftRight} size={18} />{type === "one-way" ? "یک‌طرفه" : "دوطرفه"}</button>)}</div>
          <div id="trip-search-panel" role="tabpanel" aria-labelledby={`trip-tab-${draft.tripType}`}>
          <form id="flight-search" className={`search-capsule${draft.tripType === "round-trip" ? " is-round-trip" : ""}`} onSubmit={submitSearch} aria-describedby="search-help" noValidate>
            <div className="airport-fields">
              <div className="search-field origin-field"><label htmlFor="origin-airport" className="search-label"><Icon icon={PlaneTakeoff} size={16} />مبدأ</label><AirportSelector id="origin-airport" label="مبدأ" placeholder="شهر مبدأ را انتخاب کنید" value={draft.origin} onChange={(origin) => updateDraft("origin", origin)} aria-invalid={!!fieldErrors.origin} aria-describedby={fieldErrors.origin ? "search-error-origin" : undefined} />{errorFor("origin")}</div>
              <button className="swap-airports" type="button" aria-label="جابه‌جایی مبدأ و مقصد" onClick={() => { setDraft((previous) => ({ ...previous, origin: previous.destination, destination: previous.origin })); setFieldErrors((previous) => ({ ...previous, origin: undefined, destination: undefined })); }}><Icon icon={ArrowLeftRight} size={18} /></button>
              <div className="search-field destination-field"><label htmlFor="destination-airport" className="search-label"><Icon icon={PlaneLanding} size={16} />مقصد</label><AirportSelector direction="destination" id="destination-airport" label="مقصد" placeholder="شهر مقصد را انتخاب کنید" value={draft.destination} onChange={(destination) => updateDraft("destination", destination)} aria-invalid={!!fieldErrors.destination} aria-describedby={fieldErrors.destination ? "search-error-destination" : undefined} />{errorFor("destination")}</div>
            </div>
            <div className="search-field"><label htmlFor="departure-date" className="search-label"><Icon icon={CalendarDays} size={16} />تاریخ رفت</label><JalaliDatePicker id="departure-date" aria-label="تاریخ رفت" placeholder="تاریخ رفت را انتخاب کنید" min={dateBounds.min} max={dateBounds.max} value={draft.departureDate} onChange={(date) => updateDraft("departureDate", date)} aria-invalid={!!fieldErrors.departureDate} aria-describedby={fieldErrors.departureDate ? "search-error-departureDate" : undefined} />{errorFor("departureDate")}</div>
            {draft.tripType === "round-trip" && <div className="search-field"><label htmlFor="return-date" className="search-label"><Icon icon={CalendarDays} size={16} />تاریخ برگشت</label><JalaliDatePicker id="return-date" aria-label="تاریخ برگشت" placeholder="تاریخ برگشت را انتخاب کنید" min={returnMinimum} max={dateBounds.max} value={draft.returnDate} onChange={(date) => updateDraft("returnDate", date)} aria-invalid={!!fieldErrors.returnDate} aria-describedby={fieldErrors.returnDate ? "search-error-returnDate" : undefined} />{errorFor("returnDate")}</div>}
            <label className="search-field passenger-field"><span className="search-label"><Icon icon={Users} size={16} />مسافران</span><Select className="search-control" aria-label="تعداد مسافران بزرگسال" value={draft.adults} onChange={(event) => updateDraft("adults", Number(event.target.value))} aria-invalid={!!fieldErrors.adults} aria-describedby={fieldErrors.adults ? "search-error-adults" : undefined}>{Array.from({ length: 9 }, (_, index) => <option key={index} value={index + 1}>{number.format(index + 1)} بزرگسال</option>)}</Select>{errorFor("adults")}</label>
            <button className="search-submit" aria-label="جست‌وجوی پرواز" type="submit" disabled={legs.outbound.busy || legs.inbound.busy}><Icon icon={Search} size={20} /><span>جست‌وجو</span></button>
          </form></div>
          <p id="search-help" className="search-help"><span>{draft.tripType === "one-way" ? "یک‌طرفه" : "دوطرفه"} · اقتصادی</span><span>قیمت کل به تومان</span></p>
          {Object.values(fieldErrors).some(Boolean) && <p className="search-field-error search-validation-summary" role="alert">لطفاً فیلدهای مشخص‌شده را بررسی کنید.</p>}
        </div>
      </section>
      <div role="status" aria-live="polite" className="visually-hidden">{announcement}{busy ? " در حال دریافت نتایج" : ""}</div>
      {selectionError && <p className="error-message" role="alert">{selectionError}</p>}
      {!submitted && <section className="empty-state search-initial-empty" aria-label="شروع جست‌وجو"><Icon icon={PlaneTakeoff} size={28} /><p>برای دیدن پروازها، مبدأ، مقصد و تاریخ سفرت رو انتخاب کن.</p></section>}
      {submitted && activeQuery && <>
        {roundTrip && <section className="journey-selection" id="journey-selection" aria-label="انتخاب سفر دوطرفه"><div className="journey-step-tabs" aria-label="مرحله انتخاب پرواز">{(["outbound", "inbound"] as const).map((direction) => <Button key={direction} variant="text" aria-pressed={activeLeg === direction} onClick={() => changeLeg(direction)}>{direction === "outbound" ? "انتخاب پرواز رفت" : "انتخاب پرواز برگشت"}{chosenLegs[direction] && <Icon icon={Check} size={16} />}</Button>)}</div>{(["outbound", "inbound"] as const).map((direction) => { const chosen = chosenLegs[direction]; const query = journeyLegQuery(submitted, direction); return <div className="selected-journey-leg" key={direction}><div><strong>{direction === "outbound" ? "رفت" : "برگشت"}: {cityName(query.origin)} به {cityName(query.destination)}</strong><p className="small-text muted">{formatJalaliDate(query.departureDate)}{chosen ? ` · ${chosen.flight.segments[0].airlineName} · ${chosen.offer.sellerName}` : " · هنوز انتخاب نشده"}</p></div>{chosen ? <><OfferPrice price={chosen.offer.totalPrice} /><Button variant="text" onClick={() => changeLeg(direction)}>تغییر انتخاب</Button></> : <span className="small-text muted">{legs[direction].busy ? "در حال جست‌وجو" : legs[direction].error || "یک پیشنهاد فروشنده انتخاب کنید"}</span>}</div>; })}{chosenLegs.outbound && chosenLegs.inbound && <div className="row spread journey-total"><div><span className="small-text muted">جمع دو پرواز برای {number.format(submitted.query.adults)} بزرگسال</span>{combinedPrice ? <OfferPrice price={combinedPrice} className="price" /> : <p role="alert" className="search-field-error">{combinedPriceError}</p>}</div></div>}</section>}
        {data?.providers && <SourceStatus providers={data.providers} />}
        {!!data?.warnings?.length && <ul className="search-warnings small-text muted" aria-label="توضیحات نتایج">{data.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
        <section className="content-section" aria-labelledby="results-title" aria-busy={busy}>
          <div className="section-heading"><div><p className="section-eyebrow">{roundTrip ? activeLeg === "outbound" ? "انتخاب پرواز رفت" : "انتخاب پرواز برگشت" : "برای سفر پیش رو"}{mode === "demo" && <span className="results-mode-label">اطلاعات آزمایشی</span>}</p><h2 id="results-title" className="section-title">پروازهای {routeTitle}</h2><p className="results-summary"><span><Icon icon={CalendarDays} size={14} />{formatJalaliDate(activeQuery.departureDate)}</span>{data && <span><span className="summary-separator" aria-hidden="true">•</span>{number.format(allFlights.length)} پرواز</span>}<span><span className="summary-separator" aria-hidden="true">•</span><Icon icon={Users} size={14} />{number.format(activeQuery.adults)} بزرگسال</span></p></div>{data && <div className="results-toolbar"><Button variant="text" className="mobile-filter-toggle" aria-label="نمایش فیلترها" aria-haspopup="dialog" aria-expanded={mobileFiltersOpen && narrow} onClick={() => setMobileFiltersOpen(true)}><Icon icon={SlidersHorizontal} size={18} />فیلترها{activeFilters > 0 && <Badge>{number.format(activeFilters)}</Badge>}</Button><label className="sort-control"><span className="visually-hidden">مرتب‌سازی</span><Select aria-label="مرتب‌سازی پروازها" value={sort} disabled={busy} onChange={(event) => void runSearch(filters, event.target.value as SearchSort)}><option value="recommended">{fixture ? "برنامه سفر مرجع" : "پیشنهاد مناسب‌تر"}</option><option value="price" disabled={fixture}>کمترین قیمت کل</option><option value="duration">کوتاه‌ترین مسیر</option><option value="departure">زمان حرکت</option><option value="history" disabled={fixture}>کمترین سابقه لغو</option></Select></label></div>}</div>
          {current.error && <div role="alert" className="error-message"><p>{current.error}</p><Button variant="text" disabled={busy} onClick={() => void runSearch(filters)}>تلاش دوباره برای {activeLeg === "outbound" ? "رفت" : "برگشت"}</Button></div>}
          {busy && !data && <p className="empty-state" role="status">در حال جست‌وجوی پروازهای {activeLeg === "outbound" ? "رفت" : "برگشت"}…</p>}
          {data && <div className="results-layout">
            {!narrow && <aside className="filter-panel" aria-label="فیلتر پروازها"><div className="filter-heading"><h2 className="filter-title"><Icon icon={SlidersHorizontal} size={18} />فیلترها</h2></div>{filterContent}</aside>}
            <div className="results-list">{allFlights.map((result) => <FlightCard key={result.flight.id} result={result} comparisonOfferId={selections.find((item) => item.result.flight.id === result.flight.id)?.offerId} selectedForComparison={selections.some((item) => item.result.flight.id === result.flight.id)} comparisonDisabled={selections.length >= 3 && !selections.some((item) => item.result.flight.id === result.flight.id)} onCompare={(offerId) => toggleComparison(result, offerId)} onSelectJourney={roundTrip ? (offer) => chooseOffer(result, offer) : undefined} />)}{!allFlights.length && <div className="empty-state"><Icon icon={Search} size={28} /><h3 className="section-title">{fixture ? "رکورد مرجع مطابق این جست‌وجو پیدا نشد" : demo ? "پروازی در این مجموعه پیدا نشد" : "پیشنهاد قابل مقایسه‌ای دریافت نشد"}</h3><p>{fixture ? "فقط مسیر و تاریخ ذخیره‌شده مرجع قابل نمایش است؛ مسیر دیگری جایگزین نمی‌شود." : demo ? "فیلترها را تغییر دهید. مسیرهای داخلی تهران با مشهد، شیراز، کیش، اصفهان، تبریز و اهواز در هر دو جهت فعال‌اند؛ برای مسیر پشتیبانی‌نشده پروازی ساخته نمی‌شود." : "منابع متصل نیستند؛ نتیجه خالی به معنی نبود پرواز در بازار نیست."}</p>{canClearFilters && <Button variant="text" onClick={clearFilters}>پاک کردن فیلترها</Button>}</div>}</div>
          </div>}
        </section>
      </>}
      {selections.length > 0 && <div className="comparison-bar" aria-label="انتخاب‌های مقایسه"><div><strong>{number.format(selections.length)} پرواز برای مقایسه</strong><p className="small-text muted">{selections.length === 3 ? "برای افزودن پرواز دیگر، یک انتخاب را حذف کنید." : "دو یا سه پرواز انتخاب کنید."}</p></div><div className="row"><Button variant="text" onClick={() => { updateSelections([]); setAnnouncement("انتخاب‌های مقایسه پاک شدند."); }} className="text-action"><Icon icon={Trash2} size={16} />پاک کردن</Button><Button variant="coral" disabled={selections.length < 2} onClick={() => setCompareOpen(true)}><Icon icon={ArrowLeftRight} size={16} />مقایسه پروازها</Button></div></div>}
    </main>
    <SiteFooter onNavigate={(target) => { if (target === "method") setMethodOpen(true); else document.getElementById("flight-search")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} onCompare={() => { if (selections.length >= 2) setCompareOpen(true); else { setAnnouncement("برای مقایسه، دو پرواز انتخاب کنید."); document.getElementById(submitted ? "results-title" : "flight-search")?.scrollIntoView({ behavior: "smooth" }); } }} onPopularRoute={popularRoute} />
    <Dialog open={mobileFiltersOpen && narrow && !!data} onClose={() => setMobileFiltersOpen(false)} title="فیلترها" className="filter-modal sheet-modal"><div className="filter-heading"><p className="muted">گزینه‌های مناسب سفرت را پیدا کن.</p></div>{mobileFiltersOpen && narrow && data && filterContent}</Dialog>
    <Dialog open={methodOpen} onClose={() => setMethodOpen(false)} title="روش محاسبه سابقه لغو"><div className="stack"><p>پروازهای همسان از نظر شرکت، شماره پرواز، مبدأ و مقصد در ۳۰ روز کامل گذشته بررسی می‌شوند؛ روز جاری در محاسبه نیست.</p><p>نرخ تاریخی برابر لغوهای تأییدشده تقسیم بر مجموع پروازهای انجام‌شده و لغوشده است. حداقل ۱۰ مشاهده و پوشش ۸۰٪ برنامه تأییدشده لازم است.</p><p>کم: کمتر از ۱۰٪؛ متوسط: ۱۰ تا کمتر از ۲۵٪؛ زیاد: ۲۵٪ و بیشتر. شواهد ناکافی با خاکستری و بدون درصد نمایش داده می‌شوند.</p><p>برای مسیر چندبخشی، سابقه هر بخش مستقل است. درصدها جمع نمی‌شوند و احتمال کل سفر ساخته نمی‌شود.</p><hr className="divider" /><strong>{fixture || !demo ? "منبع تأییدشده سوابق عملیاتی متصل نیست؛ اطلاعات کافی موجود نیست." : "این سوابق شبیه‌سازی شده‌اند و عملکرد واقعی ایرلاین نیستند."}</strong><p className="muted">هیچ نرخ تاریخی، پیش‌بینی لغو پرواز آینده نیست.</p></div></Dialog>
    {data && <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} title="مقایسه پروازهای انتخاب‌شده"><p className="small-text muted comparison-disclosure">{fixture ? "مقایسه فقط برای برنامه سفر است؛ واحد مبلغ تأیید نشده." : demo ? "" : "منبع و زمان هر پیشنهاد مشخص است؛ سابقه عملیاتی تأییدشده در دسترس نیست."} {number.format(data.query.adults)} بزرگسال · {routeTitle} · {formatJalaliDate(data.query.departureDate)}</p><ComparisonPanel selections={selections} onCompareOffer={(flightId, offerId) => { const selected = selectionsRef.current.find((item) => item.result.flight.id === flightId); if (selected) toggleComparison(selected.result, offerId); }} onRemove={(flightId) => { updateSelections(selectionsRef.current.filter((item) => item.result.flight.id !== flightId)); setCompareOpen(false); }} onDone={() => { setCompareOpen(false); setAnnouncement("مقایسه انجام شد؛ رزرو انجام نشده است."); }} /></Dialog>}
  </div>;
}
