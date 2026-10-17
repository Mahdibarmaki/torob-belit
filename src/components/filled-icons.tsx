import type { ReactNode } from "react";
import {
  Armchair, BaggageClaim, Building2, CalendarClock, CalendarDays, CircleCheck, CircleHelp,
  Clock3, CreditCard, Download, Globe2, House, Info, LockKeyhole, Luggage, Mail, MapPin,
  Menu, MessageCircle, Plane, PlaneLanding, PlaneTakeoff, Search, Send, ShieldCheck,
  SlidersHorizontal, Sparkles, Store, Ticket, Trash2, UserRound, Users, type LucideIcon,
} from "lucide-react";

/*
 * Lucide provides stroke glyphs, not an alternate solid collection. These small
 * project-authored silhouettes retain the same semantic imports and 24px grid.
 * Holes use even-odd winding or explicit paths; never fill arbitrary open paths.
 * Chevrons, close, checks, arrows and unreviewed glyphs retain their clear strokes.
 */
const plane = "M11 2h2l1.3 7 7.2 4.5v2L14 13.7l-.5 5.1 2.5 1.8V22l-4-1-4 1v-1.4l2.5-1.8-.5-5.1-7.5 1.8v-2L9.7 9 11 2Z";
const calendar = "M5 2h2v3h10V2h2v3h1a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V2Zm-1 8v10h16V10H4Zm3 2h2v2H7v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-8 4h2v2H7v-2Zm4 0h2v2h-2v-2Z";

