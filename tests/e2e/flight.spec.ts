import { expect, test, type Locator, type Page } from "@playwright/test";

const legacyResults = "/results?mode=demo&origin=IKA&destination=IST&date=2026-10-16&adults=1";
const fixedDemoResults = "/results?origin=THR&destination=MHD&date=2026-10-16&adults=1&mode=demo";

async function openFixedDemoHomepage(page: Page) {
  // Deep links share the unified homepage and remain independent of the host clock.
  await page.goto(fixedDemoResults.replace("/results?", "/?"));
}

async function chooseAirport(page: Page, label: "مبدأ" | "مقصد", code: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `انتخاب ${label}`, exact: true });
  await dialog.getByRole("combobox", { name: "جست‌وجوی شهر یا فرودگاه", exact: true }).fill(code);
  await dialog.getByRole("option", { name: new RegExp(`، ${code}$`) }).click();
  await expect(dialog).not.toBeVisible();
}

async function openFlight(page: Page, card: Locator = page.locator(".flight-card").first()) {
  await card.scrollIntoViewIfNeeded();
  const route = (await card.locator(".ticket-route").boundingBox())!;
  await page.mouse.click(route.x + route.width / 2, route.y + route.height / 2);
  const dialog = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function applyFilters(scope: Page | Locator) {
  await scope.getByRole("button", { name: "اعمال فیلترها", exact: true }).click();
}

async function setRangeValue(slider: Locator, value: number) {
  await slider.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, String(nextValue));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function expectCompactFooter(card: Locator) {
  await expect(card.locator(".ticket-review-empty, .ticket-actions")).toHaveCount(0);
  expect(await card.innerText()).not.toMatch(/نظرات کاربران|دیدگاهی در دسترس نیست/);
  const footer = card.locator(".ticket-meta");
  await expect(footer.locator(":scope > .ticket-meta-details")).toHaveCount(1);
  await expect(footer.locator(":scope > .compare-text-action")).toHaveCount(1);
  const layout = await footer.evaluate((element) => {
    const footer = element.getBoundingClientRect();
    const card = element.closest(".flight-card")!.getBoundingClientRect();
    const details = element.querySelector(".ticket-meta-details")!.getBoundingClientRect();
    const compare = element.querySelector(".compare-text-action")!.getBoundingClientRect();
    return {
      divider: getComputedStyle(element).borderBlockStartStyle,
      compareBelowDivider: compare.top >= footer.top + 1,
      insideCard: [details, compare].every((bounds) => bounds.left >= card.left - 1 && bounds.right <= card.right + 1 && bounds.bottom <= card.bottom + 1),
      overlaps: Math.min(details.right, compare.right) - Math.max(details.left, compare.left) > 1
        && Math.min(details.bottom, compare.bottom) - Math.max(details.top, compare.top) > 1,
    };
  });
  expect(layout).toEqual({ divider: "dashed", compareBelowDivider: true, insideCard: true, overlaps: false });
}

async function toggleFooterComparison(page: Page, card: Locator) {
  const compare = card.locator(".ticket-meta > .compare-text-action");
  await expect(compare).toHaveAttribute("aria-pressed", "false");
  await compare.click();
  await expect(compare).toHaveAttribute("aria-pressed", "true");
  await expect(compare).toHaveAccessibleName("حذف از مقایسه");
  await expect(page.locator(".comparison-bar")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "جزئیات پرواز", exact: true })).not.toBeVisible();
  await compare.click();
  await expect(compare).toHaveAttribute("aria-pressed", "false");
  await expect(compare).toHaveAccessibleName("افزودن به مقایسه");
  await expect(page.locator(".comparison-bar")).toHaveCount(0);
}

