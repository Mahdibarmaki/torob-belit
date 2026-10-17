import { SELLER_DESTINATIONS, type SellerDestinationDefinition } from "@/data/sellers";
import type { SellerOffer } from "./models";

export interface SellerDestination {
  url: string;
  /** A search landing never asserts a matching bookable flight or price. */
  type: "flight-search" | "booking";
  sellerName: string;
}

/** Structurally shared by priced and unpriced display offers. No UI/application dependency. */
export type SellerDestinationOffer = Pick<SellerOffer, "sellerId" | "bookingUrl" | "source">;

function approvedUrl(raw: string, seller: SellerDestinationDefinition): string | null {
  if (!raw || raw.length > 2048 || raw !== raw.trim() || /[\u0000-\u0020\u007f]/u.test(raw)) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash
      || !seller.approvedHosts.includes(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Resolve reviewed seller destinations without generating route/query parameters.
 * Fixture payload URLs are never trusted. Live deep links additionally require
 * exact source-specific approval; there are no approved booking links today.
 */
export function resolveSellerDestination(offer: SellerDestinationOffer): SellerDestination | null {
  if (offer.source.mode !== "demo" && offer.source.mode !== "live") return null;
  const seller = SELLER_DESTINATIONS.find((entry) => entry.offerSellerIds.includes(offer.sellerId));
  if (!seller) return null;

  if (offer.source.mode === "live" && offer.bookingUrl) {
    const url = approvedUrl(offer.bookingUrl, seller);
    const booking = url && seller.approvedBookingDestinations.find((entry) => entry.sourceId === offer.source.id && entry.url === url);
    if (booking) return { url, type: "booking", sellerName: seller.sellerName };
  }

  const url = approvedUrl(seller.flightSearchUrl, seller);
  return url ? { url, type: "flight-search", sellerName: seller.sellerName } : null;
}
