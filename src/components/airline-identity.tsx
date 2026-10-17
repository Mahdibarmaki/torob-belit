"use client";

import Image from "next/image";
import { useState } from "react";
import { Plane } from "lucide-react";
import { airlineLogoFor } from "@/data/airline-branding";
import { Icon } from "./ui";
import styles from "./airline-identity.module.css";

/** Names always remain visible; an unknown, inconsistent or failed image gets a generic glyph. */
export function AirlineIdentity({ airlineId, name, size = 32, className }: {
  airlineId?: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const logo = airlineLogoFor(airlineId, name);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const dimension = Number.isFinite(size) ? Math.min(80, Math.max(16, size)) : 32;
  return <span className={`${styles.identity}${className ? ` ${className}` : ""}`} data-airline-id={airlineId}>
    <span className={styles.mark} style={{ width: dimension, height: dimension }}>
      {logo && failedSource !== logo.src ? <Image
        src={logo.src}
        width={logo.width}
        height={logo.height}
        sizes={`${dimension}px`}
        alt={`نشان ${name}`}
        title={`${logo.attribution} Source: ${logo.sourceUrl} License: ${logo.licenseUrl}`}
        className={styles.logo}
        onError={() => setFailedSource(logo.src)}
      /> : <span role="img" aria-label={`نماد عمومی شرکت هواپیمایی ${name}`}><Icon icon={Plane} size={Math.min(24, dimension)} /></span>}
    </span>
    <bdi className={styles.name}>{name}</bdi>
  </span>;
}
