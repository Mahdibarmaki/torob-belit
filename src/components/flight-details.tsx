"use client";

import { useId, type RefObject } from "react";
import { ExternalLink, GitCompareArrows, Ticket, Trash2 } from "lucide-react";
import type { DisplayFlightResult, DisplaySellerOffer } from "@/application/reference-search";
import { resolveSellerDestination } from "@/domain/seller-destination";
import { OfferAttribution } from "./offer-attribution";
import { OfferPrice } from "./offer-price";
import { SellerOfferMetadata } from "./seller-offer-metadata";
import { Badge, Button, Dialog, Icon } from "./ui";
import styles from "./flight-card.module.css";

const numbers = new Intl.NumberFormat("fa-IR");

export interface FlightDetailsProps {
  result: DisplayFlightResult;
  open: boolean;
  onClose: () => void;
  selectedForComparison: boolean;
  comparisonOfferId?: string;
  comparisonDisabled?: boolean;
  onCompare: (offerId: string) => void;
  /** Optional round-trip planning only; purchases always use the independent seller link. */
  onSelectJourney?: (offer: DisplaySellerOffer) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/** Search, AI and comparison share the same offer details and validated seller destinations. */
export function FlightDetails({ result, open, onClose, selectedForComparison, comparisonOfferId, comparisonDisabled = false, onCompare, onSelectJourney, returnFocusRef }: FlightDetailsProps) {
  const noteId = useId();
  const authoredDemo = result.eligibleOffers.some((offer) => offer.source.mode === "demo" && !("priceEvidence" in offer));
  return <Dialog open={open} onClose={onClose} title="جزئیات پرواز" className="flight-detail-modal" returnFocusRef={returnFocusRef}>
    <div className="stack flight-detail-content">
      <section className="stack" aria-label="پیشنهادهای فروشندگان">
        <h3 className="row"><Icon icon={Ticket} size={18} />پیشنهادهای فروشندگان ({numbers.format(result.eligibleOffers.length)})</h3>
        {authoredDemo && <p className="small-text muted">پیشنهادهای این بخش آزمایشی‌اند؛ نام فروشندگان به معنی همکاری یا اتصال رزرو نیست.</p>}
        {result.eligibleOffers.map((offer, index) => {
          const destination = resolveSellerDestination(offer);
          const descriptionId = `${noteId}-${index}`;
          const canSelect = !!onSelectJourney && !("priceEvidence" in offer) && offer.totalPrice !== null
            && offer.priceComplete && offer.availability === "available" && offer.ticketing === "single-ticket";
          return <section className="seller-offer stack" key={offer.id} aria-label={`پیشنهاد ${offer.sellerName}`}>
            <div className={`${styles.sellerHeader} seller-offer-header`}>
              <h3>{offer.sellerName}</h3>
              <OfferPrice price={offer.totalPrice} className="offer-price" />
              <p className={styles.sellerPriceNote}>مجموع {numbers.format(offer.adults)} بزرگسال{offer.totalPrice === null ? " · بدون قیمت تأییدشده" : ""}</p>
            </div>
            <SellerOfferMetadata offer={offer} />
            <p className="small-text muted">{offer.availability === "available" ? "قابل انتخاب در این مجموعه" : offer.availability === "unavailable" ? "غیرقابل انتخاب" : "ظرفیت نامشخص"}</p>
            <OfferAttribution offer={offer} />
            <div className="seller-offer-actions row spread">
              <div>{offer.id === result.selectedOffer.id && <Badge>پیشنهاد مبنای این کارت</Badge>}</div>
              <div className="row">
                <Button variant="text" className="text-action" aria-pressed={selectedForComparison && comparisonOfferId === offer.id} disabled={comparisonDisabled && !selectedForComparison} onClick={() => onCompare(offer.id)}>
                  <Icon icon={selectedForComparison && comparisonOfferId === offer.id ? Trash2 : GitCompareArrows} size={16} />{selectedForComparison && comparisonOfferId === offer.id ? "حذف از مقایسه" : "مقایسه با این پیشنهاد"}
                </Button>
                {onSelectJourney && <Button variant="text" disabled={!canSelect} onClick={() => { if (canSelect) { onClose(); onSelectJourney(offer); } }}>انتخاب برای سفر</Button>}
                {destination ? <a className="button button-coral" href={destination.url} target="_blank" rel="noopener noreferrer" aria-describedby={descriptionId}>
                  <Icon icon={Ticket} size={16} />خرید بلیط<Icon icon={ExternalLink} size={14} />
                </a> : <Button variant="coral" disabled aria-describedby={descriptionId}><Icon icon={Ticket} size={16} />خرید بلیط</Button>}
              </div>
            </div>
            <p id={descriptionId} className="small-text muted">{!destination ? "پیوند معتبر فروشنده در دسترس نیست." : destination.type === "flight-search"
              ? `ادامه در جست‌وجوی ${destination.sellerName} در برگه جدید؛ نمایش این پرواز و قیمت در سایت فروشنده تضمین نمی‌شود.`
              : "خرید در وب‌سایت فروشنده و در برگه جدید انجام می‌شود؛ قیمت و موجودی نهایی را آنجا بررسی کنید."}</p>
            {"priceEvidence" in offer && <p className="small-text muted">واحد مبلغ پاسخ مرجع تأیید نشده است.</p>}
          </section>;
        })}
      </section>
    </div>
  </Dialog>;
}
