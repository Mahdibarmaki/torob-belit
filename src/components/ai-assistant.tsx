"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "./site-header";
import { Button, Dialog, Icon } from "./ui";
import { emptyTravelIntent, parseTravelIntent, validateAssistantIntent, type AssistantDateContext, type IntentField, type TravelIntent } from "@/domain/assistant-intent";
import type { AssistantRecommendationResponse } from "@/application/assistant-recommendations";
import type { DisplayFlightResult } from "@/application/reference-search";
import { ComparisonPanel, type ComparisonSelection } from "./comparison-panel";
import { assistantSessionServerSnapshot, assistantSessionSnapshot, parseAssistantSession, saveAssistantSession, subscribeAssistantSession, type AssistantSession } from "@/lib/assistant-session";
import { journeySearchUrl } from "@/domain/journey-search";
import { TravelPreferences } from "./assistant/travel-preferences";
import { RecommendationResults } from "./assistant/recommendation-results";
import { useAssistantConversation } from "./assistant/use-assistant-conversation";
import { IntentChanges } from "./assistant/intent-changes";
import { useAssistantJourney, type AssistantOutboundPin } from "./assistant/use-assistant-journey";
import { journeyTotal } from "@/domain/journey-selection";
import { OfferPrice } from "./offer-price";
import { AssistantWelcome } from "./assistant/assistant-welcome";
import { MessageComposer } from "./assistant/message-composer";
import { Conversation } from "./assistant/conversation";
import styles from "./assistant/assistant.module.css";
import identity from "./assistant/ai-identity.module.css";

