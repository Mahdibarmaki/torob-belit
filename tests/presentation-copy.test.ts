import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { searchFlights, type SearchRequest } from "@/application/search-service";
import { FlightCard } from "@/components/flight-card";
import { loadDemoFlights } from "@/fixtures/demo";
import { presentationCopy } from "@/lib/presentation-copy";

const request: SearchRequest = {
  mode: "demo",
  query: { origin: "THR", destination: "MHD", departureDate: "2026-10-16", adults: 1, currency: "IRR" },
  filters: {},
  sort: "recommended",
};

const unwantedPhrases = [
  "نسخه نمایشی",
  "داده شبیه‌سازی‌شده",
  "شرایط ساختگی",
  "تأیید موجودی واقعی نیست.",
  "قیمت ساختگی",
  "سابقه ساختگی",
  "مبلغ نمایشی",
];

describe("concise authored demo presentation", () => {
  it.each(unwantedPhrases)("removes the exact legacy phrase from presentation only: %s", (phrase) => {
    expect(presentationCopy(phrase)).not.toContain(phrase);
  });

  it("retains fare restrictions and penalty amounts", () => {
    expect(presentationCopy("شرایط ساختگی: استرداد با کسر ۱۵ درصد")).toBe("استرداد با کسر ۱۵ درصد");
    expect(presentationCopy("شرایط ساختگی: تغییر تاریخ مجاز نیست")).toBe("تغییر تاریخ مجاز نیست");
    expect(presentationCopy("شرایط ساختگی: تغییر با پرداخت اختلاف نرخ")).toBe("تغییر با پرداخت اختلاف نرخ");
  });

  it("renders concise card details without mutating fixture money, fare terms or provenance", () => {
    const inventory = loadDemoFlights(request.query);
    const before = JSON.stringify(inventory);
    const result = searchFlights(request, inventory).flights[0];
    const html = renderToStaticMarkup(createElement(FlightCard, { result, selectedForComparison: false, onCompare: () => {} }));

    for (const phrase of unwantedPhrases) expect(html).not.toContain(phrase);
    expect(html).toContain("احتمال پیش‌بینی‌شده یا کالیبره‌شدهٔ لغو پرواز آینده نیست");
    expect(html).toContain("تغییر تاریخ مجاز نیست");
    expect(html).toContain("استرداد با کسر ۱۵ درصد");
    expect(JSON.stringify(inventory)).toBe(before);
    expect(inventory.some((flight) => flight.offers.some((offer) => offer.fareConditions?.refunds?.includes("شرایط ساختگی")))).toBe(true);
  });

  it("gives the card a native details trigger beside independent actions and places codes above city labels", () => {
    const result = searchFlights(request).flights[0];
    const html = renderToStaticMarkup(createElement(FlightCard, { result, selectedForComparison: false, onCompare: () => {} }));
    expect(html).toMatch(/<button[^>]*type="button"[^>]*class="ticket-card-open"[^>]*aria-haspopup="dialog"/u);
    expect(html).toContain('class="button button-text text-action compare-text-action"');
    const endpoints = [...html.matchAll(/<div class="airport-time ticket-(?:departure|arrival)">([\s\S]*?)<\/div>/gu)];
    expect(endpoints).toHaveLength(2);
    for (const endpoint of endpoints) {
      expect(endpoint[1].indexOf('class="ticket-airport-code"')).toBeLessThan(endpoint[1].indexOf('class="ticket-airport-name"'));
    }
    let buttonDepth = 0;
    for (const [tag] of html.matchAll(/<\/?button\b[^>]*>/gu)) {
      buttonDepth += tag.startsWith("</") ? -1 : 1;
      expect(buttonDepth).toBeGreaterThanOrEqual(0);
      expect(buttonDepth).toBeLessThanOrEqual(1);
    }
    expect(buttonDepth).toBe(0);
  });
});
