import { expect, test, type Locator, type Page } from "@playwright/test";

const searchLabel = "جست‌وجوی شهر یا فرودگاه";

async function openAirport(page: Page, label: "مبدأ" | "مقصد") {
  const trigger = page.getByRole("button", { name: label, exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: `انتخاب ${label}`, exact: true });
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  return { trigger, dialog, input: dialog.getByRole("combobox", { name: searchLabel, exact: true }) };
}

async function pickerAppearance(dialog: Locator) {
  return dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    const header = getComputedStyle(element.querySelector(".modal-header")!);
    const body = getComputedStyle(element.querySelector(".modal-body")!);
    const close = getComputedStyle(element.querySelector(".modal-header button")!);
    return {
      background: style.backgroundColor,
      color: style.color,
      radius: style.borderRadius,
      shadow: style.boxShadow,
      width: element.getBoundingClientRect().width,
      font: style.fontFamily,
      animation: style.animationName,
      transition: style.transitionDuration,
      backdrop: getComputedStyle(element, "::backdrop").backgroundColor,
      headerPadding: header.padding,
      headerBackground: header.backgroundColor,
      bodyPadding: body.padding,
      closeBackground: close.backgroundColor,
      closeRadius: close.borderRadius,
      closeSize: [close.width, close.height],
    };
  });
}

test("Persian origin and IATA destination selection preserve route swapping and flight search", async ({ page }) => {
  await page.goto("/?origin=THR&destination=MHD&date=2026-10-16&adults=1&mode=demo");
  const origin = await openAirport(page, "مبدأ");
  await expect(origin.input).toBeFocused();
  await expect(origin.input).toHaveAttribute("placeholder", searchLabel);
  await origin.input.fill("تهران");
  await expect(origin.dialog.getByRole("option")).toHaveCount(2);
  await origin.dialog.getByRole("option", { name: "تهران (مهرآباد)، مهرآباد، THR", exact: true }).click();
  await expect(origin.trigger).toHaveAttribute("data-airport-code", "THR");
  await expect(origin.trigger).toBeFocused();

  const destination = await openAirport(page, "مقصد");
  await destination.input.fill("MHD");
  await expect(destination.dialog.getByRole("option")).toHaveCount(1);
  await destination.dialog.getByRole("option", { name: "مشهد، هاشمی‌نژاد، MHD", exact: true }).click();
  await expect(destination.trigger).toHaveAttribute("data-airport-code", "MHD");
  await page.getByRole("button", { name: "جابه‌جایی مبدأ و مقصد", exact: true }).click();
  await expect(origin.trigger).toHaveAttribute("data-airport-code", "MHD");
  await expect(destination.trigger).toHaveAttribute("data-airport-code", "THR");
  await page.getByRole("button", { name: "جابه‌جایی مبدأ و مقصد", exact: true }).click();
  await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
  await expect(page).toHaveURL(/origin=THR.*destination=MHD/);
  await expect(page.locator(".flight-card").first()).toBeVisible();
});

test("partial airport-name and case-insensitive IATA searches do not change the selection while typing", async ({ page }) => {
  await page.goto("/?origin=THR&destination=MHD&date=2026-10-16&adults=1&mode=demo");
  const { trigger, dialog, input } = await openAirport(page, "مبدأ");
  await expect(dialog.getByRole("option", { selected: true })).toHaveAccessibleName("تهران (مهرآباد)، مهرآباد، THR");
  for (const [query, airport] of [["خمینی", "IKA"], ["mhd", "MHD"], ["هاشمی", "MHD"], ["mashh", "MHD"], ["Mehr", "THR"]]) {
    await input.fill(query);
    await expect(dialog.getByRole("option")).toHaveCount(1);
    await expect(dialog.getByRole("option")).toHaveAccessibleName(new RegExp(`، ${airport}$`));
    await expect(trigger).toHaveAttribute("data-airport-code", "THR");
  }
  await input.fill("فرودگاه ناموجود xyz");
  await expect(dialog.getByRole("option")).toHaveCount(0);
  await expect(dialog.getByRole("status").filter({ hasText: "فرودگاهی پیدا نشد" })).toBeVisible();
  await input.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute("data-airport-code", "THR");
});

test("Escape, close button and backdrop dismiss changes and restore the originating field", async ({ page }) => {
  await page.goto("/?origin=THR&destination=MHD&date=2026-10-16&adults=1&mode=demo");
  for (const method of ["escape", "close", "backdrop"] as const) {
    const { trigger, dialog, input } = await openAirport(page, "مقصد");
    await input.fill("LHR");
    await expect(dialog.getByRole("option")).toHaveCount(1);
    if (method === "escape") await input.press("Escape");
    else if (method === "close") await dialog.getByRole("button", { name: "بستن پنجره", exact: true }).click();
    else await page.mouse.click(4, 4);
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toHaveAttribute("data-airport-code", "MHD");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  }
});

