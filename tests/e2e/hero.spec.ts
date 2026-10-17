import { expect, test } from "@playwright/test";

for (const width of [375, 430, 768, 1024, 1440, 1920]) {
  test(`hero photograph remains behind its copy and search is usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 932 : 1080 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const hero = page.locator(".hero-editorial");
    const image = hero.locator("img");
    await expect(image).toHaveCount(1);
    await expect(page.locator(".hero-visual")).toHaveCount(0);
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    await expect(hero.locator(".hero-eyebrow")).toHaveText("ترب بلیط؛ جست‌وجو و مقایسه پرواز");
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText("پروازها رو مقایسه کن، بهتر انتخاب کن.");
    await expect(hero.locator(".hero-description")).toHaveText("قیمت، ساعت پرواز و سابقه لغو رو یک‌جا ببین و پرواز مناسب خودت رو پیدا کن.");

    const layout = await hero.evaluate((element) => {
      const image = element.querySelector("img")!;
      const copy = element.querySelector(".hero-copy")!;
      const bounds = element.getBoundingClientRect();
      const imageBounds = image.getBoundingClientRect();
      const copyBounds = copy.getBoundingClientRect();
      return {
        position: getComputedStyle(element).position,
        imagePosition: getComputedStyle(image).position,
        objectFit: getComputedStyle(image).objectFit,
        copyAboveImage: Number(getComputedStyle(copy).zIndex) > Number(getComputedStyle(image).zIndex),
        imageMatchesHero: (["top", "left", "width", "height"] as const).every((key) => Math.abs(imageBounds[key] - bounds[key]) < 1),
        copyInsideHero: copyBounds.top >= bounds.top && copyBounds.bottom <= bounds.bottom + 1 && copyBounds.left >= bounds.left && copyBounds.right <= bounds.right + 1,
        source: image.currentSrc,
        imageRatio: image.naturalWidth / image.naturalHeight,
        sourceWidth: image.naturalWidth,
        coveredWidth: Math.max(bounds.width, bounds.height * 3),
        hasOverlay: getComputedStyle(element, "::before").backgroundImage.includes("linear-gradient"),
        direction: getComputedStyle(copy).direction,
        overflowing: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    expect(layout).toMatchObject({ position: "relative", imagePosition: "absolute", objectFit: "cover", copyAboveImage: true, imageMatchesHero: true, copyInsideHero: true, hasOverlay: true, direction: "rtl", overflowing: false });
    expect(layout.source).toContain("/_next/image?url=%2Fimages%2Fhero-airplane.png");
    expect(layout.imageRatio).toBeCloseTo(3, 1);
    // A portrait cover crop must not upscale a viewport-width thumbnail into a wide source.
    expect(layout.sourceWidth).toBeGreaterThanOrEqual(layout.coveredWidth - 1);
    await expect(page.getByRole("tablist", { name: "نوع سفر", exact: true })).toBeVisible();
    await expect(hero.locator(".hero-visual-caption")).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "کشف پرواز", exact: true })).toHaveCount(0);
    const searchBox = await page.locator(".search-panel").boundingBox();
    const heroBox = await hero.boundingBox();
    expect(searchBox!.y).toBeGreaterThanOrEqual(heroBox!.y + heroBox!.height);
    await expect(page.getByRole("button", { name: "مبدأ", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "مقصد", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "تاریخ رفت", exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "تعداد مسافران بزرگسال", exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/hero-background-${width}.png` });
    await page.getByRole("button", { name: "جست‌وجوی پرواز", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(".flight-card")).toHaveCount(0);
    await expect(page.locator('[aria-invalid="true"], [data-invalid="true"]')).not.toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