const silhouettes = new Map<LucideIcon, ReactNode>([
  [Sparkles, <g key="sparkles"><path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z" /><path d="m20 1 .9 2.1L23 4l-2.1.9L20 7l-.9-2.1L17 4l2.1-.9L20 1ZM4 2l.9 2.1L7 5l-2.1.9L4 8l-.9-2.1L1 5l2.1-.9L4 2Z" /></g>],
  [Plane, <path key="plane" d={plane} transform="rotate(45 12 12)" />],
  [PlaneTakeoff, <g key="takeoff"><path d={plane} transform="translate(2 0) scale(.82) rotate(55 12 12)" /><rect x="2" y="21" width="20" height="2" rx="1" /></g>],
  [PlaneLanding, <g key="landing"><path d={plane} transform="translate(2 0) scale(.82) rotate(125 12 12)" /><rect x="2" y="21" width="20" height="2" rx="1" /></g>],
  [House, <path key="house" fillRule="evenodd" d="m12 2 10 8v2h-2v10h-6v-7h-4v7H4V12H2v-2L12 2Z" />],
  [UserRound, <g key="user"><circle cx="12" cy="7" r="4" /><path d="M4 21v-3a8 8 0 0 1 16 0v3H4Z" /></g>],
  [Users, <g key="users"><circle cx="9" cy="7" r="3.5" /><circle cx="18" cy="8" r="2.5" /><path d="M2 21v-3a7 7 0 0 1 14 0v3H2Zm15 0v-3a8 8 0 0 0-1-4.1 5 5 0 0 1 7 4.6V21h-6Z" /></g>],
  [CreditCard, <path key="card" fillRule="evenodd" d="M4 3h16a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm-1 4v3h18V7H3Zm2 8v2h5v-2H5Z" />],
  [Menu, <g key="menu"><rect x="3" y="5" width="18" height="3" rx="1.5" /><rect x="3" y="10.5" width="18" height="3" rx="1.5" /><rect x="3" y="16" width="18" height="3" rx="1.5" /></g>],
  [CalendarDays, <path key="calendar" fillRule="evenodd" d={calendar} />],
  [CalendarClock, <g key="calendar-clock"><path fillRule="evenodd" d="M5 2h2v3h10V2h2v3h1a2 2 0 0 1 2 2v4h-2V10H4v10h7v2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V2Z" /><path fillRule="evenodd" d="M18 12a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm-.8 2v4.5l3 1.5.7-1.4-2.1-1.1V14h-1.6Z" /></g>],
  [Clock3, <path key="clock" fillRule="evenodd" d="M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22Zm-1 4v8h7v-2h-5V5h-2Z" />],
  [Info, <path key="info" fillRule="evenodd" d="M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22Zm-1 4v2h2V5h-2Zm0 5v8h2v-8h-2Z" />],
  [CircleHelp, <path key="help" fillRule="evenodd" d="M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22Zm-1 15v2h2v-2h-2Zm-3-7h2a2 2 0 1 1 3.2 1.6c-1.7 1.2-2.2 2-2.2 3.4h2c0-.7.3-1 1.4-1.8A4 4 0 1 0 8 9Z" />],
  [CircleCheck, <path key="circle-check" fillRule="evenodd" d="M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22Zm-1.5 15.4L18 8.9l-1.4-1.4-6.1 6.1-3.1-3.1L6 11.9l4.5 4.5Z" />],
  [Ticket, <path key="ticket" fillRule="evenodd" d="M2 4h20v6a2 2 0 0 0 0 4v6H2v-6a2 2 0 0 0 0-4V4Zm12 2v3h2V6h-2Zm0 5v2h2v-2h-2Zm0 4v3h2v-3h-2Z" />],
  [Trash2, <g key="trash"><path fillRule="evenodd" d="M4 7h16l-1 15H5L4 7Zm4 3v9h2v-9H8Zm6 0v9h2v-9h-2Z" /><path d="M8 2h8v2h5v2H3V4h5V2Z" /></g>],
  [Search, <path key="search" fillRule="evenodd" d="M10 1a9 9 0 1 1-5.6 16A9 9 0 0 1 10 1Zm0 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm7 11 6 6-2 2-6-6 2-2Z" />],
  [SlidersHorizontal, <g key="sliders"><rect x="2" y="5" width="20" height="2" rx="1" /><rect x="2" y="11" width="20" height="2" rx="1" /><rect x="2" y="17" width="20" height="2" rx="1" /><rect x="6" y="3" width="4" height="6" rx="1" /><rect x="15" y="9" width="4" height="6" rx="1" /><rect x="6" y="15" width="4" height="6" rx="1" /></g>],
  [Luggage, <g key="luggage"><path fillRule="evenodd" d="M8 1h8v4h3a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2h3V1Zm2 2v2h4V3h-4Zm-3 5v9h2V8H7Zm8 0v9h2V8h-2Z" /><circle cx="6" cy="22" r="1" /><circle cx="18" cy="22" r="1" /></g>],
  [BaggageClaim, <g key="baggage"><path fillRule="evenodd" d="M8 2h8v4h3a2 2 0 0 1 2 2v9H3V8a2 2 0 0 1 2-2h3V2Zm2 2v2h4V4h-4Zm-3 5v5h2V9H7Zm8 0v5h2V9h-2Z" /><path d="M1 19h22v2H1z" /><circle cx="5" cy="23" r="1" /><circle cx="19" cy="23" r="1" /></g>],
  [Armchair, <path key="seat" fillRule="evenodd" d="M6 3h12v8h3v9h-2v2h-2v-2H7v2H5v-2H3v-9h3V3Zm0 11v3h12v-3H6Z" />],
  [Download, <path key="download" d="M10 2h4v9h5l-7 7-7-7h5V2ZM2 17h3v3h14v-3h3v6H2v-6Z" />],
  [LockKeyhole, <path key="lock" fillRule="evenodd" d="M5 10V7a7 7 0 0 1 14 0v3h2v13H3V10h2Zm3 0h8V7a4 4 0 0 0-8 0v3Zm4 3a2 2 0 0 0-1 3.7V20h2v-3.3a2 2 0 0 0-1-3.7Z" />],
  [ShieldCheck, <path key="shield" fillRule="evenodd" d="m12 1 9 4v7c0 6-4 9-9 12-5-3-9-6-9-12V5l9-4Zm-1.5 14.4L17 8.9l-1.4-1.4-5.1 5.1-2.1-2.1L7 11.9l3.5 3.5Z" />],
  [Mail, <path key="mail" fillRule="evenodd" d="M2 3h20v18H2V3Zm2 2v2l8 6 8-6V5l-8 6-8-6Z" />],
  [MessageCircle, <path key="message" d="M12 2a10 10 0 1 1-5 18.7L1 23l2.3-6A10 10 0 0 1 12 2Z" />],
  [Send, <path key="send" fillRule="evenodd" d="M23 1 16 23l-6-9-9-6L23 1ZM6 8.5l5.3 3.5L19 4.5 6 8.5Z" />],
  [MapPin, <path key="pin" fillRule="evenodd" d="M12 1a8 8 0 0 1 8 8c0 5-8 14-8 14S4 14 4 9a8 8 0 0 1 8-8Zm0 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />],
  [Store, <path key="store" fillRule="evenodd" d="M4 2h16l3 7v2a3 3 0 0 1-2 2.8V23H3v-9.2A3 3 0 0 1 1 11V9l3-7Zm3 12v6h5v-6H7Zm8 1v5h3v-5h-3Z" />],
  [Building2, <path key="building" fillRule="evenodd" d="M3 1h14v7h4v15H3V1Zm3 3v3h3V4H6Zm6 0v3h2V4h-2Zm-6 6v3h3v-3H6Zm6 0v3h2v-3h-2Zm-6 6v4h3v-4H6Zm6 0v4h2v-4h-2Zm5-5v3h2v-3h-2Zm0 6v3h2v-3h-2Z" />],
  [Globe2, <path key="globe" fillRule="evenodd" d="M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22ZM5 6a9 9 0 0 0-1.5 4h4a18 18 0 0 1 1-5L5 6Zm4.5 4h5a18 18 0 0 0-1-5h-3a18 18 0 0 0-1 5Zm7 0h4A9 9 0 0 0 19 6l-3.5-1a18 18 0 0 1 1 5Zm-13 4A9 9 0 0 0 5 18l3.5 1a18 18 0 0 1-1-5h-4Zm6 0a18 18 0 0 0 1 5h3a18 18 0 0 0 1-5h-5Zm7 0a18 18 0 0 1-1 5l3.5-1a9 9 0 0 0 1.5-4h-4Z" />],
]);

export function filledIconFor(icon: LucideIcon): ReactNode | null {
  return silhouettes.get(icon) ?? null;
}

export function FilledIcon({ icon, size = 20, className }: { icon: LucideIcon; size?: number; className?: string }) {
  const shape = filledIconFor(icon);
  if (!shape) return null;
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}
    fill="currentColor" stroke="none" aria-hidden="true" focusable="false"
    className={`lucide ${className ?? ""}`} data-icon-style="solid" data-icon-name={icon.displayName ?? "Icon"}>{shape}</svg>;
}
