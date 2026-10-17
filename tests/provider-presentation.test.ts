/** Synthetic test transports exercise presentation, never real-provider availability. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { FlightCard } from "@/components/flight-card";
import { OfferPrice } from "@/components/offer-price";
import { formatToman } from "@/domain/money";
import { searchFlights } from "@/application/search-service";
import { groupFlightOffers, normalizeFlightOffer } from "@/application/normalize-offers";
import { descriptor, NOW, QUERY, testOffer } from "./provider-fixtures";

it("renders source attribution, cached provenance, toman and unknown operational history independently", () => {
  const offer = normalizeFlightOffer(testOffer(), descriptor(), QUERY, new Date(NOW).toISOString());
  const inventory = groupFlightOffers([offer], { alibaba: "cached" });
  const response = searchFlights({ query: QUERY, filters: {}, sort: "recommended", mode: "live" }, inventory, { source: { mode: "live", id: "test", label: "Test aggregation" }, asOf: new Date(NOW).toISOString(), supportedDates: [] });
  const html = renderToStaticMarkup(createElement(FlightCard, { result: response.flights[0], selectedForComparison: false, onCompare: () => {} }));
  expect(html).toContain("Test alibaba");
  expect(html).toContain("پاسخ ذخیره‌شده؛ داده زنده نیست.");
  const cardPrice = html.match(/<bdi dir="rtl" class="price">(.*?)<\/bdi>/u)?.[1];
  expect(cardPrice).toBeDefined();
  expect(cardPrice!.replace(/<[^>]*>/gu, "")).toBe("۶٬۰۰۰٬۰۰۰٫۱ تومان");
  expect(cardPrice).toContain('class="price-currency">تومان</span>');
  expect(html).toContain("اطلاعات کافی موجود نیست");
  expect(html).toContain("۲۴ مهر ۱۴۰۵");
  expect(html).not.toContain("ساختگی");
  expect(html).not.toContain("سوابق ساختگیِ نمایشی");
  expect(html).not.toContain("href=\"https://alibaba.ir/test-only\"");
  expect(html).toContain("پیوند معتبر فروشنده در دسترس نیست");
});

it.each([0, 10_000_001, Number.MAX_SAFE_INTEGER])("retains exact formatted money while separating the currency label: %s rials", (amountRials) => {
  const price = { currency: "IRR", unit: "rial", amountRials } as const;
  const html = renderToStaticMarkup(createElement(OfferPrice, { price, className: "price" }));
  expect(html.replace(/<[^>]*>/gu, "")).toBe(formatToman(price));
  expect(html).toContain('class="price-amount"');
  expect(html).toContain('class="price-currency">تومان</span>');
});

it("does not add a currency label to an unverified reference amount", () => {
  const html = renderToStaticMarkup(createElement(OfferPrice, { price: null, className: "price" }));
  expect(html.replace(/<[^>]*>/gu, "")).toBe("واحد مبلغ تأیید نشده");
  expect(html).not.toContain("price-currency");
  expect(html).not.toContain("تومان");
});

it("cannot implicitly fall back to demo inventory for a live-mode request", () => {
  expect(() => searchFlights({ query: QUERY, filters: {}, sort: "price", mode: "live" })).toThrow("explicit provider context");
});
