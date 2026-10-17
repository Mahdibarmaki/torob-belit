import { expect, test, type Locator } from "@playwright/test";
import type { SearchResponse } from "../../src/application/search-service";
import { formatToman } from "../../src/domain/money";

const routeUrl = "/?origin=THR&destination=MHD&date=2026-10-16&adults=1&mode=demo";
const longSellerName = "فروشنده آزمایشی با نام طولانی برای بررسی چیدمان و جلوگیری از هم‌پوشانی اطلاعات سفر";

async function priceGeometry(card: Locator) {
  return card.locator(".ticket-price-region").evaluate((element) => {
    const price = element.querySelector<HTMLElement>(".price")!;
    const summary = element.querySelector<HTMLElement>(".price-caption")!;
    const value = price.querySelector(".price-amount")!;
    const currency = price.querySelector(".price-currency")!;
    const priceBounds = price.getBoundingClientRect();
    const summaryBounds = summary.getBoundingClientRect();
    const regionBounds = element.getBoundingClientRect();
    return {
      layout: getComputedStyle(price.parentElement!).display,
      column: getComputedStyle(element).gridColumnStart,
      priceOnRight: priceBounds.left >= summaryBounds.right,
      horizontalGap: priceBounds.left - summaryBounds.right,
      centerDifference: Math.abs(priceBounds.top + priceBounds.height / 2 - summaryBounds.top - summaryBounds.height / 2),
      stacked: summaryBounds.top >= priceBounds.bottom,
      summaryAlign: getComputedStyle(summary).textAlign,
      summaryColor: getComputedStyle(summary).color,
      priceColor: getComputedStyle(price).color,
      numberSize: parseFloat(getComputedStyle(value).fontSize),
      currencySize: parseFloat(getComputedStyle(currency).fontSize),
      currencyWeight: getComputedStyle(currency).fontWeight,
      bothInside: priceBounds.left >= regionBounds.left - 1 && priceBounds.right <= regionBounds.right + 1 && summaryBounds.left >= regionBounds.left - 1 && summaryBounds.right <= regionBounds.right + 1,
      overflow: element.scrollWidth > element.clientWidth + 1 || summary.scrollWidth > summary.clientWidth + 1 || price.scrollWidth > price.clientWidth + 1,
    };
  });
}

for (const width of [375, 430, 768, 1024, 1440]) {
  test(`mobile price row and unchanged larger-screen stack retain dynamic party and seller values at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto(routeUrl);
    const firstCard = page.locator(".flight-card").first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator(".price-caption")).toContainText("مجموع ۱ بزرگسال");
    const normal = await priceGeometry(firstCard);
    expect(normal.currencyWeight).toBe("400");
    expect(normal.currencySize).toBeLessThan(normal.numberSize);
    expect(normal.priceColor).toBe("rgb(189, 19, 37)");
    expect(normal.summaryColor).toBe("rgb(102, 102, 102)");
    expect(normal.bothInside).toBe(true);
    expect(normal.overflow).toBe(false);
    if (width <= 700) {
      expect(normal.layout).toBe("grid");
      expect(normal.column).toBe("1");
      expect(normal.priceOnRight).toBe(true);
      expect(normal.horizontalGap).toBeGreaterThanOrEqual(15);
      expect(normal.centerDifference).toBeLessThanOrEqual(1.5);
      expect(normal.summaryAlign).toBe("left");
    } else {
      expect(normal.layout).toBe("block");
      expect(normal.column).toBe("2");
      expect(normal.stacked).toBe(true);
      expect(normal.summaryAlign).not.toBe("left");
    }

    // Seller offer cards keep their existing independent two-row header layout.
    await firstCard.locator(".ticket-card-open").click();
    const details = page.getByRole("dialog", { name: "جزئیات پرواز", exact: true });
    const sellers = details.locator(".seller-offer-header");
    await expect(sellers).toHaveCount(3);
    const sellerGeometry = await sellers.evaluateAll((headers) => headers.map((header) => {
      const name = header.querySelector("h3")!.getBoundingClientRect();
      const price = header.querySelector(".offer-price")!.getBoundingClientRect();
      const note = header.querySelector("p")!.getBoundingClientRect();
      return {
        layout: getComputedStyle(header).display,
        nameOnRight: name.left > price.left,
        centerDifference: Math.abs(name.top + name.height / 2 - price.top - price.height / 2),
        noteBelow: note.top >= price.bottom - 1,
      };
    }));
    for (const header of sellerGeometry) {
      expect(header).toMatchObject({ layout: "grid", nameOnRight: true, noteBelow: true });
      expect(header.centerDifference).toBeLessThanOrEqual(1.5);
    }
    await page.keyboard.press("Escape");

    // Only this browser transport uses a deliberately long seller label. The
    // actual fixture, passenger pricing and canonical rial amount are unchanged.
    await page.route("**/api/search", async (route) => {
      const original = await route.fetch();
      const body: { ok: boolean; data: SearchResponse } = await original.json();
      for (const result of body.data.flights) {
        const selectedSeller = result.selectedOffer.sellerId;
        for (const offer of [...result.eligibleOffers, ...result.flight.offers]) if (offer.sellerId === selectedSeller) offer.sellerName = longSellerName;
        result.selectedOffer.sellerName = longSellerName;
      }
      await route.fulfill({ response: original, json: body });
    });
    await page.getByRole("combobox", { name: "تعداد مسافران بزرگسال", exact: true }).selectOption("9");
    const requested = page.waitForRequest((request) => request.url().endsWith("/api/search"));
    const responded = page.waitForResponse((response) => response.url().endsWith("/api/search"));
    await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
    expect((await requested).postDataJSON().query.adults).toBe(9);
    const body: { ok: boolean; data: SearchResponse } = await (await responded).json();
    await expect(firstCard.locator(".price-caption")).toHaveText(`مجموع ۹ بزرگسال · ${longSellerName}`);
    await expect(firstCard.locator(".ticket-price-region .price")).toHaveText(formatToman(body.data.flights[0].selectedOffer.totalPrice));
    const long = await priceGeometry(firstCard);
    expect(long.priceColor).toBe(normal.priceColor);
    expect(long.numberSize).toBe(normal.numberSize);
    expect(long.currencySize).toBe(normal.currencySize);
    expect(long.currencyWeight).toBe("400");
    expect(long.bothInside).toBe(true);
    expect(long.overflow).toBe(false);
    if (width <= 700) {
      expect(long.priceOnRight).toBe(true);
      expect(long.horizontalGap).toBeGreaterThanOrEqual(15);
      expect(long.centerDifference).toBeLessThanOrEqual(1.5);
      expect(long.summaryAlign).toBe("left");
    } else {
      expect(long.layout).toBe("block");
      expect(long.column).toBe("2");
      expect(long.stacked).toBe(true);
    }
    await firstCard.screenshot({ path: `test-results/branding-price-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
