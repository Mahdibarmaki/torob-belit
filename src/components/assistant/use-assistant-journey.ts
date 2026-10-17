"use client";

import { useRef, useState } from "react";
import type { AssistantRecommendation, AssistantRecommendationResponse } from "@/application/assistant-recommendations";
import type { FlightSearchResult } from "@/application/search-service";
import type { TravelIntent } from "@/domain/assistant-intent";
import type { SellerOffer } from "@/domain/models";
import { journeyTotal, parseJourneySelection, type JourneySelection } from "@/domain/journey-selection";

export interface AssistantSelectedLeg { result: FlightSearchResult; offer: SellerOffer }
export interface AssistantOutboundPin { flightId: string; offerId: string }

/** In-memory round-trip planning only. Each seller referral is independent of this selection. */
export function useAssistantJourney({ getIntent, onPinOutbound, onDirectionChange }: {
  getIntent: () => TravelIntent;
  onPinOutbound: (pin: AssistantOutboundPin) => Promise<AssistantRecommendationResponse | null>;
  onDirectionChange: () => void;
}) {
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");
  const [outbound, setOutbound] = useState<AssistantSelectedLeg | null>(null);
  const [selection, setSelection] = useState<JourneySelection | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  const lock = useRef(false);

  function reset() { version.current += 1; lock.current = false; setBusy(false); setDirection("outbound"); setOutbound(null); setSelection(null); setError(""); }
  function validated(selection: JourneySelection) {
    const intent = getIntent();
    const safe = parseJourneySelection(selection);
    const total = journeyTotal(safe);
    if (intent.hard.maxTotalPriceRials !== null && total.amountRials > intent.hard.maxTotalPriceRials) throw new TypeError("مجموع این پیشنهادها از بودجه کل بیشتر است؛ فروشنده یا شرایط سفر را تغییر دهید.");
    return safe;
  }

  async function choose(result: FlightSearchResult, supplied: SellerOffer, recommendation: AssistantRecommendation) {
    if (lock.current) return;
    const offer = result.eligibleOffers.find((item) => item.id === supplied.id);
    if (!offer) { setError("این پیشنهاد با شرایط فعلی هم‌خوان نیست؛ پیشنهادها را دوباره بررسی کنید."); return; }
    const intent = getIntent();
    const chosen: AssistantSelectedLeg = { result, offer };
    if (intent.tripType !== "round-trip") return;
    if (direction === "outbound") {
      lock.current = true; setBusy(true); setError(""); setOutbound(chosen); setSelection(null);
      const requestVersion = ++version.current;
      onDirectionChange(); setDirection("inbound");
      try {
        const next = await onPinOutbound({ flightId: result.flight.id, offerId: offer.id });
        if (requestVersion !== version.current) return;
        if (!next || !next.recommendations.length) setError("برای این پیشنهاد رفت، برگشت سازگار با همه شرایط دریافت نشد؛ انتخاب رفت را تغییر دهید یا دوباره تلاش کنید.");
      } catch { if (requestVersion === version.current) setError("دریافت پیشنهادهای برگشت انجام نشد؛ انتخاب رفت حفظ شده است."); }
      finally { if (requestVersion === version.current) { lock.current = false; setBusy(false); } }
      return;
    }
    try {
      if (!outbound || recommendation.selection.legs[0]?.flight.id !== outbound.result.flight.id || recommendation.selection.legs[0]?.offer.id !== outbound.offer.id) throw new TypeError("پیشنهاد برگشت به انتخاب رفت فعلی تعلق ندارد؛ انتخاب را دوباره انجام دهید.");
      const safe = validated({ tripType: "round-trip", adults: intent.passengers.adults, legs: [{ direction: "outbound", flight: outbound.result.flight, offer: outbound.offer }, { direction: "inbound", flight: result.flight, offer }] });
      setSelection(safe); setError("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "این سفر قابل انتخاب نیست."); }
  }

  return { direction, outbound, selection, error, busy, choose, reset };
}
