import { expect, test, type Page, type Response, type Route } from "@playwright/test";
import { emptyTravelIntent, type AssistantDateContext, type TravelIntent } from "../../src/domain/assistant-intent";
import type { AssistantInterpretation, AssistantInterpretRequest } from "../../src/domain/assistant-provider";
import type { AssistantRecommendationResponse } from "../../src/application/assistant-recommendations";
import { formatJalaliDate, gregorianToJalali } from "../../src/domain/jalali";
import { formatToman } from "../../src/domain/money";

const departureDate = "2026-10-20";
const sessionKey = "torob-belit.assistant-preferences.v1";
const dateContext: AssistantDateContext = { now: "2026-10-16T09:00:00Z", timeZone: "Asia/Tehran", dateBounds: { min: "2026-10-15", max: "2036-12-31" } };
const messageField = (page: Page) => page.getByRole("textbox", { name: "پیام سفر", exact: true });
const cards = (page: Page) => page.locator(".flight-card");

async function expandPreferences(page: Page) {
  const toggle = page.getByRole("button", { name: "ترجیحات سفر", exact: true });
  if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
}

async function chooseAirport(page: Page, label: string, code: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `انتخاب ${label}`, exact: true });
  await dialog.getByRole("combobox", { name: "جست‌وجوی شهر یا فرودگاه", exact: true }).fill(code);
  await dialog.getByRole("option", { name: new RegExp(`، ${code}$`) }).click();
}

async function chooseDate(page: Page, label: string, date = departureDate) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const picker = page.getByRole("dialog", { name: `انتخاب ${label}`, exact: true });
  const parts = gregorianToJalali(date);
  await picker.getByRole("combobox", { name: "سال شمسی", exact: true }).selectOption(String(parts.year));
  await picker.getByRole("combobox", { name: "ماه شمسی", exact: true }).selectOption(String(parts.month));
  await picker.getByRole("button", { name: formatJalaliDate(date), exact: true }).click();
}

async function setRoute(page: Page) {
  await expandPreferences(page);
  await chooseAirport(page, "مبدأ دستیار", "THR");
  await chooseAirport(page, "مقصد دستیار", "MHD");
  await chooseDate(page, "تاریخ رفت دستیار");
}

function recommendationResponse(page: Page, matches?: (intent: TravelIntent) => boolean) {
  return page.waitForResponse((response) => response.url().endsWith("/api/assistant/recommend") && response.request().method() === "POST"
    && (!matches || matches(response.request().postDataJSON().intent)));
}

async function recommendations(response: Promise<Response>): Promise<AssistantRecommendationResponse> {
  const result = await response;
  expect(result.status()).toBe(200);
  const body = await result.json(); expect(body.ok).toBe(true);
  return body.data;
}

async function search(page: Page) {
  await expandPreferences(page);
  const response = recommendationResponse(page);
  await page.getByRole("button", { name: "اعمال ترجیحات", exact: true }).click();
  const result = await recommendations(response);
  await expect(cards(page)).toHaveCount(result.recommendations.length);
  return result;
}

async function submit(page: Page, text: string) {
  await messageField(page).fill(text);
  await page.getByRole("button", { name: "ارسال پیام", exact: true }).click();
}

/** UI protocol fixtures only: these do not exercise, or certify, a real model call. */
async function fulfillInterpretation(route: Route, data: AssistantInterpretation) {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data, context: dateContext }) });
}

function interpreted(intent: TravelIntent, overrides: Partial<AssistantInterpretation> = {}): AssistantInterpretation {
  return { state: "interpreted", intent, patch: {}, conflicts: [], question: null, message: "درخواست در پاسخ کنترل‌شدهٔ آزمون تفسیر شد.", needsClarification: false, model: "controlled-test-model", ...overrides };
}

