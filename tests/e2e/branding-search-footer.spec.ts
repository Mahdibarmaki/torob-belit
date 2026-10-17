import { expect, test, type Page } from "@playwright/test";
import { formatJalaliDate, gregorianToJalali } from "../../src/domain/jalali";

async function chooseAirport(page: Page, label: string, code: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `انتخاب ${label}`, exact: true });
  await dialog.getByRole("combobox", { name: "جست‌وجوی شهر یا فرودگاه", exact: true }).fill(code);
  await dialog.getByRole("option", { name: new RegExp(`، ${code}$`) }).click();
}

for (const width of [375, 430, 768, 1024, 1440]) {
  test(`search validation and four footer icons preserve spacing and interactions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const inventoryRequests: string[] = [];
    page.on("request", (request) => { if (request.url().endsWith("/api/search")) inventoryRequests.push(request.url()); });
    await page.goto("/");
    const panel = page.locator(".search-panel");
    const before = (await panel.boundingBox())!;
    await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
    const message = page.getByRole("alert").filter({ hasText: "لطفاً فیلدهای مشخص‌شده را بررسی کنید." });
    await expect(message).toBeVisible();
    const spacing = await message.evaluate((element) => {
      const range = document.createRange(); range.selectNodeContents(element);
      const text = range.getBoundingClientRect();
      const panel = element.closest(".search-panel")!.getBoundingClientRect();
      const form = element.closest(".search-panel")!.querySelector("form")!;
      const formBox = form.getBoundingClientRect();
      const summary = element.closest(".search-panel")!.querySelector(".search-help")!.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { bottomGap: panel.bottom - text.bottom, topGap: text.top - summary.bottom, rightGap: Math.abs(text.right - (formBox.right - parseFloat(getComputedStyle(form).paddingRight))), padTop: style.paddingTop, padBottom: style.paddingBottom, panelHeight: panel.height };
    });
    expect(spacing.padTop).toBe("12px"); expect(spacing.padBottom).toBe("20px");
    expect(spacing.topGap).toBeGreaterThanOrEqual(10);
    expect(spacing.bottomGap).toBeGreaterThanOrEqual(18);
    expect(spacing.rightGap).toBeLessThan(2);
    expect(spacing.panelHeight).toBeGreaterThan(before.height + 32);
    expect(inventoryRequests).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await panel.screenshot({ path: `test-results/branding-validation-${width}.png` });

    await chooseAirport(page, "مبدأ", "THR"); await chooseAirport(page, "مقصد", "MHD");
    await page.getByRole("button", { name: "تاریخ رفت", exact: true }).click();
    const date = "2026-10-20"; const parts = gregorianToJalali(date);
    const calendar = page.getByRole("dialog", { name: "انتخاب تاریخ رفت", exact: true });
    await calendar.getByRole("combobox", { name: "سال شمسی", exact: true }).selectOption(String(parts.year));
    await calendar.getByRole("combobox", { name: "ماه شمسی", exact: true }).selectOption(String(parts.month));
    await calendar.getByRole("button", { name: formatJalaliDate(date), exact: true }).click();
    await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
    await expect(page.locator(".flight-card")).toHaveCount(16);
    await expect(message).toHaveCount(0);

    const socials = page.locator(".footer-socials");
    const buttons = socials.getByRole("button");
    await expect(buttons).toHaveCount(4);
    await expect(socials.locator("a")).toHaveCount(0);
    await expect(buttons.nth(0)).toHaveAccessibleName("اینستاگرام؛ حساب رسمی فعال نیست");
    const icons = await buttons.locator("svg").evaluateAll((items) => items.map((item) => item.getAttribute("data-icon-name")));
    expect(icons).toEqual(["Instagram", "Send", "MessageCircle", "Mail"]);
    for (const button of await buttons.all()) {
      await expect(button).toHaveAttribute("type", "button");
      await expect(button).toHaveCSS("color", "rgb(102, 102, 102)");
      await expect(button.locator("svg")).toHaveAttribute("data-icon-style", "solid");
      const box = (await button.boundingBox())!; expect(box.width).toBe(40); expect(box.height).toBe(40);
    }
    const x = await buttons.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().x));
    expect(x).toEqual([...x].sort((left, right) => right - left));
    const instagram = buttons.first();
    await instagram.hover();
    await expect(instagram).toHaveCSS("color", "rgb(24, 25, 37)");
    await page.mouse.move(0, 0);
    await instagram.focus();
    await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
    await expect(instagram).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "شبکه‌های اجتماعی", exact: true })).toContainText("حساب رسمی شبکه اجتماعی تعریف نشده");
    await page.keyboard.press("Escape");
    await expect(instagram).toBeFocused();
    await socials.screenshot({ path: `test-results/branding-footer-socials-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
