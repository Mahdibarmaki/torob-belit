import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Icon } from "./ui";
import styles from "./metadata-badge.module.css";

/** Short informational facts only; risk and issuance statuses retain separate semantics. */
export function MetadataBadge({ icon, children, className = "" }: { icon?: LucideIcon; children: ReactNode; className?: string }) {
  return <span className={`${styles.badge} ${className}`.trim()} data-metadata-badge="">
    {icon && <Icon icon={icon} size={14} />}<span className={styles.value}>{children}</span>
  </span>;
}

export function BadgeGroup({ children, label, className = "" }: { children: ReactNode; label?: string; className?: string }) {
  return <div className={`${styles.group} ${className}`.trim()} role={label ? "group" : undefined} aria-label={label}>{children}</div>;
}
