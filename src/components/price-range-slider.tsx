"use client";

import { useId } from "react";
import { formatToman } from "@/domain/money";
import { movePriceHandle, type PriceRange } from "@/domain/price-range";
import styles from "./filter-panel.module.css";

function price(amountRials: number) {
  return formatToman({ currency: "IRR", unit: "rial", amountRials });
}

/** Presentation only: keep the shared formatter's complete value and move its unit above the pill. */
function PriceLabel({ prefix, amountRials }: { prefix: "از" | "تا"; amountRials: number }) {
  const formatted = price(amountRials);
  const suffix = " تومان";
  return <span>
    <span className={styles.priceLabelHeading}><span>{prefix}</span><span>تومان</span></span>
    <output aria-label={`${prefix} ${formatted}`}><bdi dir="ltr">{formatted.slice(0, -suffix.length)}</bdi></output>
  </span>;
}

/** Two native sliders retain touch and platform keyboard behavior, including RTL direction. */
export function PriceRangeSlider({ bounds, value, onChange }: { bounds: PriceRange | null; value: PriceRange | null; onChange: (range: PriceRange) => void }) {
  const id = useId();
  if (!bounds || !value) return <p className={styles.priceUnavailable}>قیمت قابل مقایسه‌ای موجود نیست.</p>;
  const disabled = bounds.min === bounds.max;
  const span = bounds.max - bounds.min;
  const start = span === 0 ? 0 : (value.min - bounds.min) / span * 100;
  const width = span === 0 ? 100 : (value.max - value.min) / span * 100;
  return <div className={styles.priceRange} role="group" aria-label="بازه قیمت کل همه مسافران" aria-describedby={`${id}-help`}>
    <div className={styles.slider} data-disabled={disabled || undefined}>
      <div className={styles.sliderTrack} aria-hidden="true"><span className={styles.sliderSelected} style={{ insetInlineStart: `${start}%`, inlineSize: `${width}%` }} /></div>
      <input className={`${styles.sliderInput} ${styles.sliderMinimum}`} data-front={value.min === bounds.max || undefined} type="range" dir="rtl" aria-label="حداقل قیمت کل (تومان)" aria-valuetext={price(value.min)} aria-valuemin={bounds.min} aria-valuemax={value.max} min={bounds.min} max={bounds.max} step={1} value={value.min} disabled={disabled} onChange={(event) => onChange(movePriceHandle(value, bounds, "min", Number(event.target.value)))} />
      <input className={`${styles.sliderInput} ${styles.sliderMaximum}`} type="range" dir="rtl" aria-label="حداکثر قیمت کل (تومان)" aria-valuetext={price(value.max)} aria-valuemin={value.min} aria-valuemax={bounds.max} min={bounds.min} max={bounds.max} step={1} value={value.max} disabled={disabled} onChange={(event) => onChange(movePriceHandle(value, bounds, "max", Number(event.target.value)))} />
    </div>
    <div className={styles.priceLabels}><PriceLabel prefix="از" amountRials={value.min} /><PriceLabel prefix="تا" amountRials={value.max} /></div>
    <p id={`${id}-help`}>{disabled ? "همه پیشنهادها قیمت صفر دارند." : "مبلغ کل همه مسافران، به تومان"}</p>
  </div>;
}
