import { expect, test, type Locator, type Page } from "@playwright/test";

const oneWayUrl = "/?origin=THR&destination=MHD&date=2026-10-20&adults=1&mode=demo";
const roundTripUrl = `${oneWayUrl}&tripType=round-trip&returnDate=2026-10-24`;

async function selectJourneyOffer(page: Page, card: Locator = page.locator(".flight-card").first()) {
  await card.locator(".ticket-card-open").click();
  const dialog = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "انتخاب برای سفر", exact: true }).first().click();
  await expect(dialog).not.toBeVisible();
}

test("round-trip filter drafts and comparisons belong to their leg, while changing an earlier flight preserves a compatible return", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(roundTripUrl);
  await expect(page.locator(".flight-card")).toHaveCount(16);
  const panel = page.getByRole("complementary", { name: "فیلتر پروازها", exact: true });
  await panel.getByLabel("فقط بدون توقف", { exact: true }).check();
  const outboundRequest = page.waitForRequest((request) => request.url().endsWith("/api/search"));
  await panel.getByRole("button", { name: "اعمال فیلترها", exact: true }).click();
  expect((await outboundRequest).postDataJSON()).toMatchObject({ query: { origin: "THR", destination: "MHD", departureDate: "2026-10-20" }, filters: { nonstopOnly: true } });
  await expect(page.locator(".flight-card")).toHaveCount(14);
  await page.locator(".flight-card").first().getByRole("button", { name: "افزودن به مقایسه", exact: true }).click();
  await expect(page.locator(".comparison-bar")).toContainText("۱ پرواز برای مقایسه");
  await selectJourneyOffer(page);

  await expect(page.getByRole("button", { name: "انتخاب پرواز برگشت", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".flight-card")).toHaveCount(16);
  await expect(page.locator(".comparison-bar")).toHaveCount(0);
  await expect(panel.getByLabel("فقط بدون توقف", { exact: true })).not.toBeChecked();
  const period = panel.getByRole("combobox", { name: "بازه زمان حرکت", exact: true });
  await period.selectOption("morning");
  const inboundRequest = page.waitForRequest((request) => request.url().endsWith("/api/search"));
  await panel.getByRole("button", { name: "اعمال فیلترها", exact: true }).click();
  expect((await inboundRequest).postDataJSON()).toMatchObject({ query: { origin: "MHD", destination: "THR", departureDate: "2026-10-24" }, filters: { departurePeriod: "morning" } });
  await expect(page.locator(".flight-card").first()).toBeVisible();
  // Wait for the submitted context to finish before selecting its seller snapshot.
  await expect(page.locator('[aria-labelledby="results-title"]')).toHaveAttribute("aria-busy", "false");
  await page.locator(".flight-card").first().getByRole("button", { name: "افزودن به مقایسه", exact: true }).click();
  await expect(page.locator(".comparison-bar")).toContainText("۱ پرواز برای مقایسه");
  await selectJourneyOffer(page);
  const chosenReturn = page.locator(".selected-journey-leg").nth(1);
  const returnSnapshot = await chosenReturn.innerText();
  await expect(page.locator(".journey-total .price")).toBeVisible();
  await expect(page.getByRole("button", { name: "ادامه و اطلاعات مسافران", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "انتخاب پرواز رفت", exact: true }).click();
  await expect(page.locator(".comparison-bar")).toHaveCount(0);
  await expect(panel.getByLabel("فقط بدون توقف", { exact: true })).toBeChecked();
  await expect(period).toHaveValue("all");
  await expect(page.locator(".flight-card")).toHaveCount(14);
  await selectJourneyOffer(page, page.locator(".flight-card").nth(1));
  await expect(page.getByRole("button", { name: "انتخاب پرواز برگشت", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(period).toHaveValue("morning");
  await expect(panel.getByLabel("فقط بدون توقف", { exact: true })).not.toBeChecked();
  await expect(chosenReturn).toHaveText(returnSnapshot, { useInnerText: true });
  await expect(page.locator(".journey-total .price")).toBeVisible();
  await expect(page.getByRole("button", { name: "ادامه و اطلاعات مسافران", exact: true })).toHaveCount(0);
  await expect(page.locator(".comparison-bar")).toHaveCount(0);
});

for (const scenario of [
  { name: "impossible departure date", query: "origin=THR&destination=MHD&date=2026-02-30", error: "تاریخ معتبر انتخاب کنید." },
  { name: "identical airports", query: "origin=THR&destination=THR&date=2026-10-20", error: "مبدأ و مقصد باید متفاوت باشند." },
  { name: "missing round-trip return date", query: "origin=THR&destination=MHD&date=2026-10-20&tripType=round-trip", error: "تاریخ برگشت را انتخاب کنید." },
]) {
  test(`invalid deep link shows field errors without flights: ${scenario.name}`, async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => { if (request.url().endsWith("/api/search")) requests.push(request.url()); });
    await page.goto(`/?mode=demo&adults=1&${scenario.query}`);
    await expect(page.locator(".search-field-error").filter({ hasText: scenario.error }).first()).toBeVisible();
    await expect(page.locator(".flight-card")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "مرتب‌سازی پروازها", exact: true })).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "فیلتر پروازها", exact: true })).toHaveCount(0);
    expect(requests).toEqual([]);
  });
}

