import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";

const resultsUrl = "/?origin=THR&destination=MHD&date=2026-10-20&adults=1&mode=demo";
const sellers = [
  { name: "علی‌بابا", destination: "https://www.alibaba.ir/" },
  { name: "فلای‌تودی", destination: "https://www.flytoday.ir/flight" },
  { name: "مستربلیط", destination: "https://mrbilit.com/plane-ticket" },
];

async function isolateExternalNavigation(context: BrowserContext) {
  const visits: string[] = [];
  // This is a link-behavior test, not a production provider request or inventory check.
  await context.route("https://**/*", async (route) => {
    visits.push(route.request().url());
    await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Controlled seller destination</title>" });
  });
  return visits;
}

async function followSeller(page: Page, seller: Locator, expectedDestination: string) {
  const link = seller.getByRole("link", { name: "خرید بلیط", exact: true });
  const href = await link.getAttribute("href");
  expect(href).not.toBeNull();
  const destination = new URL(href!);
  expect(destination.protocol).toBe("https:");
  expect(destination.href).toBe(expectedDestination);
  expect(destination.username).toBe(""); expect(destination.password).toBe("");
  // Synthetic offers use reviewed search-page continuation; no guessed query or offer identifiers.
  expect(destination.search).toBe(""); expect(destination.hash).toBe("");
  await expect(link).toHaveAttribute("target", "_blank");
  const rel = (await link.getAttribute("rel"))!.split(/\s+/u);
  expect(rel).toContain("noopener"); expect(rel).toContain("noreferrer");
  const popupEvent = page.waitForEvent("popup");
  await link.click();
  const popup = await popupEvent;
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup).toHaveURL(destination.href);
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  await popup.close();
  return destination.href;
}

