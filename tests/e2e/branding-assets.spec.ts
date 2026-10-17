import { expect, test, type Locator, type Page } from "@playwright/test";
import { AIRLINE_LOGOS } from "../../src/data/airline-branding";

const demoUrl = "/?mode=demo&origin=THR&destination=MHD&date=2026-10-16&adults=1";
const sourceForCode = new Map([
  ["IRA", "/airlines/iran-air.jpg"], ["IR", "/airlines/iran-air.jpg"],
  ["IZG", "/airlines/zagros.png"], ["ZV", "/airlines/zagros.png"],
  ["MRJ", "/airlines/meraj.png"], ["JI", "/airlines/meraj.png"],
  ["TBZ", "/airlines/ata.png"], ["I3", "/airlines/ata.png"],
  ["TBN", "/airlines/taban.png"], ["HH", "/airlines/taban.png"],
  ["A1", "/airlines/air1air.png"],
]);

async function loadedLocalLogo(image: Locator, source: string) {
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0 && element.naturalHeight > 0)).toBe(true);
  expect(await image.evaluate((element: HTMLImageElement) => {
    const url = new URL(element.currentSrc || element.src, window.location.href);
    return url.pathname === "/_next/image" ? url.searchParams.get("url") : url.pathname;
  })).toBe(source);
  await expect(image).toHaveCSS("object-fit", "contain");
}

async function checkResultIdentities(page: Page, seenLogos: Set<string>, seenFallbacks: Set<string>) {
  const identities = page.locator(".flight-card [data-airline-id]");
  expect(await identities.count()).toBeGreaterThan(0);
  for (const identity of await identities.all()) {
    const code = (await identity.getAttribute("data-airline-id"))!;
    const name = (await identity.locator(":scope > bdi").innerText()).trim();
    expect(name.length).toBeGreaterThan(0);
    const expectedSource = sourceForCode.get(code);
    if (expectedSource) {
      const image = identity.getByRole("img", { name: `نشان ${name}`, exact: true });
      await expect(identity.locator("img")).toHaveCount(1);
      await loadedLocalLogo(image, expectedSource);
      seenLogos.add(expectedSource);
    } else {
      // Missing permissions must preserve the correct visible name and honest generic icon.
      await expect(identity.locator("img")).toHaveCount(0);
      await expect(identity.getByRole("img", { name: `نماد عمومی شرکت هواپیمایی ${name}`, exact: true })).toBeVisible();
      seenFallbacks.add(code);
    }
  }
}

test("eligible demo and stored-reference results load the correct airline images and preserve unknown-brand fallbacks", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const seenLogos = new Set<string>();
  const seenFallbacks = new Set<string>();
  await page.goto(demoUrl);
  await expect(page.locator(".flight-card")).toHaveCount(16);
  await checkResultIdentities(page, seenLogos, seenFallbacks);
  for (const code of ["IRM", "IRC", "QSM", "Y9", "CPN", "VRH", "SHI"]) expect(seenFallbacks.has(code), code).toBe(true);

  for (const destination of ["MHD", "SYZ"]) {
    await page.goto(`/?mode=fixture&origin=THR&destination=${destination}&date=2026-10-15&adults=1`);
    const cards = page.locator(".flight-card");
    await expect(cards.first()).toBeVisible();
    await checkResultIdentities(page, seenLogos, seenFallbacks);
    for (const card of await cards.all()) {
      await expect(card.locator(".ticket-arrival .ticket-airport-code")).toHaveText(destination);
      await expect(card.locator(".ticket-price-region .price")).toHaveText("واحد مبلغ تأیید نشده");
      await expect(card.locator(".ticket-price-region .price-currency")).toHaveCount(0);
    }
    // Stored HH and A1 records have zero seats / unavailable status. Logo coverage must not promote them into inventory.
    await expect(page.locator('.flight-card [data-airline-id="HH"], .flight-card [data-airline-id="A1"]')).toHaveCount(0);
  }
  expect([...seenLogos].sort()).toEqual([
    "/airlines/ata.png", "/airlines/iran-air.jpg", "/airlines/meraj.png", "/airlines/zagros.png",
  ]);
  expect(errors).toEqual([]);
});

test("all six reviewed local assets decode without inventing unavailable flight cards", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator(".flight-card")).toHaveCount(0);
  expect(AIRLINE_LOGOS).toHaveLength(6);
  for (const logo of AIRLINE_LOGOS) {
    const response = await request.get(logo.src);
    expect(response.ok(), logo.src).toBe(true);
    expect(response.headers()["content-type"], logo.src).toMatch(/^image\/(?:png|jpeg)/u);
  }
  // Native browser image probes check original decoding/dimensions for Taban and Air1Air as well.
  // They are not mounted as app inventory, and no unavailable source record is altered.
  const decoded = await page.evaluate(async (assets) => Promise.all(assets.map(async (asset) => {
    const image = new Image();
    image.src = asset.src;
    await image.decode();
    return { src: asset.src, loaded: image.complete && image.naturalWidth > 0, width: image.naturalWidth, height: image.naturalHeight };
  })), AIRLINE_LOGOS.map(({ src }) => ({ src })));
  for (const [index, actual] of decoded.entries()) {
    const expected = AIRLINE_LOGOS[index];
    expect(actual).toEqual({ src: expected.src, loaded: true, width: expected.width, height: expected.height });
  }
  await expect(page.locator(".flight-card")).toHaveCount(0);
});

test("a failed airline image restores the generic icon and name without breaking other airline logos", async ({ page }) => {
  await page.route((url) => url.pathname === "/airlines/iran-air.jpg"
    || (url.pathname === "/_next/image" && url.searchParams.get("url") === "/airlines/iran-air.jpg"), (route) => route.abort("failed"));
  await page.goto(demoUrl);
  const identity = page.locator('.flight-card [data-airline-id="IRA"]').first();
  await identity.scrollIntoViewIfNeeded();
  await expect(identity.locator("img")).toHaveCount(0);
  await expect(identity.locator(":scope > bdi")).toHaveText("ایران‌ایر");
  await expect(identity.getByRole("img", { name: "نماد عمومی شرکت هواپیمایی ایران‌ایر", exact: true })).toBeVisible();
  const zagros = page.locator('.flight-card [data-airline-id="IZG"]').first();
  await loadedLocalLogo(zagros.getByRole("img", { name: "نشان زاگرس", exact: true }), "/airlines/zagros.png");
  await expect(page.locator(".flight-card")).toHaveCount(16);
});
