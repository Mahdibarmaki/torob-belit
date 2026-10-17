import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { searchFlights, type SearchRequest } from "@/application/search-service";
import { ComparisonPanel } from "@/components/comparison-panel";
import { FlightCard } from "@/components/flight-card";
import { SellerOfferMetadata } from "@/components/seller-offer-metadata";
import { formatToman } from "@/domain/money";
import { executeSearch, defaultSearchRequest } from "@/server/search";

const request: SearchRequest = { mode: "demo", query: { origin: "THR", destination: "MHD", departureDate: "2026-10-16", adults: 1, currency: "IRR" }, filters: {}, sort: "recommended" };
const textOnly = (html: string) => html.replace(/<[^>]*>/gu, "");

describe("grouped comparison presentation", () => {
  it("preserves the actual chosen seller price, bags and penalties instead of the card's cheaper offer", () => {
    const result = searchFlights(request).flights[0];
    const offer = result.eligibleOffers[2];
    const before = JSON.stringify(result);
    const html = renderToStaticMarkup(createElement(ComparisonPanel, { selections: [{ result, offerId: offer.id }], onRemove: () => {}, onDone: () => {}, onCompareOffer: () => {} }));
    const price = html.match(/<bdi dir="rtl" class="price">([\s\S]*?)<\/bdi>/u)![1];
    expect(textOnly(price)).toBe(formatToman(offer.totalPrice));
    expect(html).toContain("۳۰ کیلو بار تحویلی");
    expect(html).not.toContain("۲۰ کیلو بار تحویلی");
    expect(html).toContain("استرداد با کسر ۱۵ درصد");
    expect(html).toContain("تغییر با پرداخت اختلاف نرخ");
    expect(html).toContain(offer.sellerName);
    expect(html).toContain('aria-label="حرکت بخش ۱"');
    expect(html).toContain('aria-label="ورود بخش ۱"');
    expect(html).toContain('aria-label="بار و شرایط پیشنهاد"');
    expect(html).toContain('aria-label="سابقه لغو"');
    expect(html).toContain("اطلاعات آزمایشی");
    expect(JSON.stringify(result)).toBe(before);
  });

  it("keeps both connecting legs and never displays an insufficient diagnostic fraction as a historical rate", () => {
    const result = structuredClone(searchFlights(request).flights.find((item) => item.flight.segments.length === 2)!);
    result.flight.history![1].category = "unknown";
    result.flight.history![1].cancellationRate = null;
    result.flight.history![1].observedRate = 0.5;
    result.historyCategory = "unknown";
    const html = renderToStaticMarkup(createElement(ComparisonPanel, { selections: [{ result, offerId: result.selectedOffer.id }], onRemove: () => {}, onDone: () => {}, onCompareOffer: () => {} }));
    expect(html).toContain('aria-label="برنامه بخش ۱"');
    expect(html).toContain('aria-label="برنامه بخش ۲"');
    for (const segment of result.flight.segments) {
      expect(html).toContain(segment.flightNumber);
      expect(html).toContain(segment.departureAt);
      expect(html).toContain(segment.arrivalAt);
      expect(html).toContain(segment.aircraftModel!);
    }
    expect(textOnly(html)).toContain("داده ناکافی · —");
    expect(textOnly(html)).not.toContain("۵۰٪");
    expect(html).toContain("درصد بخش‌ها جمع نمی‌شود");
    expect(html).toContain("سابقه گذشته، احتمال لغو آینده نیست");
  });

  it("identifies a stale explicit offer without silently replacing it with another seller", () => {
    const result = searchFlights(request).flights[0];
    const html = renderToStaticMarkup(createElement(ComparisonPanel, { selections: [{ result, offerId: "missing-selected-fare" }], onRemove: () => {}, onDone: () => {}, onCompareOffer: () => {} }));
    expect(html).toContain("پیشنهاد انتخاب‌شده دیگر در این مقایسه معتبر نیست");
    expect(html).toContain('data-icon-name="Trash"');
    expect(html).not.toContain('class="price"');
    expect(html).not.toContain("بار و شرایط بلیط");
  });

  it("retains the unverified reference amount and offline attribution without inventing a comparable toman price", async () => {
    const result = (await executeSearch(defaultSearchRequest("fixture"))).unpricedFlights![0];
    const html = renderToStaticMarkup(createElement(ComparisonPanel, { selections: [{ result, offerId: result.selectedOffer.id }], onRemove: () => {}, onDone: () => {}, onCompareOffer: () => {} }));
    const price = html.match(/<bdi dir="rtl" class="price">([\s\S]*?)<\/bdi>/u)![1];
    expect(textOnly(price)).toBe("واحد مبلغ تأیید نشده");
    expect(price).not.toContain("تومان");
    expect(html).toContain("پاسخ مرجع آفلاین");
    expect(textOnly(html)).toContain("داده ناکافی · —");
    expect(html).not.toContain("اطلاعات آزمایشی؛ قیمت‌ها و سوابق");
  });

  it("uses the removal glyph on a selected card and retains isolated aircraft labels", () => {
    const result = searchFlights(request).flights[0];
    const html = renderToStaticMarkup(createElement(FlightCard, { result, selectedForComparison: true, onCompare: () => {} }));
    const selectedButton = html.match(/<button[^>]*aria-pressed="true"[^>]*>([\s\S]*?)<\/button>/u)![1];
    expect(selectedButton).toContain("حذف از مقایسه");
    expect(selectedButton).toContain('data-icon-name="Trash"');
    expect(selectedButton).not.toContain('data-icon-name="Check"');
    expect(html).toContain('class="aircraft-caption" lang="en" dir="ltr"');
  });

  it("identifies removal only for the exact compared seller, keeping alternate sellers selectable at the limit", () => {
    const result = searchFlights(request).flights[0];
    const offer = result.eligibleOffers[2];
    const html = renderToStaticMarkup(createElement(FlightCard, { result, selectedForComparison: true, comparisonOfferId: offer.id, comparisonDisabled: true, onCompare: () => {} }));
    const details = html.split('class="modal flight-detail-modal"')[1].split("</dialog>")[0];
    const pressed = [...details.matchAll(/<button([^>]*aria-pressed="true"[^>]*)>([\s\S]*?)<\/button>/gu)];
    expect(pressed).toHaveLength(1);
    expect(pressed[0][1]).not.toContain("disabled");
    expect(pressed[0][2]).toContain("حذف از مقایسه");
    expect(pressed[0][2]).toContain('data-icon-name="Trash"');
    const alternatives = [...details.matchAll(/<button([^>]*aria-pressed="false"[^>]*)>([\s\S]*?)<\/button>/gu)];
    expect(alternatives).toHaveLength(2);
    for (const alternate of alternatives) {
      expect(alternate[1]).not.toContain("disabled");
      expect(alternate[2]).toContain("مقایسه با این پیشنهاد");
      expect(alternate[2]).not.toContain('data-icon-name="Trash"');
    }
  });

});