for (const width of [375, 1440]) {
  test(`every configured seller opens its own secure search page while preserving search and comparison at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 1000 });
    const visits = await isolateExternalNavigation(context);
    const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(resultsUrl);
    const cards = page.locator(".flight-card"); await expect(cards).toHaveCount(16);
    await cards.first().getByRole("button", { name: "افزودن به مقایسه", exact: true }).click();
    await cards.nth(1).getByRole("button", { name: "افزودن به مقایسه", exact: true }).click();
    const originalUrl = page.url(); const originalCards = await cards.locator(".airline-caption").allTextContents();
    await cards.first().locator(".ticket-card-open").click();
    const details = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
    await expect(details).toBeVisible();
    await expect(details).toContainText("آزمایشی");
    for (const configured of sellers) {
      const seller = details.getByRole("region", { name: `پیشنهاد ${configured.name}`, exact: true });
      await expect(seller.locator(".offer-price")).toContainText("تومان");
      await expect(seller).toContainText("نمایش این پرواز و قیمت در سایت فروشنده تضمین نمی‌شود.");
      const visited = await followSeller(page, seller, configured.destination);
      expect(visits).toContain(visited);
      await expect(details).toBeVisible();
      await expect(page).toHaveURL(originalUrl);
      await expect(cards.locator(".airline-caption")).toHaveText(originalCards);
      await expect(cards.first().locator(".ticket-meta > .compare-text-action")).toHaveAttribute("aria-pressed", "true");
      await expect(cards.nth(1).locator(".ticket-meta > .compare-text-action")).toHaveAttribute("aria-pressed", "true");
    }
    await expect(details.getByRole("button", { name: "انتخاب برای سفر", exact: true })).toHaveCount(0);
    await expect(page.locator('a[href^="/checkout"], a[href^="/tickets"], a[href^="/my-tickets"]')).toHaveCount(0);
    expect(await page.evaluate(() => Object.keys(sessionStorage).filter((key) => key.startsWith("torob-belit.checkout.v1.")))).toEqual([]);
    expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("torob-belit.ticket.v1.")))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await details.screenshot({ path: `test-results/seller-referrals-${width}.png` });
    expect(errors).toEqual([]);
  });
}

test("comparison opens the selected flight's seller offers and keeps exact compared fares after external continuation", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await isolateExternalNavigation(context);
  await page.goto(resultsUrl);
  const cards = page.locator(".flight-card");
  await cards.first().locator(".ticket-card-open").click();
  const details = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
  const alternative = details.getByRole("region", { name: "پیشنهاد مستربلیط", exact: true });
  const selectedPrice = await alternative.locator(".offer-price").innerText();
  await alternative.getByRole("button", { name: "مقایسه با این پیشنهاد", exact: true }).click();
  await details.getByRole("button", { name: "بستن پنجره", exact: true }).click();
  await cards.nth(1).getByRole("button", { name: "افزودن به مقایسه", exact: true }).click();
  await page.getByRole("button", { name: "مقایسه پروازها", exact: true }).click();
  const comparison = page.getByRole("dialog", { name: "مقایسه پروازهای انتخاب‌شده", exact: true });
  const compared = comparison.locator(".comparison-card");
  await expect(compared).toHaveCount(2);
  await expect(compared.first().locator(".price")).toHaveText(selectedPrice, { useInnerText: true });
  const detailsTrigger = compared.first().getByRole("button", { name: "جزئیات و فروشندگان", exact: true });
  await detailsTrigger.click();
  await expect(details).toBeVisible();
  await followSeller(page, details.getByRole("region", { name: "پیشنهاد مستربلیط", exact: true }), "https://mrbilit.com/plane-ticket");
  await expect(details).toBeVisible();
  await details.getByRole("button", { name: "بستن پنجره", exact: true }).click();
  await expect(comparison).toBeVisible();
  await expect(compared).toHaveCount(2);
  await expect(compared.first().locator(".price")).toHaveText(selectedPrice, { useInnerText: true });
  await expect(compared.first()).toContainText("مستربلیط");
  await expect(detailsTrigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await detailsTrigger.click();
  await expect(details).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(details).not.toBeVisible();
  await expect(comparison).toBeVisible();
  await expect(detailsTrigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(comparison).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});

test("unverified imported seller identity has an unavailable purchase action without an invented destination", async ({ page, context }) => {
  const visits = await isolateExternalNavigation(context);
  await page.goto("/?origin=THR&destination=MHD&date=2026-10-15&adults=1&mode=fixture");
  await expect(page.locator(".flight-card").first()).toBeVisible();
  await page.locator(".flight-card").first().locator(".ticket-card-open").click();
  const details = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
  await expect(details).toBeVisible();
  await expect(details.getByRole("link", { name: "خرید بلیط", exact: true })).toHaveCount(0);
  await expect(details.getByRole("button", { name: "خرید بلیط", exact: true }).first()).toBeDisabled();
  await expect(details).toContainText(/پیوند.*دسترس نیست/u);
  await expect(details).toContainText("واحد مبلغ تأیید نشده");
  expect(visits).toEqual([]);
});

test("removed booking routes return 404 and stale ticket data is neither reused nor deleted", async ({ page }) => {
  const legacy = {
    issuedKey: "torob-belit.ticket.v1.TB-legacy-test", issuedValue: "{old-issued-record}",
    draftKey: "torob-belit.checkout.v1.legacy-test", draftValue: "{old-checkout-record}",
    unrelatedKey: "torob-referral-test-unrelated", unrelatedValue: "preserve-me",
  };
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate((value) => {
    localStorage.setItem(value.issuedKey, value.issuedValue);
    sessionStorage.setItem(value.draftKey, value.draftValue);
    localStorage.setItem(value.unrelatedKey, value.unrelatedValue);
  }, legacy);
  for (const route of ["/checkout", "/checkout?selection=legacy-test", "/checkout?selection=legacy-test&step=confirm", "/my-tickets", "/tickets/TB-legacy-test"]) {
    const response = await page.goto(route); expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "صفحه پیدا نشد", exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /کد ملی|شماره همراه|نام مسافر/u })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /صدور|دانلود بلیط/u })).toHaveCount(0);
  }
  await page.goto(resultsUrl);
  await expect(page.locator(".flight-card")).toHaveCount(16);
  await expect(page.locator('a[href^="/checkout"], a[href^="/tickets"], a[href^="/my-tickets"]')).toHaveCount(0);
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    if (width < 1024) await page.getByRole("button", { name: "باز کردن منو", exact: true }).click();
    await expect(page.getByRole("link", { name: "بلیط‌های من", exact: true })).toHaveCount(0);
    if (width < 1024) await page.keyboard.press("Escape");
  }
  expect(await page.evaluate((value) => ({ issued: localStorage.getItem(value.issuedKey), draft: sessionStorage.getItem(value.draftKey), unrelated: localStorage.getItem(value.unrelatedKey) }), legacy))
    .toEqual({ issued: legacy.issuedValue, draft: legacy.draftValue, unrelated: legacy.unrelatedValue });
  expect(errors).toEqual([]);
});
