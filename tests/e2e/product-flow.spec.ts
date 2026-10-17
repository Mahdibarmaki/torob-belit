import { expect, test, type Page } from "@playwright/test";
import { formatJalaliDate, gregorianToJalali } from "../../src/domain/jalali";

async function airport(page: Page, label: string, code: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `انتخاب ${label}`, exact: true });
  const input = dialog.getByRole("combobox", { name: "جست‌وجوی شهر یا فرودگاه", exact: true });
  await input.fill(code);
  await dialog.getByRole("option", { name: new RegExp(`، ${code}$`) }).click();
}
async function date(page: Page, label: string, iso: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const dialog = page.locator("dialog[open]").last();
  const parts = gregorianToJalali(iso);
  await dialog.getByRole("combobox", { name: "سال شمسی", exact: true }).selectOption(String(parts.year));
  await dialog.getByRole("combobox", { name: "ماه شمسی", exact: true }).selectOption(String(parts.month));
  await dialog.getByRole("button", { name: formatJalaliDate(iso), exact: true }).click();
}
async function search(page: Page, roundTrip = false) {
  await page.goto("/");
  if (roundTrip) await page.getByRole("tab", { name: "دوطرفه", exact: true }).click();
  await airport(page, "مبدأ", "THR");
  await airport(page, "مقصد", "MHD");
  await date(page, "تاریخ رفت", "2026-10-20");
  if (roundTrip) await date(page, "تاریخ برگشت", "2026-10-24");
  await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
  await expect(page.locator(".flight-card").first()).toBeVisible();
  await expect(page).toHaveURL(/\/\?origin=THR/);
}
async function selectJourneyOffer(page: Page) {
  await page.locator(".flight-card").first().locator(".ticket-card-open").click();
  const dialog = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".flight-detail-summary")).toHaveCount(0);
  await expect(dialog.getByRole("heading", { name: "مسیر و برنامه", exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("heading", { name: "سابقه لغو", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const seller = dialog.locator(".seller-offer").first();
  const price = await seller.locator(".offer-price").innerText();
  const name = await seller.getByRole("heading").innerText();
  await seller.getByRole("button", { name: "انتخاب برای سفر", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  return { price, name };
}

test("first visit is empty, field errors are accessible and edits do not replace submitted results", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith("/api/search")) requests.push(request.url()); });
  await page.goto("/");
  await expect(page.getByText("شهر مبدأ را انتخاب کنید", { exact: true })).toBeVisible();
  await expect(page.getByText("شهر مقصد را انتخاب کنید", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "تاریخ رفت", exact: true })).toContainText("تاریخ رفت را انتخاب کنید");
  await expect(page.locator(".flight-card")).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "مرتب‌سازی پروازها", exact: true })).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
  await expect(page.locator('[aria-invalid="true"], [data-invalid="true"]')).not.toHaveCount(0);
  expect(requests).toEqual([]);
  await search(page);
  const before = await page.locator(".flight-card .airline-caption").allTextContents();
  await airport(page, "مقصد", "SYZ");
  await expect(page.locator(".flight-card .airline-caption")).toHaveText(before);
});

for (const width of [375, 430, 768, 1024, 1440]) {
  test(`round-trip retains separate dated legs and selected seller summaries without checkout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await search(page, true);
    const outbound = await selectJourneyOffer(page);
    await expect(page.getByRole("button", { name: "انتخاب پرواز برگشت", exact: true })).toHaveAttribute("aria-pressed", "true");
    const inbound = await selectJourneyOffer(page);
    const legs = page.locator(".selected-journey-leg");
    await expect(legs).toHaveCount(2);
    await expect(legs.nth(0)).toContainText(formatJalaliDate("2026-10-20"));
    await expect(legs.nth(0)).toContainText(outbound.name);
    await expect(legs.nth(0).locator("bdi:has(.price-amount)")).toHaveText(outbound.price, { useInnerText: true });
    await expect(legs.nth(1)).toContainText(formatJalaliDate("2026-10-24"));
    await expect(legs.nth(1)).toContainText(inbound.name);
    await expect(legs.nth(1).locator("bdi:has(.price-amount)")).toHaveText(inbound.price, { useInnerText: true });
    await expect(page.locator(".journey-total .price")).toBeVisible();
    await expect(page.getByRole("button", { name: /ادامه.*مسافران/ })).toHaveCount(0);
    await expect(page.locator('a[href^="/checkout"], a[href^="/tickets"], a[href^="/my-tickets"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/referral-round-trip-${width}.png`, fullPage: true });
  });
}

test("airport input keeps one neutral accessible focus ring without changing the global input treatment", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "مبدأ", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "انتخاب مبدأ", exact: true });
  const input = dialog.getByRole("combobox", { name: "جست‌وجوی شهر یا فرودگاه", exact: true });
  await input.focus();
  await expect(input).toBeFocused();
  const style = await input.evaluate((element) => {
    const value = getComputedStyle(element);
    return { outline: value.outlineWidth, outlineColor: value.outlineColor, outlineStyle: value.outlineStyle, boxShadow: value.boxShadow, background: value.backgroundColor };
  });
  expect(style).toMatchObject({ outline: "2px", outlineColor: "rgb(102, 102, 102)", outlineStyle: "solid", boxShadow: "none", background: "rgb(245, 245, 245)" });
});