describe("shared fare metadata presentation", () => {
  it("changes appearance to neutral badges without changing the selected fare's visible facts", () => {
    const offer = searchFlights(request).flights[0].eligibleOffers[2];
    const inline = renderToStaticMarkup(createElement(SellerOfferMetadata, { offer }));
    const badges = renderToStaticMarkup(createElement(SellerOfferMetadata, { offer, presentation: "badges" }));
    expect(textOnly(badges)).toBe(textOnly(inline));
    expect(badges).toContain("data-metadata-badge");
    expect(inline).not.toContain("data-metadata-badge");
    const withoutFare = renderToStaticMarkup(createElement(SellerOfferMetadata, { offer, presentation: "badges", includeFare: false }));
    expect(withoutFare).not.toContain(offer.fareName);
    expect(withoutFare).toContain("۳۰ کیلو بار تحویلی");
    expect(withoutFare).toContain("شامل همه هزینه‌های الزامی");
  });

  it("keeps lengthy actual fare restrictions as complete explanatory text rather than oversized badges", () => {
    const offer = structuredClone(searchFlights(request).flights[0].selectedOffer);
    const longCondition = "تغییر تاریخ فقط پس از بررسی شرایط همین پیشنهاد و پرداخت اختلاف نرخ اعلام‌شده مجاز است. ".repeat(3);
    offer.fareConditions = { changes: longCondition, refunds: null };
    const html = renderToStaticMarkup(createElement(SellerOfferMetadata, { offer, presentation: "badges" }));
    expect(textOnly(html)).toContain(longCondition.trim());
    expect(html).toMatch(new RegExp(`<p[^>]*>[\\s\\S]*?<span>${longCondition.trim()}</span></p>`, "u"));
  });
});
