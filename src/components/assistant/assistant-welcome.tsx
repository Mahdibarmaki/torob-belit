"use client";

import { ArrowDownUp, Clock3, Search, ShieldCheck } from "lucide-react";
import { AirlineIdentity } from "../airline-identity";
import { airlineLogoFor } from "@/data/airline-branding";
import { Icon } from "../ui";
import styles from "./assistant.module.css";

const featured = [{ airlineId: "IRA", name: "ایران‌ایر" }, { airlineId: "IZG", name: "زاگرس" }, { airlineId: "MRJ", name: "معراج" }, { airlineId: "TBZ", name: "آتا" }];
const examples = [
  { text: "ارزان‌ترین پرواز تهران به مشهد رو پیدا کن", icon: Search },
  { text: "برای آخر هفته یه پرواز با سابقه لغو کمتر می‌خوام", icon: ShieldCheck },
  { text: "برای دو نفر پرواز رفت‌وبرگشت به کیش پیشنهاد بده", icon: ArrowDownUp },
  { text: "یه پرواز صبح با بار بیشتر پیشنهاد بده", icon: Clock3 },
];

export function AssistantWelcome({ onPrompt, busy }: { onPrompt: (text: string) => void; busy: boolean }) {
  return <section className={styles.welcome} aria-label="شروع دستیار سفر">
    <div className={styles.airlines} aria-label="نشان ایرلاین‌ها؛ بدون همکاری تجاری">{featured.map((airline) => {
      const logo = airlineLogoFor(airline.airlineId, airline.name);
      const mark = <AirlineIdentity {...airline} size={36} className={styles.airline} />;
      // The real source link carries required authorship/license access without a separate UI block.
      return logo ? <a key={airline.airlineId} href={logo.sourceUrl} target="_blank" rel="noreferrer" className={styles.airlineLink} title={logo.attribution} aria-label={`${airline.name}؛ ${logo.attribution}`}>{mark}</a> : <span key={airline.airlineId}>{mark}</span>;
    })}</div>
    <div><h1>دستیار هوشمند سفر</h1><p className={styles.description}>مقصد، زمان سفر و اولویت‌هات رو بگو تا کمکت کنیم مناسب‌ترین پرواز رو پیدا کنی.</p></div>
    <div className={styles.suggestions}><h2>از اینجا شروع کن</h2><div className={styles.suggestionGrid}>{examples.map(({ text, icon }) => <button key={text} type="button" className={styles.suggestion} disabled={busy} onClick={() => onPrompt(text)}><Icon icon={icon} size={18} /><span>{text}</span></button>)}</div></div>
  </section>;
}
