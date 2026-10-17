import { expect, test } from "@playwright/test";

const results = "/?origin=THR&destination=MHD&date=2026-10-20&adults=1&mode=demo";

for (const width of [375, 430, 768, 1024, 1440, 1920]) {
  test(`search refinements keep responsive navigation, criteria icons and compact mobile controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const initial = page.getByRole("region", { name: "شروع جست‌وجو", exact: true });
    const center = await initial.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const icon = element.querySelector("svg")!.getBoundingClientRect();
      return { delta: Math.abs((bounds.left + bounds.right - icon.left - icon.right) / 2), alignment: getComputedStyle(element).textAlign };
    });
    expect(center.delta).toBeLessThan(1.5);
    expect(center.alignment).toBe("center");
    await expect(page.locator(".flight-card")).toHaveCount(0);
    const header = page.locator(".site-header");
    const menuButton = header.getByRole("button", { name: "باز کردن منو", exact: true });
    if (width < 1024) {
      await expect(menuButton).toBeVisible();
      await expect(menuButton).toHaveAttribute("aria-expanded", "false");
      await menuButton.focus();
      await page.keyboard.press("Enter");
      const menu = page.getByRole("dialog", { name: "ترب بلیط", exact: true });
      await expect(menu).toBeVisible();
      await expect(menuButton).toHaveAttribute("aria-expanded", "true");
      await expect(menu.getByRole("link", { name: "بلیط‌های من", exact: true })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(menuButton).toBeFocused();
      await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    } else {
      await expect(header.locator(".header-menu-toggle")).toBeHidden();
      await expect(header.getByRole("navigation", { name: "ناوبری اصلی", exact: true })).toBeVisible();
    }
    await page.goto(results);
    await expect(page.locator(".flight-card")).toHaveCount(16);
    await expect(page.getByText("درباره اطلاعات این جست‌وجو", { exact: true })).toHaveCount(0);
    await expect(page.locator(".search-source-note")).toHaveCount(0);
    await expect(page.locator(".results-mode-label")).toHaveText("اطلاعات آزمایشی");
    await expect(page.locator(".origin-field .search-label svg")).toHaveAttribute("data-icon-name", "PlaneTakeoff");
    await expect(page.locator(".destination-field .search-label svg")).toHaveAttribute("data-icon-name", "PlaneLanding");
    await page.getByRole("button", { name: "مقصد", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "انتخاب مقصد", exact: true });
    await expect(picker.locator(".airport-option > svg").first()).toHaveAttribute("data-icon-name", "PlaneLanding");
    await page.keyboard.press("Escape");

    const filter = page.getByRole("button", { name: "نمایش فیلترها", exact: true });
    if (width < 1024) {
      const bounds = await filter.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      await expect(filter).toHaveAttribute("aria-expanded", "false");
      await filter.click();
      await expect(page.getByRole("dialog", { name: "فیلترها", exact: true })).toBeVisible();
      await expect(filter).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(filter).toBeFocused();
    }
    if (width < 768) {
      const mobile = await page.evaluate(() => {
        const summary = document.querySelector(".results-summary")!;
        const passenger = document.querySelector(".passenger-field .select-chevron")!.getBoundingClientRect();
        const airport = document.querySelector(".destination-field .airport-selector-trigger > svg")!.getBoundingClientRect();
        const sort = document.querySelector<HTMLSelectElement>(".sort-control select")!;
        return { summaryFont: getComputedStyle(summary).fontSize, chevronDelta: Math.abs(passenger.left - airport.left), sortHeight: sort.getBoundingClientRect().height, sortFont: getComputedStyle(sort).fontSize, sortWidth: sort.getBoundingClientRect().width };
      });
      expect(mobile).toMatchObject({ summaryFont: "12px", sortFont: "12px" });
      expect(mobile.chevronDelta).toBeLessThan(1.5);
      expect(mobile.sortHeight).toBe(40);
      expect(mobile.sortWidth).toBeLessThanOrEqual(160);
    }
    const request = page.waitForResponse((response) => response.url().endsWith("/api/search"));
    await page.getByRole("combobox", { name: "مرتب‌سازی پروازها", exact: true }).selectOption("duration");
    expect((await (await request).json()).data.sort).toBe("duration");
    await expect(page.locator(".flight-card").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/functional-search-${width}.png`, fullPage: true });
  });
}

test("expanded mobile navigation closes when full desktop navigation becomes available", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 1000 });
  await page.goto("/");
  const button = page.getByRole("button", { name: "باز کردن منو", exact: true });
  await button.click();
  await expect(page.getByRole("dialog", { name: "ترب بلیط", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole("dialog", { name: "ترب بلیط", exact: true })).not.toBeVisible();
  await expect(page.locator(".header-menu-toggle")).toBeHidden();
  await expect(page.getByRole("navigation", { name: "ناوبری اصلی", exact: true })).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
});
