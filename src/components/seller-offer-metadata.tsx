import { Armchair, BaggageClaim, CalendarClock, CircleCheck, CircleHelp, Luggage, Ticket, Undo2, type LucideIcon } from "lucide-react";
import type { DisplaySellerOffer } from "@/application/reference-search";
import { presentationCopy } from "@/lib/presentation-copy";
import { Icon } from "./ui";
import { BadgeGroup, MetadataBadge } from "./metadata-badge";
import styles from "./seller-offer-metadata.module.css";

const numbers = new Intl.NumberFormat("fa-IR");

interface MetadataItem {
  icon: LucideIcon;
  label: string;
}

type MetadataPresentation = "inline" | "badges";

function MetadataRow({ items, label, presentation }: { items: MetadataItem[]; label: string; presentation: MetadataPresentation }) {
  if (items.length === 0) return null;
  if (presentation === "badges") return <div className={styles.badgeRow}>
    {items.some((item) => item.label.length <= 90) && <BadgeGroup label={label}>{items.filter((item) => item.label.length <= 90).map((item, index) => <MetadataBadge key={`${index}-${item.label}`} icon={item.icon}>{item.label}</MetadataBadge>)}</BadgeGroup>}
    {items.filter((item) => item.label.length > 90).map((item, index) => <p className={styles.description} key={`${index}-${item.label}`}><Icon icon={item.icon} size={16} /><span>{item.label}</span></p>)}
  </div>;
  return <ul className={styles.row} aria-label={label}>{items.map((item, index) => <li className={styles.item} key={`${index}-${item.label}`}>
    <Icon icon={item.icon} size={16} /><span>{item.label}</span>
  </li>)}</ul>;
}

function checkedBaggage(kg: number | null): string {
  return kg === null ? "بار تحویلی نامشخص" : kg === 0 ? "بدون بار تحویلی" : `${numbers.format(kg)} کیلو بار تحویلی`;
}

function cabinBaggage(kg: number): string {
  return kg === 0 ? "بدون بار کابین" : `${numbers.format(kg)} کیلو بار کابین`;
}

/** Purchase metadata always comes from this seller's own fare and per-leg allowances. */
export function SellerOfferMetadata({ offer, presentation = "inline", includeFare = true }: { offer: DisplaySellerOffer; presentation?: MetadataPresentation; includeFare?: boolean }) {
  const copy = (value: string) => offer.source.mode === "demo" ? presentationCopy(value) : value;
  const fare: MetadataItem = { icon: Armchair, label: copy(offer.fareName) };
  const refund = offer.fareConditions?.refunds?.trim();
  const changes = offer.fareConditions?.changes?.trim();
  const terms: MetadataItem[] = [];
  if (refund) terms.push({ icon: Undo2, label: copy(refund) });
  else if (offer.refundability !== "unknown") terms.push({ icon: Undo2, label: offer.refundability === "refundable" ? "قابل استرداد طبق شرایط پیشنهاد" : "غیرقابل استرداد" });
  if (changes) terms.push({ icon: CalendarClock, label: copy(changes) });
  if (offer.ticketing !== "unknown") terms.push({ icon: Ticket, label: offer.ticketing === "single-ticket" ? "بلیت یکپارچه" : "انتقال مستقل بین بلیت‌ها" });
  const bags = offer.baggage.map((bag) => [
    { icon: BaggageClaim, label: checkedBaggage(bag.checkedKg) },
    ...(bag.carryOnKg === null ? [] : [{ icon: Luggage, label: cabinBaggage(bag.carryOnKg) }]),
  ]);

  return <div className={styles.metadata}>
    {bags.length === 1 ? <MetadataRow presentation={presentation} items={[...(includeFare ? [fare] : []), ...bags[0]]} label={includeFare ? "کلاس و بار هر بزرگسال" : "بار هر بزرگسال"} /> : <>
      <MetadataRow presentation={presentation} items={includeFare ? [fare] : []} label="کلاس بلیط" />
      {bags.map((items, index) => <div className={styles.leg} key={offer.baggage[index].segmentId}>
        <span className={styles.legLabel}>بخش {numbers.format(index + 1)}</span>
        <MetadataRow presentation={presentation} items={items} label={`بار هر بزرگسال در بخش ${numbers.format(index + 1)}`} />
      </div>)}
    </>}
    {bags.length === 0 ? <p className={styles.note}>میزان بار مشخص نیست.</p> : <p className={styles.note}>میزان بار برای هر بزرگسال در هر بخش پرواز است.</p>}
    <MetadataRow presentation={presentation} items={terms} label="شرایط بلیط و تغییرات" />
    <MetadataRow presentation={presentation} items={[{ icon: offer.priceComplete ? CircleCheck : CircleHelp, label: offer.priceComplete ? "شامل همه هزینه‌های الزامی" : "کامل بودن هزینه‌ها تأیید نشده" }]} label="وضعیت مبلغ کل" />
  </div>;
}
