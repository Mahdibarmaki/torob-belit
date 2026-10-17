import { expect, test, type Locator, type Page } from "@playwright/test";

const resultsUrl = "/?mode=demo&origin=IKA&destination=IST&date=2026-10-16&adults=1";
const domesticUrl = "/?mode=demo&origin=THR&destination=MHD&date=2026-10-16&adults=1";
const disclosure = "اطلاعات پروازها صرفاً برای آزمایش محصول است.";
const unwanted = /نسخه نمایشی|داده شبیه‌سازی‌شده|شرایط ساختگی|تأیید موجودی واقعی نیست\.|قیمت ساختگی|سابقه ساختگی|مبلغ نمایشی/u;

async function rangeValue(slider: Locator): Promise<number> {
  return Number(await slider.inputValue());
}

async function clickRoute(page: Page, card: Locator) {
  await card.scrollIntoViewIfNeeded();
  const bounds = (await card.locator(".ticket-route").boundingBox())!;
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

async function expectNoBanner(page: Page) {
  await expect(page.locator(".product-data-notice")).toHaveCount(0);
  await expect(page.getByText(disclosure, { exact: true })).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toMatch(unwanted);
}

for (const width of [375, 430, 768, 1024, 1440, 1920]) {
  test(`airport swap overlaps the shared field boundary symmetrically at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(domesticUrl);
    const origin = page.getByRole("button", { name: "مبدأ", exact: true });
    const destination = page.getByRole("button", { name: "مقصد", exact: true });
    const swap = page.getByRole("button", { name: "جابه‌جایی مبدأ و مقصد", exact: true });
    const geometry = await page.locator(".airport-fields").evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const first = element.querySelector(".origin-field")!.getBoundingClientRect();
      const second = element.querySelector(".destination-field")!.getBoundingClientRect();
      const swap = element.querySelector(".swap-airports")!.getBoundingClientRect();
      const boundary = (first.left + second.right) / 2;
      return {
        commonParentPosition: getComputedStyle(element).position,
        xDeviation: Math.abs(swap.left + swap.width / 2 - boundary),
        yDeviation: Math.abs(swap.top + swap.height / 2 - (bounds.top + bounds.height / 2)),
        spansBothFields: swap.left < boundary && swap.right > boundary,
        originOnRight: first.left > second.left,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    expect(geometry).toMatchObject({ commonParentPosition: "relative", spansBothFields: true, originOnRight: true, overflow: false });
    expect(geometry.xDeviation).toBeLessThan(1.5);
    expect(geometry.yDeviation).toBeLessThan(1.5);
    await swap.focus();
    await page.keyboard.press("Enter");
    await expect(origin).toHaveAttribute("data-airport-code", "MHD");
    await expect(destination).toHaveAttribute("data-airport-code", "THR");
    await page.keyboard.press("Space");
    await expect(origin).toHaveAttribute("data-airport-code", "THR");
    await expect(destination).toHaveAttribute("data-airport-code", "MHD");
    await page.locator(".search-panel").screenshot({ path: `test-results/refinement-search-${width}.png` });
  });
}

for (const width of [375, 1440]) {
  test(`card pointer and keyboard details preserve independent nested actions and price hierarchy at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(resultsUrl);
    const card = page.locator(".flight-card").first();
    const trigger = card.locator(".ticket-card-open");
    await expect(trigger).toHaveAccessibleName(/^جزئیات پرواز /);
    await expect(card.locator(".ticket-detail-button")).toHaveCount(0);
    await expect(card.locator(".ticket-price-region .price-currency")).toHaveText("تومان");
    await expect(card.locator(".ticket-price-region .price-currency")).toHaveCSS("font-weight", "400");
    const typeScale = await card.evaluate((element) => {
      const number = element.querySelector(".ticket-price-region .price-amount")!;
      const currency = element.querySelector(".ticket-price-region .price-currency")!;
      return { amount: parseFloat(getComputedStyle(number).fontSize), currency: parseFloat(getComputedStyle(currency).fontSize) };
    });
    expect(typeScale.amount).toBeGreaterThan(typeScale.currency);
    for (const [side, code] of [["departure", "IKA"], ["arrival", "IST"]]) {
      const airport = card.locator(`.ticket-${side}`);
      await expect(airport.locator(".ticket-airport-code")).toHaveText(code);
      const hierarchy = await airport.evaluate((element) => {
        const code = element.querySelector(".ticket-airport-code")!;
        const city = element.querySelector(".ticket-airport-name")!;
        const codeBox = code.getBoundingClientRect();
        const cityBox = city.getBoundingClientRect();
        return { codeAboveCity: codeBox.bottom <= cityBox.top + 1, codeFont: parseFloat(getComputedStyle(code).fontSize), cityFont: parseFloat(getComputedStyle(city).fontSize), city: city.textContent };
      });
      expect(hierarchy.codeAboveCity).toBe(true);
      expect(hierarchy.codeFont).toBeGreaterThanOrEqual(hierarchy.cityFont);
      expect(hierarchy.city).toMatch(/[\u0600-\u06ff]/u);
    }
    const details = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
    await clickRoute(page, card);
    await expect(details).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    for (const key of ["Enter", "Space"]) {
      await page.keyboard.press(key);
      await expect(details).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    }
    const compare = card.getByRole("button", { name: "افزودن به مقایسه", exact: true });
    await compare.click();
    await expect(details).not.toBeVisible();
    await expect(card.getByRole("button", { name: "حذف از مقایسه", exact: true })).toHaveAttribute("aria-pressed", "true");
    await card.locator("button.risk-indicator").click();
    await expect(page.getByRole("dialog", { name: "جزئیات سابقهٔ لغو پرواز", exact: true })).toBeVisible();
    await expect(details).not.toBeVisible();
    await page.keyboard.press("Escape");
    expect(await card.locator("button button, a button, button a").count()).toBe(0);
  });
}

