import type { Money } from "@/domain/models";
import { formatOfferPrice } from "@/domain/offer-display";

/** Split presentation only: the shared formatter retains all monetary conversion rules. */
export function OfferPrice({ price, className }: { price: Money | null; className?: string }) {
  const formatted = formatOfferPrice(price);
  const currencySuffix = " تومان";

  return <bdi dir="rtl" className={className}>
    {price === null ? formatted : <>
      <span className="price-amount">{formatted.slice(0, -currencySuffix.length)}</span>{" "}
      <span className="price-currency">تومان</span>
    </>}
  </bdi>;
}