export function AIFlightAssistant({ initialContext, mode = "demo", aiConfigured = false }: { initialContext: AssistantDateContext; mode?: TravelIntent["mode"]; aiConfigured?: boolean }) {
  const snapshot = useSyncExternalStore(subscribeAssistantSession, assistantSessionSnapshot, assistantSessionServerSnapshot);
  const preferencesReady = snapshot !== undefined;
  const restored = useMemo(() => {
    try {
      return { session: parseAssistantSession(snapshot ?? null, mode, initialContext) ?? { intent: { ...emptyTravelIntent(), mode }, confirmedFields: [] }, error: "" };
    } catch {
      return { session: { intent: { ...emptyTravelIntent(), mode }, confirmedFields: [] }, error: "ترجیحات قبلی خوانده نشد؛ می‌توانید انتخاب‌های سفر را دوباره وارد کنید." };
    }
  }, [snapshot, mode, initialContext]);
  const [editedSession, setEditedSession] = useState<AssistantSession | null>(null);
  const { intent, confirmedFields } = editedSession ?? restored.session;
  const intentRef = useRef(intent);
  const preferencesTrigger = useRef<HTMLButtonElement>(null);
  const [context, setContext] = useState(initialContext);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [response, setResponse] = useState<AssistantRecommendationResponse | null>(null);
  const responseRef = useRef<AssistantRecommendationResponse | null>(null);
  const hasSearched = useRef(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [comparisons, setComparisons] = useState<ComparisonSelection[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversation = useAssistantConversation({ getIntent: () => intentRef.current, getConfirmedFields: () => confirmedFields,
    onIntent: adoptModelIntent, onContext: setContext, onRecommend: (next, nextContext) => void recommend(next, nextContext), context, configured: aiConfigured, onUnavailable: () => setAnnouncement("برای ادامه می‌توانید ترجیحات سفر را باز کنید.") });
  const journey = useAssistantJourney({ getIntent: () => intentRef.current, onPinOutbound: (pin) => recommend(intentRef.current, context, pin), onDirectionChange: () => { setComparisons([]); setCompareOpen(false); } });

  useLayoutEffect(() => { intentRef.current = intent; }, [intent]);
  useEffect(() => {
    return () => { request.current?.abort(); if (debounce.current) clearTimeout(debounce.current); };
  }, [mode]);

  function remember(next: TravelIntent, fields: IntentField[]) {
    try { saveAssistantSession({ intent: next, confirmedFields: fields }); }
    catch { setError("ذخیره ترجیحات در این زبانه در دسترس نیست؛ تا زمانی که صفحه باز است می‌توانید ادامه دهید."); }
  }
  function reply(text: string) { conversation.reply(text); }

  async function recommend(next = intentRef.current, nextContext = context, pinnedOutbound?: AssistantOutboundPin): Promise<AssistantRecommendationResponse | null> {
    if (debounce.current) clearTimeout(debounce.current);
    request.current?.abort();
    const version = ++generation.current;
    const validation = validateAssistantIntent(next, nextContext);
    setError("");
    if (!validation.ready && next.mode !== "fixture") { setSearching(false); setResponse(null); responseRef.current = null; reply(validation.question!); return null; }
    if (!pinnedOutbound) { journey.reset(); setComparisons([]); setCompareOpen(false); }
    setResponse(null); responseRef.current = null;
    const controller = new AbortController(); request.current = controller; setSearching(true);
    hasSearched.current = true;
    try {
      const result = await fetch("/api/assistant/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: next, ...(pinnedOutbound ? { pinnedOutbound } : {}) }), signal: controller.signal });
      const payload = await result.json();
      if (!result.ok || !payload.ok) throw new Error(payload.error?.message ?? "بررسی پروازها انجام نشد.");
      if (controller.signal.aborted || version !== generation.current) return null;
      const data: AssistantRecommendationResponse = payload.data;
      setContext(payload.context); setResponse(data); responseRef.current = data;
      setAnnouncement(data.question ?? (data.recommendations.length ? "پیشنهادها بر پایه ترجیحات شما محاسبه شدند." : "پروازی مطابق تمام شرایطت پیدا نکردیم."));
      return data;
    } catch (failure) { if (!controller.signal.aborted && version === generation.current) setError(failure instanceof Error ? failure.message : "بررسی پروازها انجام نشد."); }
    finally { if (request.current === controller) setSearching(false); }
    return null;
  }

  function changePreferences(nextValue: TravelIntent, changed: IntentField[]) {
    conversation.cancel();
    journey.reset();
    const next = parseTravelIntent(nextValue);
    const fields = [...new Set([...confirmedFields, ...changed])];
    const rerank = hasSearched.current;
    intentRef.current = next; setEditedSession({ intent: next, confirmedFields: fields }); remember(next, fields);
    request.current?.abort(); generation.current += 1; setSearching(false); setComparisons([]); setCompareOpen(false);
    setResponse(null); responseRef.current = null;
    if (debounce.current) clearTimeout(debounce.current);
    if (rerank) debounce.current = setTimeout(() => void recommend(next), 250);
  }

  function adoptModelIntent(nextValue: TravelIntent) {
    journey.reset();
    const next = parseTravelIntent(nextValue);
    intentRef.current = next; setEditedSession({ intent: next, confirmedFields }); remember(next, confirmedFields);
    request.current?.abort(); generation.current += 1; setSearching(false); setComparisons([]); setCompareOpen(false);
    setResponse(null); responseRef.current = null;
    if (debounce.current) clearTimeout(debounce.current);
  }

  function compare(result: DisplayFlightResult, offerId?: string) {
    if (!comparisons.some((selection) => selection.result.flight.id === result.flight.id) && comparisons.length >= 3) { setAnnouncement("برای افزودن پرواز دیگر، یک انتخاب را حذف کنید."); return; }
    setComparisons((previous) => {
      const existing = previous.find((selection) => selection.result.flight.id === result.flight.id);
      if (existing && (offerId === undefined || existing.offerId === offerId)) return previous.filter((selection) => selection !== existing);
      if (!existing && previous.length >= 3) return previous;
      return [...previous.filter((selection) => selection !== existing), { result, offerId: offerId ?? result.selectedOffer.id }];
    });
  }
  function send(text: string) {
    void conversation.send(text);
  }
  const checkedSearch = validateAssistantIntent(intent, context).query;
  const ordinaryUrl = checkedSearch ? journeySearchUrl(checkedSearch, mode) : mode === "demo" ? "/" : `/?mode=${mode}`;
  return <div className="app-shell"><SiteHeader /><main className={styles.page}>
    <nav className={styles.navigation} aria-label="حالت جست‌وجو"><Link href={ordinaryUrl}><Icon icon={ArrowRight} size={18} />بازگشت به جست‌وجوی پرواز</Link></nav>
    <section className={`${identity.identity} ${styles.stage}`} aria-label="دستیار هوشمند سفر"><div className={styles.body}>
      {conversation.messages.length === 0 && !preferencesOpen && !response && !searching ? <AssistantWelcome onPrompt={send} busy={!preferencesReady || searching || conversation.busy} /> : <Conversation messages={conversation.messages} busy={conversation.busy} />}
      {(error || restored.error) && <p role="alert" className={styles.notice}>{error || restored.error}</p>}
      {conversation.pending && <IntentChanges conflicts={conversation.pending.conflicts} onConfirm={conversation.confirmChanges} onReject={conversation.rejectChanges} />}
      <TravelPreferences intent={intent} onChange={changePreferences} onRecommend={() => void recommend()} ready={preferencesReady} triggerRef={preferencesTrigger} busy={!preferencesReady || searching || conversation.busy} open={preferencesOpen} onOpenChange={setPreferencesOpen} dateContext={context} />
      {searching && <p role="status" className={styles.busy}>در حال بررسی پروازهای مناسب سفرت...</p>}
      {journey.error && <p role="alert" className={styles.notice}>{journey.error}</p>}
      {intent.tripType === "round-trip" && (response || journey.outbound) && <section className={styles.notice} aria-label="انتخاب مسیر رفت و برگشت"><p>{journey.direction === "outbound" ? "ابتدا پیشنهاد رفت را انتخاب کنید. هزینه و امتیاز سفر با یک برگشت سازگار محاسبه شده است؛ برگشت را جداگانه در مرحله بعد انتخاب می‌کنید." : "پرواز رفت انتخاب شد؛ اکنون پیشنهاد برگشت را انتخاب کنید."}</p>{journey.outbound && <><p>رفت انتخاب‌شده: {journey.outbound.result.flight.segments[0].airlineName} · {journey.outbound.offer.sellerName}</p><Button variant="text" disabled={searching || conversation.busy} onClick={() => void recommend()}>تغییر پرواز رفت</Button></>}</section>}
      {response && <RecommendationResults response={response} mode={mode} direction={journey.direction} onCompare={compare} compareIds={comparisons.map((selection) => selection.result.flight.id)} comparisonOfferIds={Object.fromEntries(comparisons.map((selection) => [selection.result.flight.id, selection.offerId]))} onSelectJourney={intent.tripType === "round-trip" && !searching && !conversation.busy && !journey.busy ? (result, offer, recommendation) => void journey.choose(result, offer, recommendation) : undefined} onRefine={() => preferencesTrigger.current?.focus()} />}
      {journey.selection && <section className={styles.notice} aria-label="خلاصه سفر رفت و برگشت"><div className="stack">{journey.selection.legs.map((leg) => <p key={leg.direction}>{leg.direction === "outbound" ? "رفت" : "برگشت"}: {leg.flight.segments[0].airlineName} · {leg.offer.sellerName} · <OfferPrice price={leg.offer.totalPrice} /></p>)}</div><p>جمع دو پرواز برای {new Intl.NumberFormat("fa-IR").format(journey.selection.adults)} بزرگسال</p><OfferPrice price={journeyTotal(journey.selection)} /><p className="small-text muted">برای خرید هر پرواز، فروشنده را در جزئیات همان پرواز انتخاب کنید. این انتخاب، رزرو نیست.</p></section>}
      {comparisons.length > 0 && <div className={styles.navigation}><span>{new Intl.NumberFormat("fa-IR").format(comparisons.length)} پرواز برای مقایسه</span><Button variant="outline" disabled={comparisons.length < 2} onClick={() => setCompareOpen(true)}>مقایسه پروازها</Button><Button variant="text" onClick={() => setComparisons([])}>پاک کردن مقایسه</Button></div>}
      <MessageComposer value={conversation.input} onChange={conversation.setInput} onSend={() => send(conversation.input)} busy={!preferencesReady || searching || conversation.busy} mode={mode} />
    </div></section>
    <div role="status" aria-live="polite" className="visually-hidden">{announcement}</div>
    <div role="status" aria-live="polite" className="visually-hidden">{conversation.announcement}</div>
    <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} title="مقایسه پروازهای انتخاب‌شده"><ComparisonPanel selections={comparisons} onCompareOffer={(flightId, offerId) => { const selected = comparisons.find((item) => item.result.flight.id === flightId); if (selected) compare(selected.result, offerId); }} onRemove={(flightId) => setComparisons((previous) => previous.filter((selection) => selection.result.flight.id !== flightId))} onDone={() => setCompareOpen(false)} /></Dialog>
  </main></div>;
}
