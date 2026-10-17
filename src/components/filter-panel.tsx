"use client";

import { Clock3, PlaneTakeoff, ShieldCheck, SlidersHorizontal, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { SearchFilters } from "@/application/search-service";
import type { HistoricalRiskCategory } from "@/domain/models";
import { priceRangeFilters, type PriceRange } from "@/domain/price-range";
import { Button, Icon, Select } from "./ui";
import { PriceRangeSlider } from "./price-range-slider";
import styles from "./filter-panel.module.css";

const riskLabels: Record<HistoricalRiskCategory, string> = { low: "کم", medium: "متوسط", high: "زیاد", unknown: "داده ناکافی" };

function FilterSection({ title, icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return <section className={styles.section} aria-label={title}><h3 className={styles.sectionTitle}><Icon icon={icon} size={16} />{title}</h3><div className={styles.controls}>{children}</div></section>;
}

export function countActiveFilters(filters: SearchFilters) {
  return Object.values(filters).filter((value) => value !== undefined && value !== false && value !== "all" && (!Array.isArray(value) || value.length > 0)).length;
}

export function FilterPanel({ draft, onChange, onApply, onClear, canClear, busy, bounds, airlines }: {
  draft: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onApply: () => void;
  onClear: () => void;
  canClear: boolean;
  busy: boolean;
  bounds: PriceRange | null;
  airlines: readonly (readonly [string, string])[];
}) {
  const range = bounds ? { min: Math.max(bounds.min, Math.min(bounds.max, draft.minPriceRials ?? bounds.min)), max: Math.min(bounds.max, Math.max(bounds.min, draft.maxPriceRials ?? bounds.max)) } : null;
  return <div className={styles.panelContents}>
    <div id="filter-groups" className={styles.groups}>
      <FilterSection title="مسیر و بار" icon={PlaneTakeoff}>
        <label><input type="checkbox" checked={Boolean(draft.nonstopOnly)} onChange={(event) => onChange({ ...draft, nonstopOnly: event.target.checked || undefined })} />فقط بدون توقف</label>
        <label><input type="checkbox" aria-label="حداقل یک بار تحویلی برای هر مسافر" checked={Boolean(draft.checkedBagOnly)} onChange={(event) => onChange({ ...draft, checkedBagOnly: event.target.checked || undefined })} />بار تحویلی همراه بلیط</label>
      </FilterSection>
      <FilterSection title="بازه قیمت" icon={SlidersHorizontal}>
        <PriceRangeSlider bounds={bounds} value={range} onChange={(next) => {
          if (!bounds) return;
          onChange({ ...draft, minPriceRials: undefined, maxPriceRials: undefined, ...priceRangeFilters(next, bounds) });
        }} />
      </FilterSection>
      <FilterSection title="زمان حرکت" icon={Clock3}>
        <Select aria-label="بازه زمان حرکت" value={draft.departurePeriod ?? "all"} onChange={(event) => onChange({ ...draft, departurePeriod: event.target.value === "all" ? undefined : event.target.value as SearchFilters["departurePeriod"] })}><option value="all">تمام روز</option><option value="morning">صبح · ۶ تا ۱۲</option><option value="afternoon">بعدازظهر · ۱۲ تا ۱۸</option><option value="evening">شب · ۱۸ تا ۶</option></Select>
      </FilterSection>
      <FilterSection title="شرکت هواپیمایی" icon={PlaneTakeoff}>
        <Select aria-label="شرکت هواپیمایی" value={draft.airlineIds?.[0] ?? "all"} onChange={(event) => onChange({ ...draft, airlineIds: event.target.value === "all" ? undefined : [event.target.value] })}><option value="all">همه شرکت‌ها</option>{airlines.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select>
      </FilterSection>
      <FilterSection title="سابقه لغو در ۳۰ روز" icon={ShieldCheck}>
        <label><input type="radio" name="history-risk" checked={!draft.riskCategories?.length} onChange={() => onChange({ ...draft, riskCategories: undefined })} />همه سطوح</label>
        {(Object.keys(riskLabels) as HistoricalRiskCategory[]).map((category) => <label key={category}><input type="radio" name="history-risk" checked={draft.riskCategories?.[0] === category} onChange={() => onChange({ ...draft, riskCategories: [category] })} /><span className={`risk-dot risk-text-${category}`} />{riskLabels[category]}{category === "low" ? " (کمتر از ۱۰٪)" : category === "medium" ? " (۱۰ تا کمتر از ۲۵٪)" : category === "high" ? " (۲۵٪ و بیشتر)" : ""}</label>)}
        <p>نرخ گذشته؛ پیش‌بینی لغو نیست.</p>
      </FilterSection>
    </div>
    <div className={styles.actions}>
      <Button variant="coral" onClick={onApply} disabled={busy} aria-label="اعمال فیلترها">{busy ? "در حال اعمال…" : "اعمال فیلترها"}</Button>
      <Button variant="outline" className={styles.clearButton} onClick={onClear} disabled={!canClear || busy}>پاک کردن</Button>
    </div>
  </div>;
}