test("editable combobox supports arrows, Enter, focus trapping and safe composition", async ({ page }) => {
  await page.goto("/?origin=THR&destination=MHD&date=2026-10-16&adults=1&mode=demo");
  const { trigger, dialog, input } = await openAirport(page, "مبدأ");
  await input.fill("تهران");
  const firstActive = await input.getAttribute("aria-activedescendant");
  expect(firstActive).toBeTruthy();
  await input.press("ArrowDown");
  const nextActive = await input.getAttribute("aria-activedescendant");
  expect(nextActive).toBeTruthy();
  expect(nextActive).not.toBe(firstActive);
  await expect(input).toBeFocused();
  await input.press("ArrowUp");
  await expect(input).toHaveAttribute("aria-activedescendant", firstActive!);
  await input.press("ArrowDown");
  await input.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true });
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute("data-airport-code", "THR");
  await input.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toHaveAttribute("data-airport-code", "IKA");
  await expect(trigger).toBeFocused();

  await trigger.click();
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest(".airport-picker-dialog")))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

for (const [name, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]] as const) {
  test(`airport picker shares the date dialog appearance and centered presentation on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/?origin=THR&destination=MHD&date=2026-10-16&adults=1&mode=demo");
    await page.getByRole("button", { name: "تاریخ رفت", exact: true }).click();
    const date = page.getByRole("dialog", { name: "انتخاب تاریخ رفت", exact: true });
    const reference = await pickerAppearance(date);
    await expect(date.locator(".jalali-day.is-selected")).not.toHaveCSS("background-color", "rgb(239, 20, 43)");
    await page.screenshot({ path: `test-results/date-picker-${name}.png` });
    await page.keyboard.press("Escape");
    const { dialog } = await openAirport(page, "مبدأ");
    expect(await pickerAppearance(dialog)).toEqual(reference);
    const selectedAirport = dialog.getByRole("option", { selected: true });
    await expect(selectedAirport).toHaveCSS("background-color", "rgb(255, 240, 242)");
    await expect(selectedAirport).toHaveCSS("color", "rgb(24, 25, 37)");
    await expect(selectedAirport.locator("svg.lucide-check")).toHaveCSS("color", "rgb(239, 20, 43)");
    await expect(selectedAirport.locator("svg.lucide-check")).toHaveCount(1);
    const bounds = await dialog.boundingBox();
    expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(2);
    expect(Math.abs(bounds!.y + bounds!.height / 2 - height / 2)).toBeLessThan(2);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/airport-selector-${name}.png` });
  });
}

test("touch layout avoids automatic keyboard focus and keeps search visible while the results scroll in a short viewport", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, baseURL });
  const page = await context.newPage();
  await page.goto("/?origin=THR&destination=MHD&date=2026-10-16&adults=1&mode=demo");
  const { dialog, input } = await openAirport(page, "مقصد");
  await expect(input).not.toBeFocused();
  await input.tap();
  await expect(input).toBeFocused();
  // Desktop Chrome does not open a software keyboard; a shorter visual viewport
  // exercises the same clipping/scroll constraints without claiming device QA.
  await page.setViewportSize({ width: 375, height: 430 });
  const list = dialog.getByRole("listbox", { name: "فرودگاه‌ها", exact: true });
  const before = await input.boundingBox();
  const scrolling = await list.evaluate((element) => {
    const before = element.scrollTop;
    element.scrollTop = element.scrollHeight;
    return { overflow: getComputedStyle(element).overflowY, scrollable: element.scrollHeight > element.clientHeight, changed: element.scrollTop > before };
  });
  expect(scrolling).toMatchObject({ scrollable: true, changed: true });
  expect(["auto", "scroll"]).toContain(scrolling.overflow);
  const after = await input.boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);
  expect(after!.y).toBeGreaterThanOrEqual(0);
  expect(after!.y + after!.height).toBeLessThanOrEqual(430);
  const bounds = await dialog.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(431);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await input.fill("MHD");
  await dialog.getByRole("option", { name: "مشهد، هاشمی‌نژاد، MHD", exact: true }).tap();
  await expect(dialog).not.toBeVisible();
  await context.close();
});

test("simulated visualViewport keyboard overlay keeps the airport dialog and input above the keyboard", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, baseURL });
  const page = await context.newPage();
  await page.goto("/?origin=THR&destination=MHD&date=2026-10-16&adults=1&mode=demo");
  const { dialog, input } = await openAirport(page, "مقصد");
  await input.tap();
  // Explicit simulation of a keyboard overlay that shrinks/pans visualViewport
  // without resizing innerHeight. This is not a claim of physical-device testing.
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Object.defineProperty(viewport, "height", { configurable: true, get: () => 340 });
    Object.defineProperty(viewport, "offsetTop", { configurable: true, get: () => 24 });
    viewport.dispatchEvent(new Event("resize"));
  });
  await expect(dialog).toHaveAttribute("data-keyboard-viewport", "");
  const bounds = await dialog.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(24);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(364);
  const inputBefore = await input.boundingBox();
  expect(inputBefore!.y).toBeGreaterThanOrEqual(24);
  expect(inputBefore!.y + inputBefore!.height).toBeLessThanOrEqual(364);
  const list = dialog.getByRole("listbox", { name: "فرودگاه‌ها", exact: true });
  const scrolled = await list.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return element.scrollHeight > element.clientHeight && element.scrollTop > 0;
  });
  expect(scrolled).toBe(true);
  const inputAfter = await input.boundingBox();
  expect(Math.abs(inputAfter!.y - inputBefore!.y)).toBeLessThan(1);
  await input.fill("MHD");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await context.close();
});
