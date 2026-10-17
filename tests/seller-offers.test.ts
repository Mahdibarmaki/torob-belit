import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { searchFlights, type SearchRequest } from "@/application/search-service";
import { SellerOfferMetadata } from "@/components/seller-offer-metadata";
import { FlightCard } from "@/components/flight-card";
import { loadDemoFlights } from "@/fixtures/demo";
import type { SellerOffer } from "@/domain/models";

const request: SearchRequest = {
  mode: "demo", query: { origin: "THR", destination: "MHD", departureDate: "2026-10-16", adults: 1, currency: "IRR" },
  filters: {}, sort: "recommended",
};
const metadata = (offer: SellerOffer) => renderToStaticMarkup(createElement(SellerOfferMetadata, { offer }));
const card = (result = searchFlights(request).flights[0]) => renderToStaticMarkup(createElement(FlightCard, {
  result, selectedForComparison: false, onCompare: () => {},
}));

function textOnly(html: string) { return html.replace(/<[^>]*>/gu, ""); }

describe("seller identities and purchase metadata", () => {
  it("uses stable real brand labels only within deterministic synthetic seller records", () => {
    const first = loadDemoFlights(request.query);
    const second = loadDemoFlights({ ...request.query, departureDate: "2026-10-17", adults: 2 });
    const expected = [
      ["demo-seller-0", "علی‌بابا"], ["demo-seller-1", "فلای‌تودی"], ["demo-seller-2", "مستربلیط"],
    ];
    for (const flight of [...first, ...second]) {
      expect(flight.offers.map((offer) => [offer.sellerId, offer.sellerName])).toEqual(expected);
      expect(flight.offers.every((offer) => offer.source.mode === "demo" && offer.sourceState === "FIXTURE" && offer.bookingUrl === null)).toBe(true);
    }
    expect(first[0].offers[0].totalPrice.amountRials).toBe(29_000_000);
  });

  it("keeps baggage, penalties and restrictions specific to each selected seller", () => {
    const offers = loadDemoFlights(request.query)[0].offers;
    const basic = metadata(offers[0]);
    const flexible = metadata(offers[2]);
    expect(basic).toContain("۲۰ کیلو بار تحویلی");
    expect(basic).toContain("۷ کیلو بار کابین");
    expect(basic).toContain("تغییر تاریخ مجاز نیست");
    expect(basic).toContain("غیرقابل استرداد");
    expect(flexible).toContain("۳۰ کیلو بار تحویلی");
    expect(flexible).toContain("تغییر با پرداخت اختلاف نرخ");
    expect(flexible).toContain("استرداد با کسر ۱۵ درصد");
    expect(basic).not.toContain("۱۵ درصد");
    expect(basic).not.toContain("شرایط ساختگی");
    expect(basic).toContain('data-icon-name="Armchair"');
    expect(flexible).toContain('data-icon-name="CalendarClock"');
  });

  it("preserves distinct per-leg allowances and truthful missing values", () => {
    const offer: SellerOffer = {
      ...loadDemoFlights(request.query)[0].offers[0], baggage: [
        { segmentId: "outbound-one", checkedKg: 20, carryOnKg: 7 },
        { segmentId: "outbound-two", checkedKg: null, carryOnKg: null },
      ], refundability: "unknown", ticketing: "unknown", fareConditions: { changes: null, refunds: null },
    };
    const html = metadata(offer);
    expect(html).toContain("بخش ۱");
    expect(html).toContain("بخش ۲");
    expect(html).toContain("۲۰ کیلو بار تحویلی");
    expect(html).toContain("بار تحویلی نامشخص");
    expect(html.match(/۷ کیلو بار کابین/gu)).toHaveLength(1);
    expect(html).not.toContain("بلیت یکپارچه");
    expect(html).not.toContain("قابل استرداد");
    expect(html).not.toContain("تغییر تاریخ");
    expect(metadata({ ...offer, baggage: [] })).toContain("میزان بار مشخص نیست");
    expect(metadata({ ...offer, baggage: [{ segmentId: "one", checkedKg: 0, carryOnKg: 0 }] })).toContain("بدون بار تحویلی");
  });
});

describe("compact flight details and aircraft placement", () => {
  it("focuses details on seller choices and keeps historical evidence on its independent dialog", () => {
    const html = card();
    const details = html.split('class="modal flight-detail-modal"')[1]?.split("</dialog>")[0];
    expect(details).toBeDefined();
    expect(details).toContain("پیشنهادهای فروشندگان");
    expect(details).toContain("نام فروشندگان به معنی همکاری یا اتصال رزرو نیست");
    expect(details).not.toContain("خلاصه سفر");
    expect(details).not.toContain("مسیر و برنامه");
    expect(details).not.toContain("سابقه لغو");
    expect(details).not.toContain("نظرات کاربران");
    expect(details).toContain("مقایسه با این پیشنهاد");
    expect(details).toContain("خرید بلیط");
    expect(html).toContain("جزئیات سابقهٔ لغو");
    expect(html).toContain("احتمال پیش‌بینی‌شده یا کالیبره‌شدهٔ لغو پرواز آینده نیست");
    expect(html).not.toContain("خرید و رزرو هنوز در این محصول فعال نیست");
  });

  it("moves actual aircraft to the airline header, omitting absent models and footer duplicates", () => {
    const result = searchFlights(request).flights[0];
    const html = card(result);
    const header = html.split('class="flight-header ticket-header"')[1]?.split('class="airport-route')[0] ?? "";
    const footer = html.split('class="flight-meta ticket-meta"')[1]?.split("<dialog")[0] ?? "";
    expect(header).toContain(result.flight.segments[0].aircraftModel!);
    expect(header).toContain('class="aircraft-caption" lang="en"');
    expect(footer).not.toContain(result.flight.segments[0].aircraftModel!);
    const missing = structuredClone(result);
    delete missing.flight.segments[0].aircraftModel;
    const missingHeader = card(missing).split('class="flight-header ticket-header"')[1]?.split('class="airport-route')[0] ?? "";
    expect(missingHeader).not.toContain('class="aircraft-caption"');
  });

  it("does not erase a different aircraft assignment on a connecting flight", () => {
    const result = structuredClone(searchFlights(request).flights.find((item) => item.flight.segments.length === 2)!);
    result.flight.segments[0].aircraftModel = "Airbus A320";
    result.flight.segments[1].aircraftModel = "Airbus A321";
    const header = card(result).split('class="flight-header ticket-header"')[1]?.split('class="airport-route')[0] ?? "";
    expect(textOnly(header)).toContain("Airbus A320");
    expect(textOnly(header)).toContain("Airbus A321");
  });
});
