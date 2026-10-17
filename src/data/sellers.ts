/** Public referral destinations reviewed on 2026-10-17. Not inventory or partnership evidence. */
export interface SellerDestinationDefinition {
  sellerId: string;
  sellerName: string;
  /** Existing authored-demo identifiers remain unchanged. */
  offerSellerIds: readonly string[];
  officialWebsite: string;
  flightSearchUrl: string;
  /** Exact hosts only; registering a domain does not approve all its subdomains. */
  approvedHosts: readonly string[];
  /** Empty until an actual provider agreement and supplied destination are reviewed. */
  approvedBookingDestinations: readonly { sourceId: string; url: string }[];
  reviewedOn: string;
  evidenceUrls: readonly string[];
}

export const SELLER_DESTINATIONS: readonly SellerDestinationDefinition[] = [
  {
    sellerId: "alibaba",
    sellerName: "علی‌بابا",
    offerSellerIds: ["alibaba", "demo-seller-0"],
    officialWebsite: "https://www.alibaba.ir/",
    // Published as the flight-purchase entry by Alibaba; direct retrieval was unavailable.
    flightSearchUrl: "https://www.alibaba.ir/",
    approvedHosts: ["www.alibaba.ir", "alibaba.ir"],
    approvedBookingDestinations: [],
    reviewedOn: "2026-10-17",
    evidenceUrls: ["https://t.me/s/alibabatravels?before=2594"],
  },
  {
    sellerId: "flytoday",
    sellerName: "فلای‌تودی",
    offerSellerIds: ["flytoday", "demo-seller-1"],
    officialWebsite: "https://www.flytoday.ir/",
    flightSearchUrl: "https://www.flytoday.ir/flight",
    approvedHosts: ["www.flytoday.ir", "flytoday.ir"],
    approvedBookingDestinations: [],
    reviewedOn: "2026-10-17",
    evidenceUrls: ["https://www.flytoday.ir/flight"],
  },
  {
    sellerId: "mrbilit",
    sellerName: "مستربلیط",
    offerSellerIds: ["mrbilit", "demo-seller-2"],
    officialWebsite: "https://mrbilit.com/",
    flightSearchUrl: "https://mrbilit.com/plane-ticket",
    approvedHosts: ["mrbilit.com", "www.mrbilit.com"],
    approvedBookingDestinations: [],
    reviewedOn: "2026-10-17",
    evidenceUrls: ["https://mrbilit.com/", "https://mrbilit.com/plane-ticket"],
  },
];