test("the branded RTL homepage starts empty and explicit demo searches load offline with Jalali dates and provenance", async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  const fontRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (request.resourceType() === "font") fontRequests.push(request.url()); });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith("http") && !["127.0.0.1", "localhost"].includes(url.hostname)) {
      external.push(url.href);
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/");
  await expect(page.locator(".flight-card")).toHaveCount(0);
  await expect(page.locator("#results-title")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "مبدأ", exact: true })).toContainText("شهر مبدأ را انتخاب کنید");
  await expect(page.getByRole("button", { name: "مقصد", exact: true })).toContainText("شهر مقصد را انتخاب کنید");
  await expect(page.getByRole("button", { name: "تاریخ رفت", exact: true })).toContainText("تاریخ رفت را انتخاب کنید");
  await openFixedDemoHomepage(page);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("header").getByRole("link", { name: "ترب بلیط، صفحه اصلی", exact: true })).toContainText("ترب بلیط");
  await expect(page.locator(".flight-card")).toHaveCount(16);
  await expect(page.locator("#results-title")).toContainText("پروازهای تهران به مشهد");
  await expect(page.locator(".demo-notice")).toHaveCount(0);
  for (const card of await page.locator(".flight-card").all()) {
    await expect(card.locator("button.risk-indicator")).toBeVisible();
    await expect(card.locator(".price")).toContainText("تومان");
    await expect(card.locator(".ticket-date").first()).toHaveText("۲۴ مهر ۱۴۰۵");
    await expect(card.locator(".ticket-review-empty")).toHaveCount(0);
    expect(await card.innerText()).not.toMatch(/نظرات کاربران|دیدگاهی در دسترس نیست/);
  }
  await expect(page.locator(".results-mode-label")).toHaveText("اطلاعات آزمایشی");
  await expect(page.locator(".search-source-note")).toHaveCount(0);
  const visual = await page.evaluate(async () => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const unquote = (value: string) => value.trim().replace(/^["']|["']$/g, "");
    const family = unquote(body.fontFamily.split(",")[0]);
    const weights = [400, 500, 700, 800];
    // An unknown family can make FontFaceSet.check return true via fallback;
    // require actual registered faces and a completed load for every supplied weight.
    const loaded = await Promise.all(weights.map((weight) => document.fonts.load(`${weight} 16px ${JSON.stringify(family)}`, "ترب بلیط ۱۲۳")));
    const faces = [...document.fonts].filter((face) => unquote(face.family) === family);
    return {
      tokens: Object.fromEntries([
        "--color-brand-primary", "--color-brand-primary-hover", "--color-carbon", "--color-graphite", "--color-ash", "--color-fog", "--color-linen", "--color-mist",
        "--radius-cards", "--radius-inputs", "--radius-buttons", "--page-max-width", "--section-gap", "--card-padding", "--element-gap",
        "--text-caption", "--text-body", "--text-ui", "--text-subheading", "--text-heading-sm", "--text-heading", "--text-display", "--font-weight-semibold",
      ].map((token) => [token, root.getPropertyValue(token).trim().toLowerCase()
        // Production CSS may shorten an equivalent six-digit hex color.
        .replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/u, "#$1$1$2$2$3$3")])),
      family,
      localFamily: unquote(body.getPropertyValue("--font-yekan-bakh-local").split(",")[0]),
      fontLoaded: weights.map((weight, index) => ({ weight: String(weight), loaded: loaded[index].length > 0 && document.fonts.check(`${weight} 16px ${JSON.stringify(family)}`, "ترب بلیط ۱۲۳") })),
      faces: faces.map((face) => ({ weight: face.weight, status: face.status })),
      canvas: body.backgroundColor,
      bodyColor: body.color,
      bodySize: body.fontSize,
      bodyTracking: body.letterSpacing,
      card: (() => { const style = getComputedStyle(document.querySelector(".flight-card")!); return { radius: style.borderRadius, border: style.borderTopWidth, borderColor: style.borderTopColor }; })(),
    };
  });
  expect(visual.tokens).toEqual({
    "--color-brand-primary": "#ef142b", "--color-brand-primary-hover": "#c90f24", "--color-carbon": "#181925", "--color-graphite": "#666666", "--color-ash": "#999999", "--color-fog": "#e8e8e8", "--color-linen": "#fafafa", "--color-mist": "#f5f5f5",
    "--radius-cards": "16px", "--radius-inputs": "8px", "--radius-buttons": "9999px", "--page-max-width": "1200px", "--section-gap": "64px", "--card-padding": "32px", "--element-gap": "16px",
    "--text-caption": "12px", "--text-body": "16px", "--text-ui": "14px", "--text-subheading": "18px", "--text-heading-sm": "24px", "--text-heading": "36px", "--text-display": "60px", "--font-weight-semibold": "700",
  });
  expect(visual.localFamily).not.toBe("");
  expect(visual.family).toBe(visual.localFamily);
  expect(visual.fontLoaded).toEqual(["400", "500", "700", "800"].map((weight) => ({ weight, loaded: true })));
  expect(visual.faces.sort((a, b) => Number(a.weight) - Number(b.weight))).toEqual(["400", "500", "700", "800"].map((weight) => ({ weight, status: "loaded" })));
  expect(new Set(fontRequests).size).toBeGreaterThanOrEqual(4);
  for (const url of fontRequests) {
    const source = new URL(url);
    expect(["127.0.0.1", "localhost"]).toContain(source.hostname);
    expect(source.pathname).toContain("/_next/static/media/");
  }
  expect(visual).toMatchObject({ canvas: "rgb(255, 255, 255)", bodyColor: "rgb(24, 25, 37)", bodySize: "16px", bodyTracking: "normal", card: { radius: "16px", border: "1px", borderColor: "rgb(232, 232, 232)" } });
  const search = page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true });
  await expect(search).toHaveCSS("background-color", "rgb(239, 20, 43)");
  await expect(search).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(search).toHaveCSS("border-radius", "9999px");
  await search.hover();
  await expect(search).toHaveCSS("background-color", "rgb(201, 15, 36)");
  await page.mouse.move(0, 0);
  expect(await page.locator("body").innerText()).not.toMatch(/هزینه‌های الزامی شامل است|قیمت، برنامه و سوابق ساختگی|Flight AI/);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  await page.screenshot({ path: "test-results/torob-belit-desktop.png", fullPage: true });
});

