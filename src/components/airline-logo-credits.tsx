import { AIRLINE_LOGOS, airlineLogoFor } from "@/data/airline-branding";
import styles from "./airline-logo-credits.module.css";

/** Actual source/license attribution remains available in the About content. */
export function AirlineLogoCredits({ airlines }: {
  airlines?: readonly { airlineId?: string; name: string }[];
}) {
  const used = airlines ? new Set(airlines.map(({ airlineId, name }) => airlineLogoFor(airlineId, name)?.src)) : null;
  const logos = AIRLINE_LOGOS.filter((logo) => !used || used.has(logo.src));
  if (logos.length === 0) return null;
  return <section className={styles.credits} aria-label="اعتبار و مجوز نشان‌های هواپیمایی">
    <p>نشان‌ها بدون تغییر و فقط برای معرفی شرکت‌ها استفاده شده‌اند؛ این استفاده به معنی همکاری یا تأیید آن‌ها نیست.</p>
    <ul>{logos.map((logo) => <li key={logo.src}>
      <bdi>{logo.names[0]}</bdi> — <bdi>{logo.author}</bdi>؛ <a href={logo.sourceUrl} target="_blank" rel="noreferrer">Wikimedia Commons</a>؛ <a href={logo.licenseUrl} target="_blank" rel="noreferrer"><bdi>{logo.license}</bdi></a>.
    </li>)}</ul>
  </section>;
}
