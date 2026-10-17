import { expect, test } from "@playwright/test";

const routeUrl = "/?origin=THR&destination=MHD&date=2026-10-16&adults=1&mode=demo";

for (const width of [375, 430, 768, 1024, 1440, 1920]) {
  test(`aircraft, seller price alignment and grouped comparison stay usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto(routeUrl);
    const cards = page.locator(".flight-card");
    await expect(cards).toHaveCount(16);
    const first = cards.first();
    const aircraft = first.locator(".aircraft-caption[lang='en']").first();
    await expect(aircraft).toBeVisible();
    const type = await first.locator(".airline-name-model").evaluate((element) => {
      const name = element.querySelector("[data-airline-id] bdi")!;
      const model = element.querySelector<HTMLElement>(".aircraft-caption[lang='en']")!;
      const dot = element.querySelector<HTMLElement>(".aircraft-caption[aria-hidden='true']")!;
      const modelStyle = getComputedStyle(model);
      const modelBounds = model.getBoundingClientRect();
      const dotBounds = dot.getBoundingClientRect();
      return {
        nameSize: parseFloat(getComputedStyle(name).fontSize), modelSize: parseFloat(modelStyle.fontSize),
        modelWeight: modelStyle.fontWeight, direction: modelStyle.direction, isolated: modelStyle.unicodeBidi,
        dotGap: dotBounds.left - modelBounds.right,
        overflow: element.scrollWidth > element.clientWidth + 1,
      };
    });
    expect(type.modelSize).toBeLessThan(type.nameSize);
    expect(type.modelWeight).toBe("400");
    expect(type.direction).toBe("ltr");
    expect(type.isolated).toBe("isolate");
    expect(type.dotGap).toBeGreaterThanOrEqual(6);
    expect(type.overflow).toBe(false);
    await expect(first.locator(".ticket-meta .aircraft-caption")).toHaveCount(0);

    await first.locator(".ticket-card-open").click();
    const details = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
    await expect(details).toBeVisible();
    const sellers = details.locator(".seller-offer");
    await expect(sellers).toHaveCount(3);
    for (const seller of await sellers.all()) {
      const layout = await seller.locator(".seller-offer-header").evaluate((element) => {
        const name = element.querySelector("h3")!.getBoundingClientRect();
        const price = element.querySelector(".offer-price")!.getBoundingClientRect();
        const note = element.querySelector("p")!.getBoundingClientRect();
        return {
          nameRightOfPrice: name.left + name.width / 2 > price.left + price.width / 2,
          primaryRowOffset: Math.abs(name.top + name.height / 2 - price.top - price.height / 2),
          noteBelowPrice: note.top >= price.bottom - 1,
          overflow: element.scrollWidth > element.clientWidth + 1,
        };
      });
      expect(layout.nameRightOfPrice).toBe(true);
      expect(layout.primaryRowOffset).toBeLessThanOrEqual(1.5);
      expect(layout.noteBelowPrice).toBe(true);
      expect(layout.overflow).toBe(false);
      await expect(seller.locator(".price-currency")).toHaveCSS("font-weight", "400");
    }
    await sellers.first().screenshot({ path: `test-results/refinement-seller-alignment-${width}.png` });
    // Select the flexible seller explicitly; comparison must not substitute the cheaper card quote.
    const selectedPrice = await sellers.nth(2).locator(".offer-price").innerText();
    await sellers.nth(2).getByRole("button", { name: "مقایسه با این پیشنهاد", exact: true }).click();
    await expect(sellers.nth(2).getByRole("button", { name: "حذف از مقایسه", exact: true }).locator('[data-icon-name="Trash"]')).toHaveCount(1);
    await expect(sellers.first().getByRole("button", { name: "مقایسه با این پیشنهاد", exact: true })).toBeEnabled();
    await page.keyboard.press("Escape");
    const selectedAction = first.getByRole("button", { name: "حذف از مقایسه", exact: true });
    await expect(selectedAction.locator('[data-icon-name="Trash"]')).toHaveCount(1);
    await expect(selectedAction).toHaveCSS("color", "rgb(239, 20, 43)");
    await cards.nth(1).getByRole("button", { name: "افزودن به مقایسه", exact: true }).click();
    const bar = page.locator(".comparison-bar");
    await expect(bar.getByRole("button", { name: "پاک کردن", exact: true }).locator('[data-icon-name="Trash"]')).toHaveCount(1);
    await bar.getByRole("button", { name: "مقایسه پروازها", exact: true }).click();
    const comparison = page.getByRole("dialog", { name: "مقایسه پروازهای انتخاب‌شده", exact: true });
    await expect(comparison).toBeVisible();
    const compared = comparison.locator(".comparison-card");
    await expect(compared).toHaveCount(2);
    await expect(compared.first().locator(".price")).toHaveText(selectedPrice, { useInnerText: true });
    await expect(compared.first()).toContainText("۳۰ کیلو بار تحویلی");
    await expect(compared.first()).toContainText("استرداد با کسر ۱۵ درصد");
    for (const item of await compared.all()) {
      for (const label of ["فروشنده و قیمت", "برنامه بخش ۱", "بار و شرایط پیشنهاد", "سابقه لغو"]) await expect(item.locator(`section[aria-label="${label}"]`)).toBeVisible();
      await expect(item.locator("[data-metadata-badge]").first()).toBeVisible();
      await expect(item.getByRole("button", { name: /^حذف پرواز .* از مقایسه$/u }).locator('[data-icon-name="Trash"]')).toHaveCount(1);
      expect(await item.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    }
    const layout = await compared.evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, left: rect.left, bottom: rect.bottom };
    }));
    if (width >= 768) expect(Math.abs(layout[0].top - layout[1].top)).toBeLessThanOrEqual(1.5);
    else {
      expect(Math.abs(layout[0].left - layout[1].left)).toBeLessThanOrEqual(1.5);
      expect(layout[1].top).toBeGreaterThan(layout[0].bottom);
    }
    await comparison.screenshot({ path: `test-results/refinement-comparison-${width}.png` });
    await compared.first().getByRole("button", { name: /^حذف پرواز .* از مقایسه$/u }).click();
    await expect(comparison).not.toBeVisible();
    await expect(first.getByRole("button", { name: "افزودن به مقایسه", exact: true })).toBeVisible();
    await expect(cards.nth(1).getByRole("button", { name: "حذف از مقایسه", exact: true })).toBeVisible();
    await expect(bar).toContainText("۱ پرواز برای مقایسه");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