test("desktop cards form exactly two equal columns with aligned regions and correct RTL travel direction", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(legacyResults);
  const cards = page.locator(".flight-card");
  const layout = await cards.evaluateAll((items) => items.slice(0, 4).map((item) => {
    const box = item.getBoundingClientRect();
    const regions = [".ticket-header", ".ticket-route", ".ticket-price-region", ".ticket-price-region .price", ".ticket-meta"].map((selector) => item.querySelector(selector)!.getBoundingClientRect().top - box.top);
    return { top: box.top, width: box.width, height: box.height, regions };
  }));
  expect(layout).toHaveLength(4);
  expect(layout[2].top).toBeGreaterThan(layout[0].top + 20);
  for (let pair = 0; pair < layout.length; pair += 2) {
    expect(Math.abs(layout[pair].top - layout[pair + 1].top)).toBeLessThan(2);
    expect(Math.abs(layout[pair].width - layout[pair + 1].width)).toBeLessThan(2);
    expect(Math.abs(layout[pair].height - layout[pair + 1].height)).toBeLessThan(2);
    for (let index = 0; index < layout[pair].regions.length; index += 1) expect(Math.abs(layout[pair].regions[index] - layout[pair + 1].regions[index])).toBeLessThan(2);
  }
  const departure = await cards.first().locator(".ticket-departure").boundingBox();
  const arrival = await cards.first().locator(".ticket-arrival").boundingBox();
  expect(departure!.x).toBeGreaterThan(arrival!.x);
  for (const card of await cards.all()) {
    const badge = await card.locator(".risk-compact").boundingBox();
    const bounds = await card.boundingBox();
    expect(badge!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(badge!.x + badge!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
    expect(await card.locator(".risk-card-text").evaluate((element) => getComputedStyle(element).whiteSpace)).toBe("nowrap");
    await expectCompactFooter(card);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await toggleFooterComparison(page, cards.first());
  await page.mouse.move(0, 0);
  await cards.first().screenshot({ path: "test-results/flight-card-footer-desktop.png" });
});

test("search keeps route swapping, party count and selected Jalali departure date functional", async ({ page }) => {
  await openFixedDemoHomepage(page);
  const origin = page.getByRole("button", { name: "مبدأ", exact: true });
  const destination = page.getByRole("button", { name: "مقصد", exact: true });
  await page.getByRole("button", { name: "جابه‌جایی مبدأ و مقصد", exact: true }).click();
  await expect(origin).toHaveAttribute("data-airport-code", "MHD");
  await expect(destination).toHaveAttribute("data-airport-code", "THR");
  await chooseAirport(page, "مبدأ", "IKA");
  await chooseAirport(page, "مقصد", "DXB");
  await page.getByRole("combobox", { name: "تعداد مسافران بزرگسال" }).selectOption("2");
  await page.getByRole("button", { name: "تاریخ رفت", exact: true }).click();
  await page.getByRole("button", { name: "۲۵ مهر ۱۴۰۵", exact: true }).click();
  await expect(page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true })).toContainText("جست‌وجو");
  await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
  await expect(page).toHaveURL(/destination=DXB.*date=2026-10-17.*adults=2/);
  await expect(page.locator("#results-title")).toContainText("تهران به دبی");
  await expect(page.locator(".flight-card").first()).toContainText("مجموع ۲ بزرگسال");
  await expect(page.locator(".flight-card").first()).toContainText("۲۵ مهر ۱۴۰۵");
});