for (const width of [375, 430, 768, 1024, 1440, 1920]) {
  test(`assistant entry and welcome preserve the product at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const panel = page.locator(".search-panel");
    const entry = panel.getByRole("link", { name: "دستیار هوشمند", exact: true });
    await expect(entry).toHaveAttribute("href", "/ai-assistant");
    await expect(entry.locator('svg[data-icon-name="Sparkles"]')).toHaveAttribute("data-icon-style", "solid");
    const parentBox = (await panel.boundingBox())!; const tabBox = (await entry.boundingBox())!;
    expect(tabBox.height).toBeGreaterThanOrEqual(48); expect(tabBox.y).toBeLessThan(parentBox.y);
    expect(Math.abs(tabBox.y + tabBox.height - parentBox.y - 1)).toBeLessThanOrEqual(1);
    expect(tabBox.x).toBeGreaterThanOrEqual(parentBox.x);
    expect(Math.abs(tabBox.x + tabBox.width - parentBox.x - parentBox.width)).toBeLessThanOrEqual(1);
    const entryStyle = await entry.evaluate((element) => {
      const css = getComputedStyle(element);
      return { gradient: css.backgroundImage, color: css.color, underline: getComputedStyle(element, "::after").content };
    });
    expect(entryStyle.gradient).toContain("linear-gradient");
    expect(entryStyle.gradient).not.toContain("239, 20, 43");
    expect(entryStyle.color).toBe("rgb(68, 40, 121)");
    expect(["none", "normal", '\"\"']).toContain(entryStyle.underline);
    const tripTabs = page.getByRole("tablist", { name: "نوع سفر", exact: true });
    await expect(tripTabs.getByRole("tab")).toHaveCount(2);
    const controlsBox = (await tripTabs.boundingBox())!;
    expect(tabBox.y + tabBox.height).toBeLessThanOrEqual(controlsBox.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/assistant-regular-tab-${width}.png`, fullPage: true });
    await tripTabs.getByRole("tab", { name: "دوطرفه", exact: true }).click();
    await expect(page.getByRole("button", { name: "تاریخ برگشت", exact: true })).toBeVisible();
    await tripTabs.getByRole("tab", { name: "یک‌طرفه", exact: true }).click();
    await entry.click(); await expect(page).toHaveURL(/\/ai-assistant$/);
    await expect(page.getByRole("button", { name: "ترجیحات سفر", exact: true })).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("button", { name: "اعمال ترجیحات", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "دستیار هوشمند سفر", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "دستیار هوشمند", exact: true })).toHaveCount(0);
    const logos = page.getByLabel("نشان ایرلاین‌ها؛ بدون همکاری تجاری", { exact: true });
    await expect(logos.getByRole("img")).toHaveCount(4);
    for (const logo of await logos.getByRole("img").all()) {
      await expect(logo).toHaveJSProperty("complete", true);
      expect(await logo.evaluate((element) => (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
    }
    await expect(page.getByRole("button", { name: "ارزان‌ترین پرواز تهران به مشهد رو پیدا کن", exact: true })).toBeVisible();
    await expect(page.getByText("نشان‌ها برای معرفی‌اند؛ همکاری یا تأیید ایرلاین‌ها ادعا نمی‌شود.", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "مجوز نشان‌ها", exact: true })).toHaveCount(0);
    await expect(page.getByText("بودجه: تعیین نشده", { exact: true })).toHaveCount(0);
    await expect(page.getByText("سرویس مدل پیکربندی شده است؛ موفقیت تفسیر پس از ارسال پیام مشخص می‌شود.", { exact: true })).toHaveCount(0);
    const composer = messageField(page); await expect(composer).toHaveAttribute("placeholder", "سفرت رو توصیف کن...");
    await expect(page.getByRole("button", { name: "ارسال پیام", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: /میکروفن|بارگذاری|پیوست/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/assistant-welcome-${width}.png`, fullPage: true });
    await page.route("**/api/assistant/interpret", async (route) => {
      const request = route.request().postDataJSON() as AssistantInterpretRequest;
      await fulfillInterpretation(route, interpreted(request.intent, { needsClarification: true, question: "مبدأ، مقصد و تاریخ دقیق سفرت را مشخص می‌کنی؟\nتاریخ شمسی و کدهایی مثل THR پذیرفته می‌شوند." }));
    });
    const message = "برای سفری از تهران به مشهد برنامه دارم، اما تاریخم هنوز مشخص نیست.\nاگر مسیر THR → MHD باشد، ترجیح می‌دهم صبح حرکت کنم و بار کافی داشته باشم.";
    await submit(page, message);
    const conversation = page.getByRole("region", { name: "گفت‌وگوی سفر", exact: true });
    const userBubble = conversation.getByRole("listitem", { name: "پیام شما", exact: true });
    const assistantBubbles = conversation.getByRole("listitem", { name: "پیام دستیار سفر", exact: true });
    await expect(userBubble).toHaveText(message);
    await expect(assistantBubbles.last()).toContainText("مبدأ، مقصد و تاریخ دقیق");
    await expect(page.getByRole("heading", { name: "دستیار هوشمند سفر", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "دستیار هوشمند", exact: true })).toHaveCount(0);
    await expect(conversation.locator("li strong, li img, li svg")).toHaveCount(0);
    await expect(userBubble).toHaveCSS("background-color", "rgb(245, 245, 245)");
    await expect(assistantBubbles.last()).toHaveCSS("background-color", "rgb(245, 240, 255)");
    await expect(userBubble.locator("p")).toHaveCSS("white-space", "pre-wrap");
    const listBox = (await conversation.locator("ol").boundingBox())!;
    const userBox = (await userBubble.boundingBox())!;
    const assistantBox = (await assistantBubbles.last().boundingBox())!;
    expect(Math.abs(userBox.x + userBox.width - listBox.x - listBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(assistantBox.x - listBox.x)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(composer).toBeEditable();
    await page.screenshot({ path: `test-results/assistant-conversation-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "بازگشت به جست‌وجوی پرواز", exact: true }).click();
    await expect(page.getByRole("tablist", { name: "نوع سفر", exact: true })).toBeVisible();
  });
}

