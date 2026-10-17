import { expect, test, type Page, type Response } from "@playwright/test";
import type { AssistantRecommendationResponse } from "../../src/application/assistant-recommendations";
import type { FlightSearchResult } from "../../src/application/search-service";
import { emptyTravelIntent, parseTravelIntent, type IntentField, type TravelIntent } from "../../src/domain/assistant-intent";
import { formatJalaliDate } from "../../src/domain/jalali";
import { formatToman } from "../../src/domain/money";

const assistantSession = "torob-belit.assistant-preferences.v1";

function travelIntent(roundTrip = false): TravelIntent {
  const empty = emptyTravelIntent();
  return parseTravelIntent({ ...empty, origin: "THR", destination: "MHD", departureDate: "2026-10-20", tripType: roundTrip ? "round-trip" : "one-way", returnDate: roundTrip ? "2026-10-24" : null,
    hard: { ...empty.hard, maxTotalPriceRials: roundTrip ? 80_000_000 : 40_000_000 } });
}

async function seedPreferences(page: Page, roundTrip = false) {
  const intent = travelIntent(roundTrip);
  const confirmedFields: IntentField[] = ["origin", "destination", "departureDate", "tripType", "passengers.adults", "hard.maxTotalPriceRials", ...(roundTrip ? ["returnDate" as const] : [])];
  // Isolate journey selection from intent-entry QA; preferences are validated, offers come from the real local dataset.
  await page.addInitScript(({ key, value }) => { if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify(value)); }, { key: assistantSession, value: { intent, confirmedFields } });
  await page.goto("/ai-assistant");
  const toggle = page.getByRole("button", { name: "ترجیحات سفر", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(page.getByRole("button", { name: "مبدأ دستیار", exact: true })).toHaveAttribute("data-airport-code", "THR");
  await expect(page.getByRole("button", { name: "تاریخ رفت دستیار", exact: true })).toHaveText(formatJalaliDate("2026-10-20"));
  return intent;
}

function recommendationResponse(page: Page, predicate?: (body: { intent: TravelIntent; pinnedOutbound?: { flightId: string; offerId: string } }) => boolean) {
  return page.waitForResponse((response) => response.url().endsWith("/api/assistant/recommend") && response.request().method() === "POST" && (!predicate || predicate(response.request().postDataJSON())));
}

async function responseData(response: Promise<Response>): Promise<AssistantRecommendationResponse> {
  const result = await response;
  expect(result.status()).toBe(200); const body = await result.json(); expect(body.ok).toBe(true);
  return body.data;
}

async function recommend(page: Page) {
  const response = recommendationResponse(page);
  await page.getByRole("button", { name: "اعمال ترجیحات", exact: true }).click();
  const data = await responseData(response);
  expect(data.recommendations).toHaveLength(3);
  await expect(page.locator(".flight-card")).toHaveCount(3);
  return data;
}

async function chooseSeller(page: Page, result: FlightSearchResult, alternative = false, cardIndex = 0) {
  const index = alternative ? result.eligibleOffers.findIndex((offer) => offer.id !== result.selectedOffer.id) : result.eligibleOffers.findIndex((offer) => offer.id === result.selectedOffer.id);
  expect(index).toBeGreaterThanOrEqual(0);
  const offer = result.eligibleOffers[index];
  expect(offer.source.mode).toBe("demo"); expect(offer.priceComplete).toBe(true); expect(offer.availability).toBe("available");
  await page.locator(".flight-card").nth(cardIndex).locator(".ticket-card-open").click();
  const dialog = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
  const seller = dialog.locator(".seller-offer").nth(index);
  await expect(seller).toContainText(offer.sellerName);
  await expect(seller.locator(".offer-price")).toHaveText(formatToman(offer.totalPrice));
  await seller.getByRole("button", { name: "انتخاب برای سفر", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  return offer;
}

test("assistant one-way recommendations keep exact seller comparison and external referral without checkout", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const visits: string[] = [];
  // No provider page is fetched: popup navigation is fulfilled entirely inside this browser test.
  await context.route("https://**/*", async (route) => { visits.push(route.request().url()); await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Controlled seller destination</title>" }); });
  await seedPreferences(page); const data = await recommend(page);
  const first = data.recommendations[0].legs[0]; const second = data.recommendations[1].legs[0];
  await page.locator(".flight-card").nth(0).getByRole("button", { name: "افزودن به مقایسه", exact: true }).click();
  await page.locator(".flight-card").nth(1).getByRole("button", { name: "افزودن به مقایسه", exact: true }).click();
  await page.getByRole("button", { name: "مقایسه پروازها", exact: true }).click();
  const comparison = page.getByRole("dialog", { name: "مقایسه پروازهای انتخاب‌شده", exact: true });
  await expect(comparison.locator(".comparison-card")).toHaveCount(2);
  for (const [index, result] of [first, second].entries()) {
    const compared = comparison.locator(".comparison-card").nth(index);
    await expect(compared).toContainText(result.selectedOffer.sellerName);
    await expect(compared.locator(".price")).toHaveText(formatToman(result.selectedOffer.totalPrice));
    await expect(compared).toContainText(result.flight.segments[0].flightNumber);
  }
  await comparison.locator(".comparison-card").first().getByRole("button", { name: "جزئیات و فروشندگان", exact: true }).click();
  const details = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
  await expect(details).toBeVisible();
  const alternateIndex = first.eligibleOffers.findIndex((offer) => offer.id !== first.selectedOffer.id);
  expect(alternateIndex).toBeGreaterThanOrEqual(0);
  const alternate = first.eligibleOffers[alternateIndex];
  const seller = details.locator(".seller-offer").nth(alternateIndex);
  await expect(seller).toContainText(alternate.sellerName);
  await expect(seller.locator(".offer-price")).toHaveText(formatToman(alternate.totalPrice));
  await seller.getByRole("button", { name: "مقایسه با این پیشنهاد", exact: true }).click();
  await expect(seller.getByRole("button", { name: "حذف از مقایسه", exact: true })).toHaveAttribute("aria-pressed", "true");
  const link = seller.getByRole("link", { name: "خرید بلیط", exact: true });
  const destination = await link.getAttribute("href");
  expect(destination).toMatch(/^https:\/\//u);
  const popupEvent = page.waitForEvent("popup"); await link.click(); const popup = await popupEvent;
  await popup.waitForLoadState("domcontentloaded"); await expect(popup).toHaveURL(destination!); await popup.close();
  expect(visits).toContain(destination);
  await expect(page).toHaveURL(/\/ai-assistant$/u);
  await expect(details).toBeVisible();
  await expect(page.locator('a[href^="/checkout"], a[href^="/tickets"], a[href^="/my-tickets"]')).toHaveCount(0);
  await details.getByRole("button", { name: "بستن پنجره", exact: true }).click();
  await expect(comparison).toBeVisible();
  await expect(comparison.locator(".comparison-card")).toHaveCount(2);
  await expect(comparison.getByRole("group", { name: `مقایسه پرواز ${first.flight.segments[0].flightNumber}`, exact: true }).locator(".price")).toHaveText(formatToman(alternate.totalPrice));
  await page.keyboard.press("Escape");
  await expect(comparison).not.toBeVisible();
  await page.locator(".flight-card").first().locator(".ticket-card-open").click();
  await expect(details).toBeVisible();
  await expect(details.locator(".seller-offer").nth(alternateIndex).getByRole("button", { name: "حذف از مقایسه", exact: true })).toHaveAttribute("aria-pressed", "true");
  const originalIndex = first.eligibleOffers.findIndex((offer) => offer.id === first.selectedOffer.id);
  await expect(details.locator(".seller-offer").nth(originalIndex).getByRole("button", { name: "مقایسه با این پیشنهاد", exact: true })).toHaveAttribute("aria-pressed", "false");
  await details.getByRole("button", { name: "بستن پنجره", exact: true }).click();
  await page.locator(".flight-card").first().getByRole("button", { name: "حذف از مقایسه", exact: true }).click();
  await expect(page.locator(".flight-card").first().getByRole("button", { name: "افزودن به مقایسه", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".flight-card").nth(1).getByRole("button", { name: "حذف از مقایسه", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "مقایسه پروازها", exact: true })).toBeDisabled();
});

test("mobile assistant pins the exact alternate outbound seller and retains the selected round trip without checkout", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 1000 });
  const intent = await seedPreferences(page, true); const initial = await recommend(page);
  const outbound = initial.recommendations[0].legs[0];
  const pinnedResponse = recommendationResponse(page, (body) => !!body.pinnedOutbound);
  const outboundOffer = await chooseSeller(page, outbound, true);
  const pinResponse = await pinnedResponse;
  expect(pinResponse.request().postDataJSON().pinnedOutbound).toEqual({ flightId: outbound.flight.id, offerId: outboundOffer.id });
  const pinned = await responseData(Promise.resolve(pinResponse));
  expect(pinned.recommendations).toHaveLength(3);
  await expect(page.getByRole("region", { name: "انتخاب مسیر رفت و برگشت", exact: true })).toContainText("پرواز رفت انتخاب شد؛ اکنون پیشنهاد برگشت را انتخاب کنید.");
  await expect(page.locator(".flight-card")).toHaveCount(3);
  for (const recommendation of pinned.recommendations) {
    expect(recommendation.selection.legs[0].flight.id).toBe(outbound.flight.id);
    expect(recommendation.selection.legs[0].offer.id).toBe(outboundOffer.id);
    expect(recommendation.legs[1].flight.segments[0].origin).toBe("MHD");
    expect(recommendation.legs[1].flight.segments.at(-1)!.destination).toBe("THR");
    expect(recommendation.selection.legs.reduce((sum, leg) => sum + leg.offer.totalPrice.amountRials, 0)).toBeLessThanOrEqual(intent.hard.maxTotalPriceRials!);
  }
  const inbound = pinned.recommendations[0].legs[1]; const inboundOffer = await chooseSeller(page, inbound);
  const summary = page.getByRole("region", { name: "خلاصه سفر رفت و برگشت", exact: true });
  await expect(summary).toBeVisible(); await expect(page).toHaveURL(/\/ai-assistant$/);
  await expect(summary).toContainText(outboundOffer.sellerName); await expect(summary).toContainText(inboundOffer.sellerName);
  const sumRials = outboundOffer.totalPrice.amountRials + inboundOffer.totalPrice.amountRials;
  await expect(summary).toContainText(formatToman({ amountRials: sumRials, currency: "IRR", unit: "rial" }));
  await expect(summary.getByRole("button", { name: "ادامه به اطلاعات مسافران", exact: true })).toHaveCount(0);
  await expect(page.locator('a[href^="/checkout"], a[href^="/tickets"], a[href^="/my-tickets"]')).toHaveCount(0);
  const drafts = await page.evaluate(() => Object.keys(sessionStorage).filter((key) => key.startsWith("torob-belit.checkout.v1.")));
  expect(drafts).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: "test-results/assistant-round-trip-referral-375.png", fullPage: true });
});

test("editing preferences clears selected round-trip legs, direction comparisons and outbound pins", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1000 });
  await seedPreferences(page, true); const initial = await recommend(page);
  await page.locator(".flight-card").first().getByRole("button", { name: "افزودن به مقایسه", exact: true }).click();
  await expect(page.getByRole("button", { name: "مقایسه پروازها", exact: true })).toBeDisabled();
  const pinnedResponse = recommendationResponse(page, (body) => !!body.pinnedOutbound);
  await chooseSeller(page, initial.recommendations[0].legs[0], true);
  const pinned = await responseData(pinnedResponse);
  await expect(page.getByRole("button", { name: "مقایسه پروازها", exact: true })).toHaveCount(0);
  await expect(page.locator(".flight-card")).toHaveCount(3);
  const inbound = pinned.recommendations[0].legs[1]; await chooseSeller(page, inbound);
  await expect(page.getByRole("region", { name: "خلاصه سفر رفت و برگشت", exact: true })).toBeVisible();
  await page.locator(".flight-card").first().getByRole("button", { name: "افزودن به مقایسه", exact: true }).click();
  await page.getByRole("button", { name: /^بودجه/ }).click();
  const constraints = page.getByRole("dialog", { name: "شرایط الزامی سفر", exact: true });
  await constraints.getByRole("textbox", { name: "سقف بودجه کل به تومان", exact: true }).fill("۹٬۰۰۰٬۰۰۰");
  const updatedResponse = recommendationResponse(page, (body) => body.intent.hard.maxTotalPriceRials === 90_000_000 && !body.pinnedOutbound);
  await constraints.getByRole("button", { name: "تأیید شرایط", exact: true }).click();
  const updated = await responseData(updatedResponse);
  expect(updated.recommendations).toHaveLength(3);
  expect(updated.recommendations.every((recommendation) => recommendation.legs[0].flight.segments[0].origin === "THR")).toBe(true);
  await expect(page.getByRole("region", { name: "خلاصه سفر رفت و برگشت", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "انتخاب مسیر رفت و برگشت", exact: true })).toContainText("ابتدا پیشنهاد رفت را انتخاب کنید.");
  await expect(page.getByText(/^رفت انتخاب‌شده:/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "مقایسه پروازها", exact: true })).toHaveCount(0);
  await expect(page.locator(".flight-card")).toHaveCount(3);
  const drafts = await page.evaluate(() => Object.keys(sessionStorage).filter((key) => key.startsWith("torob-belit.checkout.v1.")));
  expect(drafts).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