test("history filters and sorting still operate on eligible domain results", async ({ page }) => {
  await page.goto(legacyResults);
  await page.getByRole("radio", { name: /کم \(کمتر از/ }).check();
  await applyFilters(page);
  await expect(page.locator(".flight-card")).toHaveCount(2);
  await expect(page.locator(".flight-card button.risk-low")).toHaveCount(2);
  await page.getByRole("radio", { name: "همه سطوح" }).check();
  await applyFilters(page);
  await expect(page.locator(".flight-card")).toHaveCount(7);
  await page.getByRole("combobox", { name: "مرتب‌سازی پروازها" }).selectOption("history");
  await expect(page.locator(".flight-card").first()).toContainText("پرواز 511");
  await expect(page.locator(".flight-card").last().locator("button.risk-unknown")).toBeVisible();
});

test("risk details retain valid counts, source and fixed historical reference with Escape and focus return", async ({ page }) => {
  await page.goto(legacyResults);
  const trigger = page.locator(".flight-card button.risk-unknown").first();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "جزئیات سابقهٔ لغو پرواز" });
  await expect(dialog).toBeVisible();
  for (const text of ["مشاهدات معتبر", "پروازهای لغوشده", "زمان مرجع مجموعه", "داده ناکافی", "۲۳ مهر ۱۴۰۵", "شهریور"]) await expect(dialog).toContainText(text);
  await expect(dialog).not.toContainText(/2026-|اکتبر|سپتامبر/);
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog")))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("trip-type drafts preserve submitted results, filters and comparison until explicit new submission", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(legacyResults);
  await page.getByRole("radio", { name: /کم \(کمتر از/ }).check();
  await applyFilters(page);
  await expect(page.locator(".flight-card")).toHaveCount(2);
  await page.getByRole("button", { name: "افزودن به مقایسه", exact: true }).first().click();
  const navigation = page.getByRole("tablist", { name: "نوع سفر", exact: true });
  const oneWay = navigation.getByRole("tab", { name: "یک‌طرفه", exact: true });
  const roundTrip = navigation.getByRole("tab", { name: "دوطرفه", exact: true });
  await expect(navigation.getByRole("tab")).toHaveCount(2);
  await expect(page.getByRole("link", { name: /کشف پرواز|نتایج پرواز/, exact: true })).toHaveCount(0);
  await roundTrip.click();
  await expect(roundTrip).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "تاریخ برگشت", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: /کم \(کمتر از/ })).toBeChecked();
  await expect(page.locator(".flight-card")).toHaveCount(2);
  await expect(page.locator(".comparison-bar")).toBeVisible();
  await expect(page.getByRole("button", { name: "حذف از مقایسه", exact: true })).toHaveCount(1);
  expect(await roundTrip.evaluate((element) => getComputedStyle(element, "::after").height)).toBe("2px");
  await expect(roundTrip).toHaveCSS("color", "rgb(24, 25, 37)");
  expect(await roundTrip.evaluate((element) => getComputedStyle(element, "::after").backgroundColor)).toBe("rgb(239, 20, 43)");
  await navigation.screenshot({ path: "test-results/search-tabs-desktop.png" });
  for (const width of [375, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const layout = await navigation.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const tabs = Array.from(element.querySelectorAll("button")).map((tab) => tab.getBoundingClientRect());
      return { direction: getComputedStyle(element).direction, rtlOrder: tabs[0].left > tabs[1].left,
        inside: tabs.every((tab) => tab.left >= bounds.left && tab.right <= bounds.right + 1),
        overflowing: element.scrollWidth > element.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1 };
    });
    expect(layout).toEqual({ direction: "rtl", rtlOrder: true, inside: true, overflowing: false });
    await oneWay.click(); await expect(oneWay).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: "تاریخ برگشت", exact: true })).toHaveCount(0);
    await roundTrip.click(); await expect(roundTrip).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".flight-card")).toHaveCount(2);
    await expect(page.locator(".flight-card button.risk-low")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "حذف از مقایسه", exact: true })).toHaveCount(1);
    await navigation.screenshot({ path: `test-results/search-tabs-${width === 375 ? "mobile" : "mobile-430"}.png` });
  }
  await page.getByRole("button", { name: "افزودن به مقایسه", exact: true }).first().click();
  await page.getByRole("button", { name: "مقایسه پروازها", exact: true }).click();
  const comparison = page.getByRole("dialog", { name: "مقایسه پروازهای انتخاب‌شده" });
  await expect(comparison.locator(".comparison-grid > .card")).toHaveCount(2);
  await expect(comparison).toContainText("سابقه لغو");
  await expect(comparison).toContainText("۲۴ مهر ۱۴۰۵");
  await page.keyboard.press("Escape");
  await oneWay.click();
  await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
  await expect(page.locator(".flight-card")).toHaveCount(7);
  await expect(page.locator(".comparison-bar")).toHaveCount(0);
});

test("mobile card keyboard opens seller bottom sheet and the independent history badge restores focus and scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFixedDemoHomepage(page);
  const card = page.locator(".flight-card").first();
  const cardTrigger = card.locator(".ticket-card-open");
  await cardTrigger.focus(); await page.keyboard.press("Enter");
  const details = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
  await expect(details).toBeVisible();
  const bounds = await details.boundingBox();
  expect(bounds!.x).toBeLessThanOrEqual(1);
  expect(Math.abs(bounds!.y + bounds!.height - 844)).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await expect(details.getByRole("region", { name: "پیشنهادهای فروشندگان", exact: true })).toBeVisible();
  await expect(details.getByRole("link", { name: "خرید بلیط", exact: true }).first()).toBeVisible();
  await expect(details.locator(".segment-detail, .airport-route, .flight-details-summary")).toHaveCount(0);
  await expect(details).not.toContainText(/امتیاز تناسب|نظرات کاربران|مشاهده شواهد و دوره بررسی/);
  await page.screenshot({ path: "test-results/torob-belit-mobile-details.png" });
  await page.keyboard.press("Escape");
  await expect(details).not.toBeVisible(); await expect(cardTrigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  const historyTrigger = card.locator("button.risk-indicator");
  await historyTrigger.click();
  const history = page.getByRole("dialog", { name: "جزئیات سابقهٔ لغو پرواز", exact: true });
  await expect(history).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape"); await expect(history).not.toBeVisible(); await expect(historyTrigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await cardTrigger.evaluate((element) => element.blur());
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/torob-belit-mobile.png", fullPage: true });
  for (const width of [375, 430]) {
    await page.setViewportSize({ width, height: 844 }); await card.scrollIntoViewIfNeeded();
    await expectCompactFooter(card); await toggleFooterComparison(page, card);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.mouse.move(0, 0); await card.screenshot({ path: `test-results/flight-card-footer-mobile-${width}.png` });
  }
});

