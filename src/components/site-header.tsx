"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, House, Menu, UserRound } from "lucide-react";
import { Brand } from "./brand";
import { Button, Dialog, Icon } from "./ui";

/** Shared desktop and mobile navigation for flight discovery. */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const closeExpandedMenu = () => { if (wide.matches) setOpen(false); };
    wide.addEventListener("change", closeExpandedMenu);
    return () => wide.removeEventListener("change", closeExpandedMenu);
  }, []);
  const homeActive = pathname === "/" || pathname === "/results";

  function navigation(mobile = false) {
    return <nav className={mobile ? "stack menu-navigation product-navigation" : "header-navigation product-navigation"} aria-label={mobile ? "منوی صفحه" : "ناوبری اصلی"}>
      <Link href="/" aria-current={homeActive ? "page" : undefined} onClick={() => setOpen(false)}><Icon icon={House} size={18} />خانه</Link>
      <button type="button" disabled className="navigation-unavailable" title="سفر قسطی در این محصول فعال نیست" aria-label="سفر قسطی؛ غیرفعال"><Icon icon={CreditCard} size={18} /><span>سفر قسطی</span></button>
    </nav>;
  }

  return <>
    <header className="site-header"><div className="page-container header-inner">
      <div className="header-brand-navigation"><Link href="/" aria-label="ترب بلیط، صفحه اصلی"><Brand priority /></Link>{navigation()}</div>
      <div className="header-utilities">
        <button type="button" className="header-login navigation-unavailable" disabled title="ورود و ثبت‌نام در این محصول فعال نیست" aria-label="ورود / ثبت‌نام؛ غیرفعال"><Icon icon={UserRound} size={18} /><span>ورود / ثبت‌نام</span></button>
        <Button variant="circle" className="header-menu-toggle" aria-label="باز کردن منو" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Icon icon={Menu} size={18} /></Button>
      </div>
    </div></header>
    <Dialog open={open} onClose={() => setOpen(false)} title="ترب بلیط">{navigation(true)}<p className="small-text muted">جست‌وجو و مقایسه در ترب بلیط؛ خرید در وب‌سایت فروشنده انجام می‌شود.</p></Dialog>
  </>;
}