test("quota failure preserves the request and keeps real structured recommendations usable", async ({ page }) => {
  let searches = 0;
  page.on("request", (request) => { if (request.url().endsWith("/api/assistant/recommend")) searches++; });
  await page.route("**/api/assistant/interpret", async (route) => {
    const request = route.request().postDataJSON() as AssistantInterpretRequest;
    await fulfillInterpretation(route, interpreted(request.intent, { state: "quota", model: "controlled-test-model",
      message: "اعتبار یا سقف هزینه سرویس هوش مصنوعی کافی نیست؛ ترجیحات دستی حفظ شده‌اند." }));
  });
  await page.goto("/ai-assistant");
  const message = "می‌خوام جمعه از تهران به مشهد برم، زیر ۳ میلیون تومان باشه و سابقه لغوش کم باشه.";
  await submit(page, message);
  const conversation = page.getByRole("region", { name: "گفت‌وگوی سفر", exact: true });
  await expect(conversation).toContainText(message);
  await expect(conversation).toContainText("اعتبار یا سقف هزینه");
  await expect(page.getByRole("button", { name: "ترجیحات سفر", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(cards(page)).toHaveCount(0); expect(searches).toBe(0);
  await setRoute(page);
  const result = await search(page); expect(result.recommendations).toHaveLength(3);
});

test("missing model credentials stay honest while actual structured recommendations, details and ranking work", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/ai-assistant");
  const status = await page.request.get("/api/assistant/interpret");
  expect((await status.json()).data.configured).toBe(false);
  const interpretedResponse = page.waitForResponse((response) => response.url().endsWith("/api/assistant/interpret") && response.request().method() === "POST");
  const privateMessage = "از تهران به مشهد می‌روم؛ این پیام نباید ذخیره شود";
  await submit(page, privateMessage);
  expect((await (await interpretedResponse).json()).data.state).toBe("unavailable");
  await expect(page.getByRole("region", { name: "گفت‌وگوی سفر", exact: true })).toContainText(privateMessage);
  await expect(page.getByRole("button", { name: "ترجیحات سفر", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(cards(page)).toHaveCount(0);
  await setRoute(page);
  const initial = await search(page); expect(initial.recommendations).toHaveLength(3);
  expect(initial.totalCandidates).toBeGreaterThanOrEqual(3);
  await expect(cards(page).first()).toContainText(formatJalaliDate(departureDate));
  for (let index = 0; index < initial.recommendations.length; index += 1) {
    const offer = initial.recommendations[index].legs[0].selectedOffer;
    await expect(cards(page).nth(index).locator(".price")).toHaveText(formatToman(offer.totalPrice));
    expect(offer.source.mode).toBe("demo");
  }
  await expect(page.getByRole("region", { name: "پروازهای پیشنهادی برای تو", exact: true })).toContainText("اطلاعات آزمایشی");
  await page.getByRole("button", { name: "چرا این پرواز پیشنهاد شده؟", exact: true }).first().click();
  const explanation = page.getByRole("dialog", { name: "دلیل پیشنهاد پرواز", exact: true });
  await expect(explanation).toContainText("امتیاز، احتمال لغو یا تضمین سفر نیست");
  await expect(explanation.getByRole("table")).toBeVisible();
  await page.keyboard.press("Escape");
  await cards(page).first().getByRole("button", { name: /^جزئیات پرواز/ }).click();
  await expect(page.getByRole("dialog", { name: "جزئیات پرواز", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "پیشنهادهای فروشندگان", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  await expandPreferences(page);
  const morningResponse = recommendationResponse(page, (intent) => intent.soft.departurePeriod === "morning");
  await page.getByRole("combobox", { name: "ساعت حرکت ترجیحی", exact: true }).selectOption("morning");
  const morning = await recommendations(morningResponse);
  expect(morning.recommendations).toHaveLength(3);
  await expandPreferences(page);
  const priceResponse = recommendationResponse(page, (intent) => intent.soft.priorities.includes("price"));
  await page.getByRole("button", { name: "قیمت کمتر", exact: true }).click();
  const price = await recommendations(priceResponse);
  expect(price.recommendations[0].dimensions.find((row) => row.dimension === "price")!.weight).toBeGreaterThan(initial.recommendations[0].dimensions.find((row) => row.dimension === "price")!.weight);
  await expandPreferences(page);
  const historyResponse = recommendationResponse(page, (intent) => intent.soft.priorities.includes("history"));
  await page.getByRole("button", { name: "سابقه لغو کمتر", exact: true }).click();
  const history = await recommendations(historyResponse);
  expect(history.recommendations[0].dimensions.find((row) => row.dimension === "history")!.weight).toBeGreaterThan(price.recommendations[0].dimensions.find((row) => row.dimension === "history")!.weight);

  await expandPreferences(page);
  await page.getByRole("button", { name: "ویرایش بودجه، بار و شرایط بلیط", exact: true }).click();
  const constraints = page.getByRole("dialog", { name: "شرایط الزامی سفر", exact: true });
  await constraints.getByRole("textbox", { name: "سقف بودجه کل به تومان", exact: true }).fill("۱");
  const emptyResponse = recommendationResponse(page, (intent) => intent.hard.maxTotalPriceRials === 10);
  await constraints.getByRole("button", { name: "تأیید شرایط", exact: true }).click();
  const empty = await recommendations(emptyResponse); expect(empty.recommendations).toHaveLength(0);
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByText("پروازی مطابق تمام شرایطت پیدا نکردیم.", { exact: true }).first()).toBeVisible();
  const stored = await page.evaluate((key) => sessionStorage.getItem(key), sessionKey);
  expect(stored).not.toContain(privateMessage); expect(JSON.parse(stored!).intent.hard.maxTotalPriceRials).toBe(10);
  const browserStorage = await page.evaluate(() => JSON.stringify({ session: { ...sessionStorage }, local: { ...localStorage } }));
  expect(browserStorage).not.toContain(privateMessage);
  const refreshSearches: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith("/api/assistant/recommend")) refreshSearches.push(request.url()); });
  await page.reload();
  await expect(page.getByRole("button", { name: "ترجیحات سفر", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "اعمال ترجیحات", exact: true })).toHaveCount(0);
  await expandPreferences(page);
  await expect(page.getByRole("button", { name: "مبدأ دستیار", exact: true })).toHaveAttribute("data-airport-code", "THR");
  await expect(page.getByRole("button", { name: "تاریخ رفت دستیار", exact: true })).toHaveText(formatJalaliDate(departureDate));
  await expect(page.getByRole("button", { name: "بودجه کل: ۱ تومان", exact: true })).toBeVisible();
  await expect(page.getByText(privateMessage, { exact: true })).toHaveCount(0);
  await expect(cards(page)).toHaveCount(0); expect(refreshSearches).toEqual([]);
});

test("controlled interpretation UI handles missing dates, follow-up merging, confirmed conflicts and corrections", async ({ page }) => {
  const requests: AssistantInterpretRequest[] = [];
  await page.route("**/api/assistant/interpret", async (route) => {
    const request = route.request().postDataJSON() as AssistantInterpretRequest; requests.push(request);
    const previous = request.intent;
    if (requests.length === 1) return fulfillInterpretation(route, interpreted({ ...previous, origin: "THR", destination: "MHD" }, { patch: { origin: "THR", destination: "MHD" }, needsClarification: true, question: "چه تاریخی برای سفرت در نظر داری؟" }));
    if (requests.length === 2) {
      const intent: TravelIntent = { ...previous, departureDate, hard: { ...previous.hard, maxTotalPriceRials: 40_000_000 }, soft: { ...previous.soft, departurePeriod: "morning" } };
      return fulfillInterpretation(route, interpreted(intent, { patch: { departureDate, hard: { maxTotalPriceRials: 40_000_000 }, soft: { departurePeriod: "morning" } } }));
    }
    if (requests.length === 3 || requests.length === 4) return fulfillInterpretation(route, interpreted(previous, { patch: { hard: { maxTotalPriceRials: 50_000_000 } }, conflicts: [{ field: "hard.maxTotalPriceRials", current: previous.hard.maxTotalPriceRials, proposed: 50_000_000 }] }));
    return fulfillInterpretation(route, interpreted({ ...previous, soft: { ...previous.soft, priorities: ["price", "history"] } }, { patch: { soft: { priorities: ["price", "history"] } } }));
  });
  await page.goto("/ai-assistant");
  await page.getByRole("button", { name: "ارزان‌ترین پرواز تهران به مشهد رو پیدا کن", exact: true }).click();
  await expect(page.getByRole("region", { name: "گفت‌وگوی سفر", exact: true })).toContainText("چه تاریخی برای سفرت در نظر داری؟");
  await expect(cards(page)).toHaveCount(0);
  const response = recommendationResponse(page);
  await submit(page, "۲۸ مهر، بودجه چهار میلیون و ترجیحاً صبح");
  const initial = await recommendations(response); expect(initial.recommendations.length).toBeGreaterThan(0);
  expect(requests[1].intent).toMatchObject({ origin: "THR", destination: "MHD", departureDate: null });
  await expect(page.getByText("controlled-test-model", { exact: true })).toHaveCount(0);

  await expect(page.getByRole("button", { name: "ترجیحات سفر", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expandPreferences(page);
  await page.getByRole("button", { name: /^بودجه/ }).click();
  const constraints = page.getByRole("dialog", { name: "شرایط الزامی سفر", exact: true });
  await constraints.getByRole("textbox", { name: "سقف بودجه کل به تومان", exact: true }).fill("۴٬۰۰۰٬۰۰۰");
  // Change explicitly, so the field becomes locked even though the model originally supplied a budget.
  await constraints.getByRole("textbox", { name: "سقف بودجه کل به تومان", exact: true }).fill("۴٬۵۰۰٬۰۰۰");
  const edited = recommendationResponse(page, (intent) => intent.hard.maxTotalPriceRials === 45_000_000);
  await constraints.getByRole("button", { name: "تأیید شرایط", exact: true }).click(); await recommendations(edited);
  await submit(page, "بودجه را پنج میلیون کن");
  const conflict = page.getByRole("region", { name: "تأیید تغییر انتخاب‌های قبلی", exact: true });
  await expect(conflict).toContainText("۴٬۵۰۰٬۰۰۰ تومان"); await expect(conflict).toContainText("۵٬۰۰۰٬۰۰۰ تومان");
  expect(requests[2].confirmedFields).toContain("hard.maxTotalPriceRials");
  await conflict.getByRole("button", { name: "حفظ انتخاب‌های قبلی", exact: true }).click();
  await expect(page.getByRole("button", { name: "بودجه کل: ۴٬۵۰۰٬۰۰۰ تومان", exact: true })).toBeVisible();
  await submit(page, "تأیید می‌کنم بودجه پنج میلیون شود");
  await expect(conflict).toBeVisible();
  const confirmed = recommendationResponse(page, (intent) => intent.hard.maxTotalPriceRials === 50_000_000);
  await conflict.getByRole("button", { name: "تأیید تغییرات پیشنهادی", exact: true }).click(); await recommendations(confirmed);
  const refinement = recommendationResponse(page, (intent) => intent.soft.priorities.includes("price") && intent.soft.priorities.includes("history"));
  await submit(page, "ارزان‌تر و با سابقه لغو کمتر"); await recommendations(refinement);
  expect(requests[4].intent).toMatchObject({ origin: "THR", destination: "MHD", departureDate, hard: { maxTotalPriceRials: 50_000_000 }, soft: { departurePeriod: "morning" } });
  expect(requests[4].history!.length).toBeGreaterThan(0);
  await expect(page.getByRole("region", { name: "گفت‌وگوی سفر", exact: true }).getByText("ارزان‌تر و با سابقه لغو کمتر", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "ترجیحات سفر", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expandPreferences(page);
  await expect(page.getByRole("button", { name: "بودجه کل: ۵٬۰۰۰٬۰۰۰ تومان", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "قیمت کمتر", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "سابقه لغو کمتر", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(cards(page)).toHaveCount(0);
  expect(requests).toHaveLength(5);
});

test("composer supports multiline, locks duplicate submissions and reports controlled provider failures", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let posts = 0;
  await page.route("**/api/assistant/interpret", async (route) => {
    posts += 1; await gate;
    const request = route.request().postDataJSON() as AssistantInterpretRequest;
    await fulfillInterpretation(route, { ...interpreted(request.intent), state: "timeout", model: null, message: "زمان پاسخ سرویس مدل تمام شد؛ ترجیحات قبلی حفظ شدند.", needsClarification: true });
  });
  await page.goto("/ai-assistant");
  const composer = messageField(page);
  await composer.fill("تهران به مشهد"); await composer.press("Shift+Enter"); await composer.type("صبح حرکت کنم");
  await expect(composer).toHaveValue("تهران به مشهد\nصبح حرکت کنم"); expect(posts).toBe(0);
  await composer.press("Enter"); await expect(page.getByRole("button", { name: "ارسال پیام", exact: true })).toBeDisabled();
  await composer.fill("درخواست تکراری"); await composer.press("Enter");
  await expect(page.getByRole("region", { name: "گفت‌وگوی سفر", exact: true })).toHaveAttribute("aria-busy", "true");
  await expect.poll(() => posts).toBe(1); release();
  await expect(page.getByRole("region", { name: "گفت‌وگوی سفر", exact: true })).toContainText("زمان پاسخ سرویس مدل تمام شد");
  await expect(cards(page)).toHaveCount(0);
  await page.unroute("**/api/assistant/interpret");
  await page.route("**/api/assistant/interpret", (route) => route.abort("failed"));
  await submit(page, "متن قابل بازیابی پس از خطای شبکه");
  await expect(composer).toHaveValue("متن قابل بازیابی پس از خطای شبکه");
  await expect(page.getByRole("button", { name: "ترجیحات سفر", exact: true })).toHaveAttribute("aria-expanded", "false");
});

test("controlled ambiguous-weekend clarification never invents a departure date", async ({ page }) => {
  await page.route("**/api/assistant/interpret", async (route) => {
    const request = route.request().postDataJSON() as AssistantInterpretRequest;
    await fulfillInterpretation(route, interpreted(request.intent, { needsClarification: true, question: "برای آخر هفته، پنجشنبه را می‌خواهی یا جمعه؛ این هفته یا هفته آینده؟" }));
  });
  const searches: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith("/api/assistant/recommend")) searches.push(request.url()); });
  await page.goto("/ai-assistant");
  await page.getByRole("button", { name: "برای آخر هفته یه پرواز با سابقه لغو کمتر می‌خوام", exact: true }).click();
  await expect(page.getByRole("region", { name: "گفت‌وگوی سفر", exact: true })).toContainText("پنجشنبه را می‌خواهی یا جمعه");
  await expandPreferences(page);
  await expect(page.getByRole("button", { name: "تاریخ رفت دستیار", exact: true })).toHaveText("تاریخ را انتخاب کنید");
  expect(searches).toEqual([]);
});

test("mobile keyboard viewport remains usable and a departed route ignores delayed interpretation", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 640 });
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/assistant/interpret", async (route) => {
    await gate;
    try { await fulfillInterpretation(route, interpreted({ ...emptyTravelIntent(), origin: "THR", destination: "MHD", departureDate })); }
    catch { /* The browser may have already canceled this test-only response on route unmount. */ }
  });
  await page.goto("/ai-assistant");
  await setRoute(page);
  const mobileResults = await search(page);
  expect(mobileResults.recommendations).toHaveLength(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: "test-results/assistant-mobile-recommendations.png", fullPage: true });
  const composer = messageField(page); await composer.focus();
  await page.evaluate(() => {
    if (!window.visualViewport) throw new Error("VisualViewport unavailable in QA browser");
    Object.defineProperty(window.visualViewport, "height", { configurable: true, value: 360 });
    Object.defineProperty(window.visualViewport, "offsetTop", { configurable: true, value: 0 });
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await expect(composer).toBeInViewport();
  await expect.poll(async () => { const box = (await composer.boundingBox())!; return box.y + box.height; }).toBeLessThanOrEqual(361);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const style = await composer.evaluate((element) => getComputedStyle(element.closest("form")!.parentElement!).getPropertyValue("--assistant-keyboard-inset"));
  expect(Number.parseFloat(style)).toBeGreaterThan(0);
  await page.evaluate(() => { delete (window.visualViewport as unknown as { height?: number }).height; delete (window.visualViewport as unknown as { offsetTop?: number }).offsetTop; window.visualViewport?.dispatchEvent(new Event("resize")); });
  await submit(page, "پیام کند برای آزمون لغو درخواست");
  await expect(page.getByRole("button", { name: "ارسال پیام", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "بازگشت به جست‌وجوی پرواز", exact: true }).click();
  await expect(page.getByRole("tablist", { name: "نوع سفر", exact: true })).toBeVisible();
  await expect(cards(page)).toHaveCount(16); release();
  await expect(cards(page)).toHaveCount(16);
  await expect(page.getByRole("heading", { name: "دستیار هوشمند سفر", exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const mode of ["fixture", "live"] as const) {
  test(`explicit ${mode} mode never receives demo recommendations`, async ({ page }) => {
    await page.goto(`/?mode=${mode}`);
    const entry = page.getByRole("link", { name: "دستیار هوشمند", exact: true });
    await expect(entry).toHaveAttribute("href", `/ai-assistant?mode=${mode}`); await entry.click();
    await expect(page).toHaveURL(new RegExp(`/ai-assistant\\?mode=${mode}$`));
    const intent: TravelIntent = { ...emptyTravelIntent(), mode, origin: "THR", destination: "MHD", departureDate: mode === "fixture" ? "2026-10-15" : departureDate };
    // Exercise actual server mode boundaries without authoring inventory or provider responses.
    const result = await page.request.post("/api/assistant/recommend", { data: { intent } });
    expect(result.status()).toBe(200);
    const data = (await result.json()).data as AssistantRecommendationResponse;
    expect(data.recommendations).toEqual([]);
    if (mode === "fixture") expect(data.question).toContain("واحد مبلغ پاسخ مرجع تأیید نشده");
    else if (data.outbound) { expect(data.outbound.mode).toBe("live"); expect(data.outbound.flights).toEqual([]); }
    await expect(cards(page)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "بازگشت به جست‌وجوی پرواز", exact: true })).toHaveAttribute("href", `/?mode=${mode}`);
  });
}

test("primary Apply preferences validates inputs and runs real recommendations without an LLM request", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  let interpretations = 0;
  let searches = 0;
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    if (request.url().endsWith("/api/assistant/interpret")) interpretations += 1;
    if (request.url().endsWith("/api/assistant/recommend")) searches += 1;
  });
  await page.goto("/ai-assistant");
  const preferences = page.getByRole("region", { name: "ترجیحات سفر", exact: true });
  await expect(preferences.getByRole("button", { name: "اعمال ترجیحات", exact: true })).toHaveCount(0);
  await expandPreferences(page);
  const apply = preferences.getByRole("button", { name: /^(اعمال ترجیحات|در حال بررسی پروازها…)$/ });
  await expect(apply).toHaveText("اعمال ترجیحات");
  await expect(apply).toHaveClass(/button-coral/);
  await expect(apply).toHaveCSS("background-color", "rgb(239, 20, 43)");
  await expect(apply).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(apply).toBeEnabled();
  await apply.focus();
  await expect(apply).toBeFocused();
  await apply.click();
  await expect(page.getByRole("region", { name: "گفت‌وگوی سفر", exact: true })).toBeVisible();
  expect(searches).toBe(0); expect(interpretations).toBe(0);
  await setRoute(page);
  await page.getByRole("combobox", { name: "ساعت حرکت ترجیحی", exact: true }).selectOption("morning");
  await page.getByRole("button", { name: "سابقه لغو کمتر", exact: true }).click();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/assistant/recommend", async (route) => {
    await gate;
    // Delay delivery only; the real application endpoint supplies and ranks all offers.
    await route.continue();
  });
  const response = recommendationResponse(page);
  await apply.click();
  await expect(apply).toBeDisabled();
  await expect(apply).toHaveText("در حال بررسی پروازها…");
  await expect.poll(() => searches).toBe(1);
  release();
  const data = await recommendations(response);
  expect(data.recommendations).toHaveLength(3);
  await expect(cards(page)).toHaveCount(3);
  const first = data.recommendations[0];
  expect(first.selection.legs[0].flight.segments[0].origin).toBe("THR");
  expect(first.selection.legs[0].flight.segments.at(-1)!.destination).toBe("MHD");
  expect(first.dimensions.find((dimension) => dimension.dimension === "history")!.weight).toBeGreaterThan(0);
  await expect(apply).toBeEnabled();
  await expect(apply).toHaveText("اعمال ترجیحات");
  const repeated = recommendationResponse(page, (intent) => intent.soft.departurePeriod === "morning" && intent.soft.priorities.includes("history"));
  await apply.click();
  await recommendations(repeated);
  expect(searches).toBe(2); expect(interpretations).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("empty preferences stay collapsed on reload and only the accessible trigger toggles their fields", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  const posts: string[] = []; const errors: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST" && /\/api\/assistant\/(interpret|recommend)$/.test(request.url())) posts.push(request.url()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/ai-assistant");
  const trigger = page.getByRole("button", { name: "ترجیحات سفر", exact: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  const content = page.locator(`[id="${await trigger.getAttribute("aria-controls")}"]`);
  await expect(content).toBeHidden();
  const closedChevron = await trigger.locator("svg").last().evaluate((element) => getComputedStyle(element).transform);
  await trigger.focus(); await trigger.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(content).toBeVisible();
  await expect(page.getByRole("button", { name: "اعمال ترجیحات", exact: true })).toBeVisible();
  const openChevron = await trigger.locator("svg").last().evaluate((element) => getComputedStyle(element).transform);
  expect(openChevron).not.toBe(closedChevron);
  await expect(page.getByRole("button", { name: "مبدأ دستیار", exact: true })).toHaveAttribute("data-airport-code", "");
  await expect(page.getByRole("button", { name: "مقصد دستیار", exact: true })).toHaveAttribute("data-airport-code", "");
  await expect(page.getByRole("button", { name: "تاریخ رفت دستیار", exact: true })).toHaveText("تاریخ را انتخاب کنید");
  await expect(page.getByRole("combobox", { name: "تعداد بزرگسالان دستیار", exact: true })).toHaveValue("1");
  await trigger.press("Space");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(content).toBeHidden();
  await expect(trigger.locator("svg").last()).toHaveCSS("transform", closedChevron);
  await expandPreferences(page);
  await page.reload();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "اعمال ترجیحات", exact: true })).toHaveCount(0);
  expect(posts).toEqual([]); expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("reload restores the latest full saved and manually edited preferences without opening or requesting AI", async ({ page }) => {
  const empty = emptyTravelIntent();
  const intent: TravelIntent = { ...empty, origin: "THR", destination: "MHD", departureDate, returnDate: "2026-10-24", tripType: "round-trip", passengers: { adults: 2, children: 0, infants: 0 },
    hard: { ...empty.hard, maxTotalPriceRials: 41_500_000, minimumCheckedKg: 20, nonstopOnly: true, refundableOnly: true, departurePeriod: "morning", riskCategories: ["low"], airlineIds: ["IRA"] },
    soft: { ...empty.soft, departurePeriod: "morning", priorities: ["price", "history"], preferredAirlineIds: ["IRM"] } };
  const confirmedFields = ["origin", "destination", "departureDate", "returnDate", "passengers.adults", "hard.maxTotalPriceRials"];
  await page.addInitScript(({ key, saved }) => { if (sessionStorage.getItem(key) === null) sessionStorage.setItem(key, JSON.stringify(saved)); }, { key: sessionKey, saved: { intent, confirmedFields } });
  const posts: string[] = []; const errors: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST" && /\/api\/assistant\/(interpret|recommend)$/.test(request.url())) posts.push(request.url()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/ai-assistant");
  const preferences = page.getByRole("region", { name: "ترجیحات سفر", exact: true });
  const trigger = preferences.getByRole("button", { name: "ترجیحات سفر", exact: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect.poll(async () => (await preferences.innerText()).trim()).toBe("ترجیحات سفر");
  await expect(trigger.locator("svg")).toHaveCount(2);
  await expandPreferences(page);
  await expect(page.getByRole("button", { name: "مبدأ دستیار", exact: true })).toHaveAttribute("data-airport-code", "THR");
  await expect(page.getByRole("button", { name: "مقصد دستیار", exact: true })).toHaveAttribute("data-airport-code", "MHD");
  await expect(page.getByRole("button", { name: "تاریخ رفت دستیار", exact: true })).toHaveText(formatJalaliDate(departureDate));
  await expect(page.getByRole("button", { name: "تاریخ برگشت دستیار", exact: true })).toHaveText(formatJalaliDate("2026-10-24"));
  await expect(page.getByRole("combobox", { name: "نوع سفر دستیار", exact: true })).toHaveValue("round-trip");
  await expect(page.getByRole("combobox", { name: "تعداد بزرگسالان دستیار", exact: true })).toHaveValue("2");
  await expect(page.getByRole("combobox", { name: "ساعت حرکت ترجیحی", exact: true })).toHaveValue("morning");
  await expect(page.getByRole("button", { name: "قیمت کمتر", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "سابقه لغو کمتر", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "بودجه کل: ۴٬۱۵۰٬۰۰۰ تومان", exact: true }).click();
  const constraints = page.getByRole("dialog", { name: "شرایط الزامی سفر", exact: true });
  await expect(constraints.getByRole("textbox", { name: "سقف بودجه کل به تومان", exact: true })).toHaveValue("۴٬۱۵۰٬۰۰۰");
  await expect(constraints.getByRole("textbox", { name: "حداقل بار تحویلی هر بزرگسال (کیلوگرم)", exact: true })).toHaveValue("۲۰");
  await expect(constraints.getByRole("combobox", { name: "بازه حرکت الزامی", exact: true })).toHaveValue("morning");
  await expect(constraints.getByRole("checkbox", { name: "فقط پرواز بدون توقف", exact: true })).toBeChecked();
  await expect(constraints.getByRole("checkbox", { name: "امکان استرداد الزامی است", exact: true })).toBeChecked();
  await expect(constraints.getByRole("checkbox", { name: "کم (کمتر از ۱۰٪)", exact: true })).toBeChecked();
  await page.keyboard.press("Escape");
  const latest: TravelIntent = { ...intent, origin: "MHD", destination: "THR", departureDate: "2026-10-22", returnDate: "2026-10-26", passengers: { adults: 3, children: 0, infants: 0 }, hard: { ...intent.hard, maxTotalPriceRials: 90_000_000 } };
  await page.evaluate(({ key, saved }) => sessionStorage.setItem(key, JSON.stringify(saved)), { key: sessionKey, saved: { intent: latest, confirmedFields } });
  await page.reload();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect.poll(async () => (await preferences.innerText()).trim()).toBe("ترجیحات سفر");
  await expandPreferences(page);
  await expect(page.getByRole("button", { name: "مبدأ دستیار", exact: true })).toHaveAttribute("data-airport-code", "MHD");
  await expect(page.getByRole("button", { name: "مقصد دستیار", exact: true })).toHaveAttribute("data-airport-code", "THR");
  await expect(page.getByRole("button", { name: "تاریخ رفت دستیار", exact: true })).toHaveText(formatJalaliDate("2026-10-22"));
  await expect(page.getByRole("button", { name: "تاریخ برگشت دستیار", exact: true })).toHaveText(formatJalaliDate("2026-10-26"));
  await expect(page.getByRole("combobox", { name: "تعداد بزرگسالان دستیار", exact: true })).toHaveValue("3");
  await expect(page.getByRole("button", { name: "بودجه کل: ۹٬۰۰۰٬۰۰۰ تومان", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "تعداد بزرگسالان دستیار", exact: true }).selectOption("4");
  await page.reload();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect.poll(async () => (await preferences.innerText()).trim()).toBe("ترجیحات سفر");
  await expandPreferences(page);
  await expect(page.getByRole("combobox", { name: "تعداد بزرگسالان دستیار", exact: true })).toHaveValue("4");
  await expect(page.getByRole("button", { name: "بودجه کل: ۹٬۰۰۰٬۰۰۰ تومان", exact: true })).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
  expect(posts).toEqual([]); expect(errors).toEqual([]);
});

for (const invalidSaved of ["corrupt", "other-source"] as const) {
  test(`${invalidSaved} saved preferences restore honest empty defaults and remain closed`, async ({ page }) => {
    const raw = invalidSaved === "corrupt" ? "{broken" : JSON.stringify({ intent: { ...emptyTravelIntent(), mode: "live", origin: "THR", destination: "MHD", departureDate }, confirmedFields: ["origin", "destination"] });
    await page.addInitScript(({ key, value }) => { if (sessionStorage.getItem(key) === null) sessionStorage.setItem(key, value); }, { key: sessionKey, value: raw });
    await page.goto("/ai-assistant");
    const trigger = page.getByRole("button", { name: "ترجیحات سفر", exact: true });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expandPreferences(page);
    await expect(page.getByRole("button", { name: "مبدأ دستیار", exact: true })).toHaveAttribute("data-airport-code", "");
    await expect(page.getByRole("button", { name: "مقصد دستیار", exact: true })).toHaveAttribute("data-airport-code", "");
    await expect(page.getByRole("button", { name: "تاریخ رفت دستیار", exact: true })).toHaveText("تاریخ را انتخاب کنید");
    await expect(page.getByRole("combobox", { name: "تعداد بزرگسالان دستیار", exact: true })).toHaveValue("1");
    await page.reload();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(cards(page)).toHaveCount(0);
  });
}

test("expired saved travel dates clear without inventing replacements or discarding the valid remaining preferences", async ({ page }) => {
  const empty = emptyTravelIntent();
  const intent: TravelIntent = { ...empty, origin: "THR", destination: "MHD", departureDate: "2026-10-15", returnDate: "2026-10-16", tripType: "round-trip", passengers: { adults: 2, children: 0, infants: 0 }, hard: { ...empty.hard, maxTotalPriceRials: 60_000_000 }, soft: { ...empty.soft, priorities: ["history"] } };
  await page.addInitScript(({ key, value }) => { if (sessionStorage.getItem(key) === null) sessionStorage.setItem(key, JSON.stringify(value)); }, { key: sessionKey, value: { intent, confirmedFields: ["origin", "destination", "departureDate", "returnDate", "hard.maxTotalPriceRials"] } });
  const posts: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST" && /\/api\/assistant\/(interpret|recommend)$/.test(request.url())) posts.push(request.url()); });
  await page.goto("/ai-assistant");
  await expect(page.getByRole("button", { name: "ترجیحات سفر", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect.poll(async () => (await page.getByRole("region", { name: "ترجیحات سفر", exact: true }).innerText()).trim()).toBe("ترجیحات سفر");
  await expandPreferences(page);
  await expect(page.getByRole("button", { name: "مبدأ دستیار", exact: true })).toHaveAttribute("data-airport-code", "THR");
  await expect(page.getByRole("button", { name: "مقصد دستیار", exact: true })).toHaveAttribute("data-airport-code", "MHD");
  await expect(page.getByRole("button", { name: "تاریخ رفت دستیار", exact: true })).toHaveText("تاریخ را انتخاب کنید");
  await expect(page.getByRole("button", { name: "تاریخ برگشت دستیار", exact: true })).toHaveText("تاریخ را انتخاب کنید");
  await expect(page.getByRole("combobox", { name: "تعداد بزرگسالان دستیار", exact: true })).toHaveValue("2");
  await expect(page.getByRole("button", { name: "بودجه کل: ۶٬۰۰۰٬۰۰۰ تومان", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "سابقه لغو کمتر", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(posts).toEqual([]);
});