test("header destinations and remaining demo provenance are honest without the removed search-information notice", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const header = page.locator("header");
  const nav = header.getByRole("navigation", { name: "ناوبری اصلی", exact: true });
  const home = nav.getByRole("link", { name: "خانه", exact: true });
  await expect(home).toBeVisible();
  await expect(home).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "بلیط‌های من", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("button", { name: "سفر قسطی؛ غیرفعال", exact: true })).toBeDisabled();
  await expect(header.locator(".header-utilities").getByRole("button", { name: "ورود / ثبت‌نام؛ غیرفعال", exact: true })).toBeDisabled();
  await expect(nav.getByText("ورود / ثبت‌نام", { exact: true })).toHaveCount(0);
  await expect(header.getByText("به‌زودی", { exact: true })).toHaveCount(0);
  await expect(page.locator(".flight-card")).toHaveCount(0);
  await expectNoBanner(page);
  for (const label of ["راهنمای انتخاب پرواز", "منبع داده"]) {
    await expect(header.getByText(label, { exact: true })).toHaveCount(0);
    await expect(page.locator("footer").getByText(label, { exact: true })).toHaveCount(0);
  }

  await page.goto(resultsUrl);
  await expect(page.locator(".search-source-note")).toHaveCount(0);
  await expect(page.getByText("درباره اطلاعات این جست‌وجو", { exact: true })).toHaveCount(0);
  await expect(page.locator(".results-mode-label")).toHaveText("اطلاعات آزمایشی");
  await clickRoute(page, page.locator(".flight-card").first());
  const details = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
  await expect(details).toContainText("نام فروشندگان به معنی همکاری یا اتصال رزرو نیست");
  await expect(details.getByRole("link", { name: "خرید بلیط", exact: true }).first()).toBeVisible();
  await expectNoBanner(page);
  await page.keyboard.press("Escape");
  const footer = page.locator("footer");
  await expect(footer.locator(".footer-support")).toContainText("راهنما و پشتیبانی");

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    if (await home.isVisible()) await home.click();
    else {
      await header.getByRole("button", { name: "باز کردن منو", exact: true }).click();
      const menu = page.getByRole("dialog", { name: "ترب بلیط", exact: true });
      await expect(menu.getByRole("button", { name: "سفر قسطی؛ غیرفعال", exact: true })).toBeDisabled();
      await expect(menu.getByText("به‌زودی", { exact: true })).toHaveCount(0);
      await expect(menu.getByRole("link", { name: "بلیط‌های من", exact: true })).toHaveCount(0);
      await menu.getByRole("link", { name: "خانه", exact: true }).click();
      await expect(menu).not.toBeVisible();
    }
    await expect(page.locator(".hero-eyebrow")).toHaveText("ترب بلیط؛ جست‌وجو و مقایسه پرواز");
    await expect(page.locator(".hero-copy h1")).toHaveText("پروازها رو مقایسه کن، بهتر انتخاب کن.");
    await expect(page.locator(".hero-description")).toHaveText("قیمت، ساعت پرواز و سابقه لغو رو یک‌جا ببین و پرواز مناسب خودت رو پیدا کن.");
    await expect(page.locator(".flight-card")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "شروع جست‌وجو", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test("filter edits remain drafts, a single action applies them, and clear restores every default without changing sort", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(resultsUrl);
  const panel = page.getByRole("complementary", { name: "فیلتر پروازها", exact: true });
  const clear = panel.getByRole("button", { name: "پاک کردن", exact: true });
  const apply = panel.getByRole("button", { name: "اعمال فیلترها", exact: true });
  await expect(clear).toHaveCount(1);
  await expect(clear).toBeDisabled();
  await expect(panel.getByRole("button", { name: "اعمال سقف قیمت", exact: true })).toHaveCount(0);
  await expect(panel.getByRole("textbox")).toHaveCount(0);
  await expect(clear.locator("..")).toContainText("اعمال فیلترها");
  await expect(apply).toHaveCSS("background-color", "rgb(239, 20, 43)");
  const sortResponse = page.waitForResponse((response) => response.url().endsWith("/api/search"));
  await page.getByRole("combobox", { name: "مرتب‌سازی پروازها", exact: true }).selectOption("price");
  await sortResponse;
  const before = await page.locator(".flight-card .airline-caption").allTextContents();
  const calls: unknown[] = [];
  page.on("request", (request) => { if (request.url().endsWith("/api/search")) calls.push(request.postDataJSON()); });
  const min = panel.getByRole("slider", { name: "حداقل قیمت کل (تومان)", exact: true });
  const max = panel.getByRole("slider", { name: "حداکثر قیمت کل (تومان)", exact: true });
  const defaultMin = await rangeValue(min);
  const defaultMax = await rangeValue(max);
  expect(defaultMin).toBe(0);
  expect(defaultMax).toBeGreaterThan(defaultMin);
  await panel.getByLabel("فقط بدون توقف", { exact: true }).check();
  await panel.getByLabel("حداقل یک بار تحویلی برای هر مسافر", { exact: true }).check();
  await panel.getByRole("combobox", { name: "بازه زمان حرکت", exact: true }).selectOption("morning");
  const airline = panel.getByRole("combobox", { name: "شرکت هواپیمایی", exact: true });
  await airline.selectOption((await airline.locator("option").nth(1).getAttribute("value"))!);
  await panel.getByRole("radio", { name: /کم \(کمتر از/ }).check();
  await min.focus();
  await page.keyboard.press("ArrowLeft");
  await max.focus();
  await page.keyboard.press("ArrowRight");
  expect(await rangeValue(min)).toBe(defaultMin + 1);
  expect(await rangeValue(max)).toBe(defaultMax - 1);
  await expect(clear).toBeEnabled();
  await expect(page.locator(".flight-card .airline-caption")).toHaveText(before);
  expect(calls).toEqual([]);
  const request = page.waitForRequest((request) => request.url().endsWith("/api/search"));
  const response = page.waitForResponse((response) => response.url().endsWith("/api/search"));
  await apply.click();
  const body = (await request).postDataJSON();
  expect(body.sort).toBe("price");
  expect(body.filters).toMatchObject({ nonstopOnly: true, checkedBagOnly: true, departurePeriod: "morning", riskCategories: ["low"], minPriceRials: defaultMin + 1, maxPriceRials: defaultMax - 1 });
  expect(body.filters.airlineIds).toHaveLength(1);
  await response;
  const reset = page.waitForResponse((response) => response.url().endsWith("/api/search"));
  await clear.click();
  await reset;
  await expect(page.locator(".flight-card")).toHaveCount(7);
  await expect(clear).toBeDisabled();
  await expect(panel.getByLabel("فقط بدون توقف", { exact: true })).not.toBeChecked();
  await expect(panel.getByLabel("حداقل یک بار تحویلی برای هر مسافر", { exact: true })).not.toBeChecked();
  await expect(panel.getByRole("radio", { name: "همه سطوح", exact: true })).toBeChecked();
  await expect(airline).toHaveValue("all");
  await expect(panel.getByRole("combobox", { name: "بازه زمان حرکت", exact: true })).toHaveValue("all");
  expect(await rangeValue(min)).toBe(defaultMin);
  expect(await rangeValue(max)).toBe(defaultMax);
  await expect(page.getByRole("combobox", { name: "مرتب‌سازی پروازها", exact: true })).toHaveValue("price");
  const positions = await panel.locator("#filter-groups > section").evaluateAll((groups) => groups.map((element) => {
    const heading = element.querySelector("h3")!;
    return heading.getBoundingClientRect().top - element.getBoundingClientRect().top;
  }));
  expect(positions.length).toBeGreaterThanOrEqual(5);
  for (const offset of positions) expect(offset).toBeGreaterThanOrEqual(15);
  await panel.screenshot({ path: "test-results/refinement-filters-desktop.png" });
});

test("dual price handles clamp at each other, expose Persian money and retain mobile drafts across dismissal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto(resultsUrl);
  const trigger = page.getByRole("button", { name: "نمایش فیلترها", exact: true });
  await trigger.click();
  const panel = page.getByRole("dialog", { name: "فیلترها", exact: true });
  const min = panel.getByRole("slider", { name: "حداقل قیمت کل (تومان)", exact: true });
  const max = panel.getByRole("slider", { name: "حداکثر قیمت کل (تومان)", exact: true });
  const defaultMin = await rangeValue(min);
  const defaultMax = await rangeValue(max);
  for (const slider of [min, max]) await expect(slider).toHaveAttribute("aria-valuetext", /[۰-۹].*تومان/u);
  await min.focus();
  await page.keyboard.press("End");
  expect(await rangeValue(min)).toBe(defaultMax);
  await page.keyboard.press("ArrowLeft");
  expect(await rangeValue(min)).toBeLessThanOrEqual(await rangeValue(max));
  await min.press("Home");
  expect(await rangeValue(min)).toBe(defaultMin);
  await max.press("Home");
  expect(await rangeValue(max)).toBe(defaultMin);
  await max.press("ArrowRight");
  expect(await rangeValue(max)).toBeGreaterThanOrEqual(await rangeValue(min));
  await max.press("End");
  await panel.getByRole("radio", { name: /کم \(کمتر از/ }).check();
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(page.locator(".flight-card")).toHaveCount(7);
  await trigger.click();
  await expect(panel.getByRole("radio", { name: /کم \(کمتر از/ })).toBeChecked();
  await panel.getByRole("button", { name: "اعمال فیلترها", exact: true }).click();
  await expect(panel).not.toBeVisible();
  await expect(page.locator(".flight-card")).toHaveCount(2);
  await trigger.click();
  await panel.getByRole("button", { name: "پاک کردن", exact: true }).click();
  await expect(page.locator(".flight-card")).toHaveCount(7);
  expect(await rangeValue(min)).toBe(defaultMin);
  expect(await rangeValue(max)).toBe(defaultMax);
  await panel.screenshot({ path: "test-results/refinement-filters-mobile.png" });
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("sorting uses applied filters and a failed apply preserves both the unsaved draft and prior results", async ({ page }) => {
  await page.goto(resultsUrl);
  await page.getByRole("radio", { name: /کم \(کمتر از/ }).check();
  const sorting = page.waitForRequest((request) => request.url().endsWith("/api/search"));
  const sorted = page.waitForResponse((response) => response.url().endsWith("/api/search"));
  await page.getByRole("combobox", { name: "مرتب‌سازی پروازها", exact: true }).selectOption("price");
  expect((await sorting).postDataJSON().filters).toEqual({});
  await sorted;
  await expect(page.locator(".flight-card")).toHaveCount(7);
  await expect(page.getByRole("radio", { name: /کم \(کمتر از/ })).toBeChecked();
  const priorResults = await page.locator(".flight-card .airline-caption").allTextContents();
  await page.route("**/api/search", async (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: { code: "TEMPORARILY_UNAVAILABLE", message: "جست‌وجو انجام نشد. دوباره تلاش کنید." } }) }));
  await page.getByRole("button", { name: "اعمال فیلترها", exact: true }).click();
  await expect(page.locator(".error-message[role='alert']")).toContainText("جست‌وجو انجام نشد");
  await expect(page.getByRole("radio", { name: /کم \(کمتر از/ })).toBeChecked();
  await expect(page.locator(".flight-card .airline-caption")).toHaveText(priorResults);
  await expect(page.getByRole("combobox", { name: "مرتب‌سازی پروازها", exact: true })).toHaveValue("price");
  await expect(page.getByRole("complementary", { name: "فیلتر پروازها", exact: true }).getByRole("button", { name: "پاک کردن", exact: true })).toBeEnabled();
});

test("both price thumbs respond to pointer dragging without applying results early", async ({ page }) => {
  await page.goto(resultsUrl);
  const min = page.getByRole("slider", { name: "حداقل قیمت کل (تومان)", exact: true });
  const max = page.getByRole("slider", { name: "حداکثر قیمت کل (تومان)", exact: true });
  await min.scrollIntoViewIfNeeded();
  const initialMin = await rangeValue(min);
  const initialMax = await rangeValue(max);
  const bounds = (await min.boundingBox())!;
  const requests: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith("/api/search")) requests.push(request.url()); });
  // RTL native ranges increase to the left. Start on each 20px thumb center,
  // then drag inward while leaving an interval between the two values.
  await page.mouse.move(bounds.x + bounds.width - 10, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height / 2, { steps: 10 });
  await page.mouse.up();
  expect(await rangeValue(min)).toBeGreaterThan(initialMin);
  await page.mouse.move(bounds.x + 10, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .35, bounds.y + bounds.height / 2, { steps: 10 });
  await page.mouse.up();
  expect(await rangeValue(max)).toBeLessThan(initialMax);
  expect(await rangeValue(min)).toBeLessThan(await rangeValue(max));
  expect(requests).toEqual([]);
  await expect(page.locator(".flight-card")).toHaveCount(7);
});

test("a focused price thumb scrolls behind the mobile filter header without obscuring its close control", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto(resultsUrl);
  const trigger = page.getByRole("button", { name: "نمایش فیلترها", exact: true });
  await trigger.click();
  const panel = page.getByRole("dialog", { name: "فیلترها", exact: true });
  await panel.getByRole("slider", { name: "حداقل قیمت کل (تومان)", exact: true }).focus();
  const overlap = await panel.evaluate((element) => {
    const dialog = element as HTMLDialogElement;
    const header = dialog.querySelector(".modal-header")!;
    const slider = dialog.querySelector<HTMLInputElement>('input[aria-label="حداقل قیمت کل (تومان)"]')!;
    const before = slider.getBoundingClientRect();
    const headerBefore = header.getBoundingClientRect();
    dialog.scrollTop += before.top + before.height / 2 - (headerBefore.top + headerBefore.height / 2);
    const after = slider.getBoundingClientRect();
    const headerAfter = header.getBoundingClientRect();
    const x = after.right - 10;
    const y = after.top + after.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { scrolled: dialog.scrollTop > 0, thumbCenterOverHeader: y >= headerAfter.top && y <= headerAfter.bottom, headerReceivesPointer: hit === header || Boolean(hit?.closest(".modal-header")) };
  });
  expect(overlap).toEqual({ scrolled: true, thumbCenterOverHeader: true, headerReceivesPointer: true });
  await page.screenshot({ path: "test-results/refinement-filter-sticky-header-mobile.png" });
  await panel.getByRole("button", { name: "بستن پنجره", exact: true }).click();
  await expect(panel).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("search summaries separate three visible RTL metadata items with exactly two neutral dots", async ({ page }) => {
  await page.goto(resultsUrl);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const summary = page.locator(".results-summary");
    const separators = summary.locator(".summary-separator");
    await expect(separators).toHaveCount(2);
    for (const dot of await separators.all()) {
      await expect(dot).toHaveText("•");
      await expect(dot).toHaveAttribute("aria-hidden", "true");
    }
    await expect(summary).toContainText("۲۴ مهر ۱۴۰۵");
    await expect(summary).toContainText("۷ پرواز");
    await expect(summary).toContainText("۱ بزرگسال");
    await expect(summary.locator("svg")).toHaveCount(2);
    const layout = await summary.evaluate((element) => {
      const style = getComputedStyle(element);
      const text = element.textContent?.trim() ?? "";
      return { direction: style.direction, leading: text.startsWith("•"), trailing: text.endsWith("•"), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    expect(layout).toEqual({ direction: "rtl", leading: false, trailing: false, overflow: false });
  }
});
