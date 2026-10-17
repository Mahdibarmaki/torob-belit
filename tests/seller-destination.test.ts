import { describe, expect, it } from "vitest";
import { SELLER_DESTINATIONS } from "@/data/sellers";
import { resolveSellerDestination, type SellerDestinationOffer } from "@/domain/seller-destination";
import { loadDemoFlights } from "@/fixtures/demo";

const query = { origin: "THR", destination: "MHD", departureDate: "2026-10-20", adults: 1, currency: "IRR" as const };
const demoSource = { mode: "demo" as const, id: "authored-demo", label: "اطلاعات آزمایشی" };
function offer(sellerId: string, overrides: Partial<SellerDestinationOffer> = {}): SellerDestinationOffer {
  return { sellerId, bookingUrl: null, source: demoSource, ...overrides };
}

describe("reviewed external seller referral destinations", () => {
  it("maps every existing demo seller to its own reviewed public flight search", () => {
    const destinations = loadDemoFlights(query)[0].offers.map(resolveSellerDestination);
    expect(destinations).toEqual([
      { url: "https://www.alibaba.ir/", type: "flight-search", sellerName: "علی‌بابا" },
      { url: "https://www.flytoday.ir/flight", type: "flight-search", sellerName: "فلای‌تودی" },
      { url: "https://mrbilit.com/plane-ticket", type: "flight-search", sellerName: "مستربلیط" },
    ]);
  });

  it("does not modify the selected offer or invent query parameters from its flight", () => {
    const selected = loadDemoFlights(query)[0].offers[0];
    const original = structuredClone(selected);
    expect(resolveSellerDestination(selected)?.url).toBe("https://www.alibaba.ir/");
    expect(selected).toEqual(original);
    expect(new URL(resolveSellerDestination(selected)!.url).search).toBe("");
  });

  it("recognizes canonical seller identifiers without relying on mutable seller labels", () => {
    for (const seller of SELLER_DESTINATIONS) {
      expect(resolveSellerDestination(offer(seller.sellerId))).toEqual({
        url: seller.flightSearchUrl, type: "flight-search", sellerName: seller.sellerName,
      });
    }
  });

  it.each(["unknown", "safarmarket", "snapptrip", "alibaba-reference:seller-unverified", "ALIBABA", "demo-seller-3", "__proto__"])(
    "leaves the unregistered or unverified seller %s unavailable", (sellerId) => {
      expect(resolveSellerDestination(offer(sellerId))).toBeNull();
    },
  );

  it("does not turn a provider-branded reference source into a verified seller", () => {
    expect(resolveSellerDestination(offer("saved-alibaba:seller-unverified", {
      source: { ...demoSource, id: "saved-alibaba" }, bookingUrl: "https://www.alibaba.ir/",
    }))).toBeNull();
  });

  it("keeps an unavailable source unavailable", () => {
    expect(resolveSellerDestination(offer("alibaba", {
      source: { mode: "unavailable", id: "alibaba", label: "unavailable" },
    }))).toBeNull();
  });

  it("ignores fixture-supplied booking URLs even when they appear seller-specific", () => {
    for (const bookingUrl of ["https://www.alibaba.ir/fake-flight", "https://evil.invalid/", "javascript:alert(1)"]) {
      expect(resolveSellerDestination(offer("demo-seller-0", { bookingUrl }))).toEqual({
        url: "https://www.alibaba.ir/", type: "flight-search", sellerName: "علی‌بابا",
      });
    }
  });

  it.each([
    "https://evil.invalid/booking",
    "https://www.alibaba.ir.evil.invalid/booking",
    "https://evil.alibaba.ir/booking",
    "https://www.alibaba.ir@evil.invalid/booking",
    "https://name:secret@www.alibaba.ir/booking",
    "http://www.alibaba.ir/booking",
    "javascript:alert(1)",
    "//www.alibaba.ir/booking",
    "https://www.alibaba.ir:8443/booking",
    "https://www.alibaba.ir/booking?nationalId=0123456789",
    "https://www.alibaba.ir/booking?redirect=https%3A%2F%2Fevil.invalid",
    "https://www.alibaba.ir/booking#passport=example",
    "https://www.alibaba.ir/booking/name@example.invalid",
    "https://www.alibaba.ir/undocumented-booking",
    " https://www.alibaba.ir/booking",
    "https://www.alibaba.ir/booking\n",
  ])("never forwards an unapproved live payload destination: %s", (bookingUrl) => {
    // No booking path has an authorized contract today. Only the distinct,
    // explicitly labeled public search landing may be offered as continuation.
    expect(resolveSellerDestination(offer("alibaba", {
      bookingUrl, source: { mode: "live", id: "alibaba", label: "Alibaba" },
    }))).toEqual({ url: "https://www.alibaba.ir/", type: "flight-search", sellerName: "علی‌بابا" });
  });

  it("does not approve a live booking just because it uses a known provider source and host", () => {
    expect(SELLER_DESTINATIONS.every((seller) => seller.approvedBookingDestinations.length === 0)).toBe(true);
    for (const seller of SELLER_DESTINATIONS) {
      expect(resolveSellerDestination(offer(seller.sellerId, {
        source: { mode: "live", id: seller.sellerId, label: seller.sellerName }, bookingUrl: seller.flightSearchUrl,
      }))?.type).toBe("flight-search");
    }
  });

  it("keeps the reviewed registry HTTPS-only, query-free and scoped to exact approved hosts", () => {
    for (const seller of SELLER_DESTINATIONS) {
      const url = new URL(seller.flightSearchUrl);
      expect(url.protocol).toBe("https:");
      expect(seller.approvedHosts).toContain(url.hostname);
      expect([url.username, url.password, url.port, url.search, url.hash]).toEqual(["", "", "", "", ""]);
      expect(seller.reviewedOn).toBe("2026-10-17");
      expect(seller.evidenceUrls.length).toBeGreaterThan(0);
    }
  });
});
