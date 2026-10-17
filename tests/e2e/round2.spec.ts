import { expect, test, type Locator, type Page } from "@playwright/test";

const routeUrl = "/?mode=demo&origin=THR&destination=MHD&date=2026-10-16&adults=1";

async function pricePanel(page: Page) {
  const trigger = page.getByRole("button", { name: "نمایش فیلترها", exact: true });
  if (await trigger.isVisible()) {
    await trigger.click();
    return page.getByRole("dialog", { name: "فیلترها", exact: true });
  }
  return page.getByRole("complementary", { name: "فیلتر پروازها", exact: true });
}

async function expectAlignedRoute(card: Locator) {
  const geometry = await card.locator(".ticket-route").evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const origin = element.querySelector(".ticket-departure")!;
    const destination = element.querySelector(".ticket-arrival")!;
    const rect = (parent: Element, selector: string) => parent.querySelector(selector)!.getBoundingClientRect();
    const centerX = (box: DOMRect) => box.left + box.width / 2;
    const centerY = (box: DOMRect) => box.top + box.height / 2;
    const originCode = rect(origin, ".ticket-airport-code");
    const destinationCode = rect(destination, ".ticket-airport-code");
    const middle = element.querySelector(".ticket-route-middle")!.getBoundingClientRect();
    const columns = [origin, destination].map((column) => {
      const code = rect(column, ".ticket-airport-code");
      const items = ["strong", ".ticket-airport-name", ".ticket-date"].map((selector) => rect(column, selector));
      return items.map((item) => Math.abs(centerX(item) - centerX(code)));
    });
    return {
      timeOffset: Math.abs(rect(origin, "strong").top - rect(destination, "strong").top),
      codeOffset: Math.abs(originCode.top - destinationCode.top),
      nameCenterOffset: Math.abs(centerY(rect(origin, ".ticket-airport-name")) - centerY(rect(destination, ".ticket-airport-name"))),
      dateOffset: Math.abs(rect(origin, ".ticket-date").top - rect(destination, ".ticket-date").top),
      columnCenterOffsets: columns.flat(),
      originOnRight: centerX(originCode) > centerX(destinationCode),
      middleBetweenAirports: middle.left >= destinationCode.right - 1 && middle.right <= originCode.left + 1,
      middleCenterOffset: Math.abs(centerX(middle) - (centerX(originCode) + centerX(destinationCode)) / 2),
      middleVerticalOffset: Math.abs(centerY(middle) - centerY(bounds)),
      overflow: element.scrollWidth > element.clientWidth + 1,
    };
  });
  expect(geometry.originOnRight).toBe(true);
  expect(geometry.middleBetweenAirports).toBe(true);
  expect(geometry.overflow).toBe(false);
  for (const offset of [geometry.timeOffset, geometry.codeOffset, geometry.nameCenterOffset, geometry.dateOffset, geometry.middleCenterOffset, ...geometry.columnCenterOffsets]) expect(offset).toBeLessThanOrEqual(1.5);
  expect(geometry.middleVerticalOffset).toBeLessThanOrEqual(2);
}