test("mobile filter drawer keeps applied state after closing and reopening", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(legacyResults);
  const trigger = page.getByRole("button", { name: "نمایش فیلترها", exact: true });
  await trigger.click();
  const filters = page.getByRole("dialog", { name: "فیلترها", exact: true });
  await expect(filters).toBeVisible();
  await filters.getByRole("radio", { name: /کم \(کمتر از/ }).check();
  await expect(page.locator(".flight-card")).toHaveCount(7);
  await applyFilters(filters);
  await expect(page.locator(".flight-card")).toHaveCount(2);
  await expect(filters).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(filters.getByRole("radio", { name: /کم \(کمتر از/ })).toBeChecked();
  await filters.getByRole("button", { name: "پاک کردن", exact: true }).click();
  await expect(filters.getByRole("radio", { name: "همه سطوح", exact: true })).toBeChecked();
  await expect(page.locator(".flight-card")).toHaveCount(7);
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("server still rejects unsupported demo dates and invalid passenger counts", async ({ request }) => {
  const query = { origin: "IKA", destination: "IST", departureDate: "2026-10-16", adults: 1, currency: "IRR" };
  const invalid = await request.post("/api/search", { data: { mode: "demo", query: { ...query, adults: 20 }, filters: {}, sort: "recommended" } });
  expect(invalid.status()).toBe(400);
  const unavailable = await request.post("/api/search", { data: { mode: "demo", query: { ...query, departureDate: "2037-01-01" }, filters: {}, sort: "recommended" } });
  expect(unavailable.status()).toBe(422);
  expect(unavailable.headers()["cache-control"]).toBe("no-store");
  const failure = await unavailable.json();
  expect(failure.error.code).toBe("UNSUPPORTED_DEMO_DATE");
  expect(failure.error.message).not.toContain("2026-");
});

test("clearing comparison during a pending filter request cannot resurrect selections", async ({ page }) => {
  await page.goto(legacyResults);
  await page.getByRole("button", { name: "افزودن به مقایسه", exact: true }).first().click();
  await page.route("**/api/search", async (route) => { await new Promise((resolve) => setTimeout(resolve, 350)); await route.continue(); });
  const response = page.waitForResponse((item) => item.url().endsWith("/api/search"));
  await page.getByRole("radio", { name: /کم \(کمتر از/ }).check();
  await applyFilters(page);
  await page.locator(".comparison-bar").getByRole("button", { name: "پاک کردن", exact: true }).click();
  await response;
  await expect(page.locator(".flight-card")).toHaveCount(2);
  await expect(page.locator(".comparison-bar")).toHaveCount(0);
});

test("an alternate seller selection is removed rather than silently replaced by the card default", async ({ page }) => {
  await page.goto(legacyResults);
  const card = page.locator(".flight-card").first();
  const details = await openFlight(page, card);
  await details.getByRole("button", { name: "مقایسه با این پیشنهاد", exact: true }).nth(1).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".comparison-bar")).toBeVisible();
  await card.getByRole("button", { name: "حذف از مقایسه", exact: true }).click();
  await expect(page.locator(".comparison-bar")).toHaveCount(0);
  await expect(card.getByRole("button", { name: "افزودن به مقایسه", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "جزئیات پرواز", exact: true })).not.toBeVisible();
});

test("Jalali picker preserves RTL keyboard selection, year navigation and leap Esfand", async ({ page }) => {
  await openFixedDemoHomepage(page);
  const trigger = page.getByRole("button", { name: "تاریخ رفت", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "انتخاب تاریخ رفت" });
  await expect(dialog.getByRole("button", { name: "۲۴ مهر ۱۴۰۵", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByRole("button", { name: "۲۵ مهر ۱۴۰۵", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toContainText("۲۵ مهر ۱۴۰۵");
  await trigger.click();
  await dialog.getByRole("button", { name: "ماه بعد", exact: true }).click();
  await expect(dialog.getByRole("grid")).toHaveAccessibleName("آبان ۱۴۰۵");
  await expect(dialog.getByRole("button", { name: "۱ آبان ۱۴۰۵", exact: true })).toBeEnabled();
  await dialog.getByRole("combobox", { name: "سال شمسی" }).selectOption("1403");
  await dialog.getByRole("combobox", { name: "ماه شمسی" }).selectOption("12");
  await expect(dialog.getByRole("button", { name: "۳۰ اسفند ۱۴۰۳", exact: true })).toBeDisabled();
  await dialog.getByRole("combobox", { name: "سال شمسی" }).selectOption("1404");
  await expect(dialog.getByRole("button", { name: "۳۰ اسفند ۱۴۰۴", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(trigger).toContainText("۲۵ مهر ۱۴۰۵");
});

test("Persian Toman budgets normalize once and price sorting uses numeric rials", async ({ page }) => {
  await page.goto(legacyResults);
  await setRangeValue(page.getByRole("slider", { name: "حداکثر قیمت کل (تومان)", exact: true }), 55_000_000);
  const request = page.waitForRequest((item) => item.url().endsWith("/api/search"));
  await applyFilters(page);
  expect((await request).postDataJSON().filters.maxPriceRials).toBe(55_000_000);
  await expect(page.locator(".flight-card")).toHaveCount(4);
  await page.getByLabel("حداقل یک بار تحویلی برای هر مسافر", { exact: true }).check();
  await applyFilters(page);
  await expect(page.locator(".flight-card")).toHaveCount(3);
  const response = page.waitForResponse((item) => item.url().endsWith("/api/search"));
  await page.getByRole("combobox", { name: "مرتب‌سازی پروازها" }).selectOption("price");
  const result = await (await response).json();
  const amounts: number[] = result.data.flights.map((item: { selectedOffer: { totalPrice: { amountRials: number } } }) => item.selectedOffer.totalPrice.amountRials);
  expect(amounts).toEqual([...amounts].sort((left, right) => left - right));
  expect(amounts.every((amount) => amount <= 55_000_000)).toBe(true);
  await expect(page.locator(".flight-card .price").first()).toHaveText("۴٬۲۲۵٬۰۰۰ تومان");
});

test("seller detail and comparison preserve the exact selected Toman fare and Jalali travel date", async ({ page }) => {
  await page.goto(legacyResults);
  const card = page.locator(".flight-card").first();
  await expect(card.locator(".price")).toHaveText("۶٬۲۰۰٬۰۰۰ تومان");
  const details = await openFlight(page, card);
  await expect(details.locator(".seller-offer .offer-price").nth(1)).toHaveText("۷٬۰۰۰٬۰۰۰ تومان");
  await expect(card.locator(".ticket-date").first()).toHaveText("۲۴ مهر ۱۴۰۵");
  await expect(details.locator(".segment-detail")).toHaveCount(0);
  await details.getByRole("button", { name: "مقایسه با این پیشنهاد", exact: true }).nth(1).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "افزودن به مقایسه", exact: true }).first().click();
  await page.getByRole("button", { name: "مقایسه پروازها", exact: true }).click();
  const comparison = page.getByRole("dialog", { name: "مقایسه پروازهای انتخاب‌شده" });
  await expect(comparison.locator(".comparison-grid .price").first()).toHaveText("۷٬۰۰۰٬۰۰۰ تومان");
  await expect(comparison).toContainText("۲۴ مهر ۱۴۰۵");
  await expect(comparison).not.toContainText(/USD|دلار|2026-/);
});

test("explicit live searches report disconnected providers without a synthetic fallback", async ({ page }) => {
  const { Temporal } = await import("@js-temporal/polyfill");
  const date = Temporal.Now.plainDateISO("Asia/Tehran").add({ days: 2 }).toString();
  await page.goto(`/?mode=live&origin=IKA&destination=IST&date=${date}&adults=1`);
  const status = page.getByRole("region", { name: "وضعیت منابع داده" });
  await expect(status).toBeVisible();
  for (const provider of ["علی‌بابا", "فلای‌تودی", "سفرمارکت", "اسنپ‌تریپ"]) await expect(status).toContainText(provider);
  await expect(status).toContainText("هنوز دریافت موفقی ثبت نشده");
  await expect(page.locator(".flight-card")).toHaveCount(0);
  await expect(page.locator(".empty-state")).toContainText("منابع متصل نیستند");
  await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
  await expect(page).toHaveURL(/\/\?.*mode=live/);
  await expect(page.locator(".flight-card")).toHaveCount(0);
  await expect(status).toContainText("هنوز دریافت موفقی ثبت نشده");
  await expect(page.locator(".search-source-note")).toHaveCount(0);
});

test("live API statuses contain no fabricated quote or successful update time", async ({ request }) => {
  const { Temporal } = await import("@js-temporal/polyfill");
  const date = Temporal.Now.plainDateISO("Asia/Tehran").add({ days: 2 }).toString();
  const response = await request.post("/api/search", { data: { query: { origin: "IKA", destination: "IST", departureDate: date, adults: 1, currency: "IRR" }, filters: {}, sort: "price", mode: "live" } });
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  expect(data.flights).toEqual([]);
  expect(data.source.mode).toBe("unavailable");
  expect(data.lastSuccessfulAt).toBeNull();
  expect(data.providers).toHaveLength(4);
  expect(data.providers.every((provider: { fetchedAt: string | null }) => provider.fetchedAt === null)).toBe(true);
});

test("reference mode preserves unpriced Alibaba records and independent unknown operational history", async ({ page, request }) => {
  const response = await request.post("/api/search", { data: { mode: "fixture", query: { origin: "THR", destination: "MHD", departureDate: "2026-10-15", adults: 1, currency: "IRR" }, filters: {}, sort: "recommended" } });
  expect(response.ok()).toBe(true);
  const returned = (await response.json()).data.unpricedFlights.length;
  expect(returned).toBeGreaterThan(0);
  await page.goto("/?mode=fixture&origin=THR&destination=MHD&date=2026-10-15&adults=1");
  await expect(page.locator(".flight-card")).toHaveCount(returned);
  const statuses = page.getByRole("region", { name: "وضعیت منابع داده" });
  await expect(statuses.locator('[data-source-state="FIXTURE"]')).toHaveCount(1);
  await expect(statuses.locator('[data-source-state="UNAVAILABLE"]')).toHaveCount(3);
  for (const card of await page.locator(".flight-card").all()) {
    await expect(card.locator(".price")).toHaveText("واحد مبلغ تأیید نشده");
    await expect(card.locator(".ticket-date").first()).toHaveText("۲۳ مهر ۱۴۰۵");
    await expect(card.locator("button.risk-unknown")).toContainText("داده ناکافی");
    await expect(card.locator('a[href^="https:"]')).toHaveCount(0);
  }
  const details = await openFlight(page);
  await details.locator(".source-disclosure").first().locator("summary").click();
  await expect(details).toContainText("پاسخ مرجع آفلاین");
  await expect(details).toContainText("واحد تأیید نشده");
  await expect(details).toContainText("ثبت اولیه: نامعلوم");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
  await expect(page).toHaveURL(/origin=THR.*destination=MHD.*date=2026-10-15.*mode=fixture/);
  const sort = page.getByRole("combobox", { name: "مرتب‌سازی پروازها" });
  await expect(sort.locator('option[value="price"]')).toHaveJSProperty("disabled", true);
  await expect(sort.locator('option[value="history"]')).toHaveJSProperty("disabled", true);
});

test("the saved Shiraz route never substitutes Mashhad records or a different stored date", async ({ page, request }) => {
  await page.goto("/?mode=fixture&origin=THR&destination=MHD&date=2026-10-15&adults=1");
  await chooseAirport(page, "مقصد", "SYZ");
  await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
  await expect(page).toHaveURL(/destination=SYZ.*mode=fixture/);
  await expect(page.locator("#results-title")).toContainText("شیراز");
  await expect(page.locator(".flight-card").first()).toBeVisible();
  for (const card of await page.locator(".flight-card").all()) await expect(card.locator(".ticket-arrival")).toContainText("SYZ");
  const invalid = await request.post("/api/search", { data: { mode: "fixture", query: { origin: "THR", destination: "MHD", departureDate: "2026-10-16", adults: 1, currency: "IRR" }, filters: {}, sort: "departure" } });
  expect(invalid.status()).toBe(422);
  expect((await invalid.json()).error.code).toBe("UNSUPPORTED_FIXTURE_QUERY");
});

test("reference comparisons and risk details never manufacture currency or history", async ({ page }) => {
  await page.goto("/results?mode=fixture&origin=THR&destination=MHD&date=2026-10-15&adults=1");
  const trigger = page.locator(".flight-card button.risk-unknown").first();
  await trigger.click();
  const history = page.getByRole("dialog", { name: "جزئیات سابقهٔ لغو پرواز" });
  await expect(history).toContainText("در پاسخ مرجع سوابق عملیاتی وجود ندارد");
  await expect(history).not.toContainText("سوابق ساختگیِ نمایشی");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "افزودن به مقایسه", exact: true }).first().click();
  await page.getByRole("button", { name: "افزودن به مقایسه", exact: true }).first().click();
  await page.getByRole("button", { name: "مقایسه پروازها", exact: true }).click();
  const comparison = page.getByRole("dialog", { name: "مقایسه پروازهای انتخاب‌شده" });
  await expect(comparison.locator(".comparison-grid .price")).toHaveText(["واحد مبلغ تأیید نشده", "واحد مبلغ تأیید نشده"]);
  await expect(comparison).toContainText("مقایسه فقط برای برنامه سفر");
  await expect(comparison).toContainText("اطلاعات کافی موجود نیست");
  await expect(comparison).toContainText("۲۳ مهر ۱۴۰۵");
});

test("unknown-unit references have no invented price bounds while affirmative baggage filtering still works on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/results?mode=fixture&origin=THR&destination=MHD&date=2026-10-15&adults=1");
  const referenceCount = await page.locator(".flight-card").count();
  expect(referenceCount).toBeGreaterThan(0);
  await page.getByRole("button", { name: "نمایش فیلترها", exact: true }).click();
  const filters = page.getByRole("dialog", { name: "فیلترها", exact: true });
  await expect(filters.getByRole("slider")).toHaveCount(0);
  await expect(filters).toContainText("قیمت قابل مقایسه‌ای موجود نیست.");
  await filters.getByLabel("حداقل یک بار تحویلی برای هر مسافر", { exact: true }).check();
  await expect(page.locator(".flight-card")).toHaveCount(referenceCount);
  await applyFilters(filters);
  await expect(page.locator(".flight-card")).toHaveCount(0);
  await expect(filters).not.toBeVisible();
  await expect(page.locator(".empty-state")).toContainText("فقط مسیر و تاریخ ذخیره‌شده مرجع قابل نمایش است");
  await page.getByRole("button", { name: "پاک کردن فیلترها", exact: true }).click();
  await expect(page.locator(".flight-card").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("future Jalali searches retain domestic flights, numeric sorting and airline/time/stop filters", async ({ page }) => {
  await page.goto("/");
  await chooseAirport(page, "مبدأ", "THR");
  await chooseAirport(page, "مقصد", "SYZ");
  await page.getByRole("button", { name: "تاریخ رفت", exact: true }).click();
  const calendar = page.getByRole("dialog", { name: "انتخاب تاریخ رفت" });
  await calendar.getByRole("combobox", { name: "سال شمسی" }).selectOption("1406");
  await calendar.getByRole("combobox", { name: "ماه شمسی" }).selectOption("1");
  await calendar.getByRole("button", { name: "۱ فروردین ۱۴۰۶", exact: true }).click();
  await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
  await expect(page).toHaveURL(/origin=THR.*destination=SYZ.*date=2027-03-21.*mode=demo/);
  await expect(page.locator(".flight-card")).toHaveCount(16);
  await expect(page.locator(".flight-card").first()).toContainText("۱ فروردین ۱۴۰۶");
  const sortedResponse = page.waitForResponse((response) => response.url().endsWith("/api/search"));
  await page.getByRole("combobox", { name: "مرتب‌سازی پروازها" }).selectOption("price");
  const { data } = await (await sortedResponse).json();
  const prices = data.flights.map((item: { selectedOffer: { totalPrice: { amountRials: number } } }) => item.selectedOffer.totalPrice.amountRials);
  expect(prices).toEqual([...prices].sort((a: number, b: number) => a - b));
  const airline = page.getByRole("combobox", { name: "شرکت هواپیمایی", exact: true });
  const option = airline.locator("option").nth(1);
  const airlineId = await option.getAttribute("value");
  const airlineName = await option.textContent();
  await airline.selectOption(airlineId!);
  await applyFilters(page);
  await expect(page.locator(".flight-card").first()).toContainText(airlineName!);
  for (const card of await page.locator(".flight-card").all()) await expect(card.locator("h3").first()).toContainText(airlineName!);
  await airline.selectOption("all");
  const departureResponse = page.waitForResponse((response) => response.url().endsWith("/api/search"));
  await page.getByRole("combobox", { name: "بازه زمان حرکت" }).selectOption("morning");
  await applyFilters(page);
  const morning = (await (await departureResponse).json()).data.flights;
  expect(morning.length).toBeGreaterThan(0);
  const localHour = new Intl.DateTimeFormat("en", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Tehran" });
  for (const item of morning) {
    const hour = Number(localHour.format(new Date(item.flight.segments[0].departureAt)));
    expect(hour).toBeGreaterThanOrEqual(6);
    expect(hour).toBeLessThan(12);
  }
  const nonstopResponse = page.waitForResponse((response) => response.url().endsWith("/api/search"));
  await page.getByLabel("فقط بدون توقف", { exact: true }).check();
  await applyFilters(page);
  const nonstop = (await (await nonstopResponse).json()).data.flights;
  expect(nonstop.length).toBeGreaterThan(0);
  expect(nonstop.every((item: { flight: { stops: number } }) => item.flight.stops === 0)).toBe(true);
});

test("unsupported demo routes retain an informative empty state", async ({ page }) => {
  await page.goto("/results?mode=demo&origin=THR&destination=LHR&date=2027-03-21&adults=1");
  await expect(page.locator(".flight-card")).toHaveCount(0);
  await expect(page.locator(".empty-state")).toContainText("مسیرهای داخلی تهران");
  await expect(page.locator(".empty-state")).toContainText("پروازی ساخته نمی‌شود");
});

test("shared dropdown chevrons maintain sixteen-pixel logical inset and text comparison actions have no border", async ({ page }) => {
  await page.goto(legacyResults);
  for (const name of ["مرتب‌سازی پروازها", "بازه زمان حرکت", "تعداد مسافران بزرگسال"]) {
    const select = page.getByRole("combobox", { name, exact: true });
    const wrapper = select.locator("..");
    const outer = await wrapper.boundingBox();
    const chevron = await wrapper.locator(".select-chevron").boundingBox();
    expect(chevron!.x - outer!.x).toBeGreaterThanOrEqual(15.5);
    expect(Math.abs(chevron!.y + chevron!.height / 2 - (outer!.y + outer!.height / 2))).toBeLessThan(2);
  }
  const compare = page.getByRole("button", { name: "افزودن به مقایسه", exact: true }).first();
  const styles = await compare.evaluate((element) => { const style = getComputedStyle(element); return { border: style.borderTopWidth, background: style.backgroundColor, height: element.getBoundingClientRect().height }; });
  expect(styles.border).toBe("0px");
  expect(styles.background).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  expect(styles.height).toBeGreaterThanOrEqual(40);
});

test("footer newsletter and information controls are honest local interactions", async ({ page }) => {
  const submissions: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") submissions.push(request.url()); });
  await page.goto("/");
  const footer = page.getByRole("contentinfo", { name: "پاورقی ترب بلیط" });
  for (const label of ["خدمات", "اطلاعات تکمیلی", "درباره ترب بلیط"]) await expect(footer.getByRole("navigation", { name: label, exact: true })).toBeVisible();
  await footer.getByRole("textbox", { name: "ایمیل شما", exact: true }).fill("traveler@example.com");
  await footer.getByRole("button", { name: "عضویت در خبرنامه", exact: true }).click();
  await expect(footer.locator(".newsletter-message")).toContainText("ایمیل شما ذخیره نشد و اشتراکی ایجاد نشده است");
  await footer.getByRole("button", { name: "تلگرام؛ اطلاعات حساب", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "شبکه‌های اجتماعی", exact: true })).toContainText("حساب رسمی شبکه اجتماعی تعریف نشده");
  await page.keyboard.press("Escape");
  await footer.getByRole("button", { name: "حریم خصوصی", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "حریم خصوصی", exact: true })).toContainText("ذخیره نمی‌کند");
  await page.keyboard.press("Escape");
  expect(submissions).toEqual([]);
  await footer.getByRole("navigation", { name: "مسیرهای پرطرفدار", exact: true }).getByRole("button", { name: "تهران به کیش", exact: true }).click();
  await expect(page.getByRole("button", { name: "مقصد", exact: true })).toHaveAttribute("data-airport-code", "KIH");
});

test("approved logo, app icons and responsive footer render without broken local assets", async ({ page, request }) => {
  await page.goto("/");
  const logos = page.locator('img[src*="torob-belit-logo"]');
  expect(await logos.count()).toBeGreaterThanOrEqual(2);
  for (const logo of await logos.all()) {
    await logo.scrollIntoViewIfNeeded();
    await expect.poll(() => logo.evaluate((element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
  }
  const icons = await page.locator('link[rel~="icon"], link[rel="apple-touch-icon"]').evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
  expect(icons.length).toBeGreaterThanOrEqual(2);
  for (const icon of icons) expect((await request.get(icon)).status()).toBe(200);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("footer").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator(".footer-columns")).toBeVisible();
  await page.screenshot({ path: "test-results/torob-belit-mobile-footer.png", fullPage: false });
});