for (const width of [375, 430, 768, 1024, 1440]) {
  test(`zero-based draft prices, aligned route rows and focused seller details remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(routeUrl);
    await expect(page.locator(".product-data-notice")).toHaveCount(0);
    await expect(page.getByText("اطلاعات پروازها صرفاً برای آزمایش محصول است.", { exact: true })).toHaveCount(0);
    const cards = page.locator(".flight-card");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(6);
    for (const card of (await cards.all()).slice(0, 3)) await expectAlignedRoute(card);

    const card = cards.first();
    // Stress only the presentation label in this browser. The fixture and route
    // identifiers stay unchanged; a wrapped label must not move one date down.
    await card.locator(".ticket-departure .ticket-airport-name").evaluate((element) => { element.textContent = "تهران (فرودگاه بین‌المللی امام خمینی)"; });
    const wrapped = await card.locator(".ticket-departure .ticket-airport-name").evaluate((element) => element.getBoundingClientRect().height > parseFloat(getComputedStyle(element).lineHeight) * 1.5);
    expect(wrapped).toBe(true);
    await expectAlignedRoute(card);
    await card.screenshot({ path: `test-results/round2-route-${width}.png` });

    const trigger = card.locator(".ticket-card-open");
    await trigger.focus();
    await page.keyboard.press("Enter");
    const details = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
    await expect(details).toBeVisible();
    await expect(details.locator(".flight-detail-summary")).toHaveCount(0);
    await expect(details.getByRole("region", { name: "مسیر و برنامه پرواز", exact: true })).toHaveCount(0);
    await expect(details.getByRole("region", { name: "سابقه لغو", exact: true })).toHaveCount(0);
    const sellers = details.locator(".seller-offer");
    await expect(sellers).toHaveCount(3);
    await expect(sellers.locator("h3")).toHaveText(["علی‌بابا", "فلای‌تودی", "مستربلیط"]);
    await expect(sellers.first().getByRole("list", { name: "کلاس و بار هر بزرگسال", exact: true })).toContainText("کیلو بار تحویلی");
    await expect(sellers.first().getByRole("list", { name: "شرایط بلیط و تغییرات", exact: true })).toContainText("تغییر تاریخ مجاز نیست");
    await expect(sellers.last()).toContainText("استرداد با کسر ۱۵ درصد");
    await expect(sellers.first().getByRole("link", { name: "خرید بلیط", exact: true })).toBeVisible();
    const metadataLayout = await sellers.first().evaluate((element) => ({
      noOverflow: element.scrollWidth <= element.clientWidth + 1,
      containsIcons: element.querySelectorAll("ul svg").length >= 6,
    }));
    expect(metadataLayout).toEqual({ noOverflow: true, containsIcons: true });
    await details.screenshot({ path: `test-results/evolution-sellers-${width}.png` });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();

    const panel = await pricePanel(page);
    const min = panel.getByRole("slider", { name: "حداقل قیمت کل (تومان)", exact: true });
    const max = panel.getByRole("slider", { name: "حداکثر قیمت کل (تومان)", exact: true });
    await expect(min).toHaveAttribute("min", "0");
    await expect(min).toHaveValue("0");
    const maximum = Number(await max.getAttribute("max"));
    expect(maximum).toBeGreaterThan(0);
    await expect(max).toHaveValue(String(maximum));
    const prices = panel.getByRole("group", { name: "بازه قیمت کل همه مسافران", exact: true });
    await expect(prices.locator("output").first()).toHaveText("۰");
    await expect(prices.locator("output").first()).toHaveAccessibleName("از ۰ تومان");
    await expect(prices.locator("output").last()).toHaveText(/[۰-۹][۰-۹٬]*/u);
    await expect(prices.locator("output").last()).toHaveAccessibleName(/^تا [۰-۹][۰-۹٬]* تومان$/u);
    await expect(prices.getByText("تومان", { exact: true })).toHaveCount(2);
    const priceLayout = await prices.evaluate((element) => {
      const outputs = [...element.querySelectorAll("output")];
      const blocks = outputs.map((output) => output.parentElement!.getBoundingClientRect());
      return {
        sameRow: Math.abs(blocks[0].top + blocks[0].height / 2 - blocks[1].top - blocks[1].height / 2) <= 1.5,
        minimumOnRight: blocks[0].left > blocks[1].right - 1,
        labels: outputs.map((output) => output.parentElement!.textContent?.trim().slice(0, 2)),
        noOverflow: outputs.every((output) => output.scrollWidth <= output.clientWidth + 1) && element.scrollWidth <= element.clientWidth + 1,
      };
    });
    expect(priceLayout).toEqual({ sameRow: true, minimumOnRight: true, labels: ["از", "تا"], noOverflow: true });
    await prices.screenshot({ path: `test-results/round2-prices-${width}.png` });
    const calls: unknown[] = [];
    page.on("request", (request) => { if (request.url().endsWith("/api/search")) calls.push(request.postDataJSON()); });
    await min.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(min).toHaveValue("1");
    await max.focus();
    await page.keyboard.press("ArrowRight");
    await expect(max).toHaveValue(String(maximum - 1));
    await panel.getByLabel("فقط بدون توقف", { exact: true }).check();
    expect(calls).toEqual([]);
    await expect(cards).toHaveCount(count);
    const appliedRequest = page.waitForRequest((request) => request.url().endsWith("/api/search"));
    const appliedResponse = page.waitForResponse((response) => response.url().endsWith("/api/search"));
    await panel.getByRole("button", { name: "اعمال فیلترها", exact: true }).click();
    expect((await appliedRequest).postDataJSON().filters).toMatchObject({ minPriceRials: 1, maxPriceRials: maximum - 1, nonstopOnly: true });
    await appliedResponse;
    await expect(page.locator('[aria-labelledby="results-title"]')).toHaveAttribute("aria-busy", "false");
    if (width < 1024) {
      await expect(panel).not.toBeVisible();
      await page.getByRole("button", { name: "نمایش فیلترها", exact: true }).click();
    }
    await expect(panel.getByLabel("فقط بدون توقف", { exact: true })).toBeChecked();
    const resetRequest = page.waitForRequest((request) => request.url().endsWith("/api/search"));
    const resetResponse = page.waitForResponse((response) => response.url().endsWith("/api/search"));
    await panel.getByRole("button", { name: "پاک کردن", exact: true }).click();
    expect((await resetRequest).postDataJSON().filters).toEqual({});
    await resetResponse;
    await expect(min).toHaveValue("0");
    await expect(max).toHaveValue(String(maximum));
    await expect(panel.getByLabel("فقط بدون توقف", { exact: true })).not.toBeChecked();
    await expect(cards).toHaveCount(count);
    if (await page.getByRole("dialog", { name: "فیلترها", exact: true }).isVisible()) await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
