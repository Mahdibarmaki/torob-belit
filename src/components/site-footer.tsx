"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpLeft, Globe2, Headphones, Mail, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Brand } from "./brand";
import { AirlineLogoCredits } from "./airline-logo-credits";
import { InstagramIcon } from "./instagram-icon";
import { Button, Dialog, Icon, Input } from "./ui";

type FooterTopic = "travel" | "buying" | "faq" | "terms" | "privacy" | "about" | "contact" | "partners" | "social" | "image";
export type FooterNavigation = "discover" | "results" | "method";

const information: Record<FooterTopic, { title: string; body: string[] }> = {
  travel: {
    title: "راهنمای سفر",
    body: ["برای انتخاب پرواز، زمان حرکت، فرودگاه، مدت مسیر و تعداد توقف‌ها را کنار قیمت بررسی کنید.", "بار مجاز و شرایط استرداد هر فروشنده را در جزئیات همان پیشنهاد بخوانید. سابقه لغو به گذشته مربوط است و تضمین پرواز آینده نیست."],
  },
  buying: {
    title: "راهنمای خرید",
    body: ["مبدأ، مقصد، تاریخ شمسی و تعداد مسافران را انتخاب کنید. با فیلترها نتایج را محدود کنید و دو یا سه پرواز را مقایسه کنید.", "کارت پرواز را باز کنید و پیشنهاد فروشنده را بررسی کنید. «خرید بلیط» وب‌سایت همان فروشنده را در زبانه‌ای تازه باز می‌کند؛ پرداخت و صدور بلیط در ترب بلیط انجام نمی‌شود.", "در حالت آزمایشی، پیوند فروشنده ادامهٔ جست‌وجو است و موجودی یا قیمت نمایش‌داده‌شده را تضمین نمی‌کند."],
  },
  faq: {
    title: "سؤالات متداول",
    body: ["خرید کجا انجام می‌شود؟ پس از مقایسه، از پیوند تأییدشده به وب‌سایت فروشنده می‌روید. ترب بلیط پرداخت، رزرو یا صدور بلیط انجام نمی‌دهد.", "قیمت‌ها از کجا می‌آیند؟ پروازها، قیمت‌ها و سوابق در حالت پیش‌فرض برای آزمایش محصول ساخته شده‌اند. نام فروشندگان به معنی همکاری، اتصال یا موجودی واقعی نیست؛ قیمت نهایی و موجودی را در وب‌سایت فروشنده بررسی کنید.", "درصد لغو چه معنایی دارد؟ نسبت لغوها به عملیات شناخته‌شده در بازه گذشته است؛ احتمال پیش‌بینی‌شده لغو پرواز آینده نیست."],
  },
  terms: {
    title: "قوانین و مقررات",
    body: ["ترب بلیط یک پروژه مستقل برای جست‌وجو، مقایسه و معرفی فروشندگان پرواز است و نماینده شرکت هواپیمایی، آژانس یا فروشنده بلیط نیست. خرید، پرداخت و صدور بلیط بر عهدهٔ وب‌سایت فروشنده است.", "داده‌های نمایشی برای تصمیم خرید یا برنامه‌ریزی واقعی سفر مناسب نیستند. نام‌های واقعی ایرلاین و مدل هواپیما به معنی واقعی بودن پرواز نمونه نیست. پیوند فروشنده تضمین موجودی یا قیمت پیشنهاد نیست."],
  },
  privacy: {
    title: "حریم خصوصی",
    body: ["جست‌وجوی پرواز به حساب یا اطلاعات هویتی نیاز ندارد. مسیر و تاریخ در نشانی صفحه و درخواست همان جست‌وجو استفاده می‌شوند.", "ترب بلیط فرم هویت مسافر یا اطلاعات پرداخت ندارد و بلیطی در مرورگر ایجاد یا مدیریت نمی‌کند. ترجیحات معتبر دستیار در همین زبانه نگهداری می‌شوند؛ متن گفتگو و اطلاعات هویتی در این ذخیره‌سازی ثبت نمی‌شوند. خرید در وب‌سایت فروشنده و طبق سیاست حریم خصوصی همان وب‌سایت انجام می‌شود.", "فرم خبرنامه فقط یک تعامل محلی نمایشی است؛ نشانی ایمیل را ذخیره نمی‌کند و هیچ پیام یا درخواستی به سرویس خبرنامه نمی‌فرستد."],
  },
  about: {
    title: "درباره ترب بلیط",
    body: ["پرواز مناسب فقط ارزان‌ترین گزینه نیست. ترب بلیط قیمت، زمان، بار، شرایط فروشنده و سابقه لغو را کنار هم قرار می‌دهد تا مقایسه روشن‌تر شود.", "این نسخه، پروژه مصاحبه و نمونه مستقل محصول است. ارتباط تجاری یا تأیید رسمی از سوی برندهای هم‌نام، ایرلاین‌ها یا فروشندگان ادعا نمی‌شود."],
  },
  contact: {
    title: "تماس با ما",
    body: ["پشتیبانی فروش یا رزرو در این نسخه فعال نیست. هیچ شماره تماس یا نشانی ایمیل پشتیبانی واقعی به این پروژه متصل نشده است.", "برای بازخورد درباره نمونه محصول، از کانالی که این پروژه را از آن دریافت کرده‌اید استفاده کنید. اطلاعات مسافر یا پرداخت ارسال نکنید."],
  },
  partners: {
    title: "همکاری با ما",
    body: ["اتصال به فروشندگان فقط با دسترسی مستند و مجاز، قرارداد مناسب و مشخص بودن منبع و واحد قیمت انجام می‌شود.", "فرم یا مسیر تجاری همکاری هنوز فعال نیست. زیرساخت اتصال فروشندگان برای توسعه آینده حفظ شده است."],
  },
  social: {
    title: "شبکه‌های اجتماعی",
    body: ["برای این پروژه هنوز حساب رسمی شبکه اجتماعی تعریف نشده است. این دکمه به پروفایل ساختگی یا سرویس نامرتبط هدایت نمی‌شود."],
  },
  image: {
    title: "درباره تصویر سفر",
    body: ["تصویر واقع‌گرایانه هواپیما توسط کاربر برای این پروژه ارائه شده و تصویری تولیدشده است؛ این تصویر سند ثبت یک پرواز واقعی نیست.", "این تصویر تزئینی، مدل دقیق هواپیما یا وسیله پرواز هیچ‌یک از نتایج را نشان نمی‌دهد."],
  },
};

const popularRoutes = [
  { code: "MHD", label: "تهران به مشهد" },
  { code: "SYZ", label: "تهران به شیراز" },
  { code: "KIH", label: "تهران به کیش" },
  { code: "IFN", label: "تهران به اصفهان" },
  { code: "TBZ", label: "تهران به تبریز" },
  { code: "AWZ", label: "تهران به اهواز" },
];

export interface SiteFooterProps {
  onNavigate: (target: FooterNavigation) => void;
  onCompare?: () => void;
  onPopularRoute?: (destination: string) => void;
}

export function SiteFooter({ onNavigate, onCompare, onPopularRoute }: SiteFooterProps) {
  const [topic, setTopic] = useState<FooterTopic | null>(null);
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const emailId = useId();

  function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setNewsletterMessage("این فرم نمایشی است؛ ایمیل شما ذخیره نشد و اشتراکی ایجاد نشده است.");
    form.reset();
  }

  const info = topic ? information[topic] : null;

  return (
    <>
      <footer className="site-footer" aria-label="پاورقی ترب بلیط">
        <div className="page-container">
          <div className="footer-intro-row">
            <button type="button" className="footer-brand-button" onClick={() => onNavigate("discover")} aria-label="ترب بلیط؛ بازگشت به جست‌وجو"><Brand /></button>
            <p>انتخاب روشن‌تر، سفر دل‌چسب‌تر.</p>
            <button type="button" className="footer-support" onClick={() => setTopic("contact")}><Icon icon={Headphones} size={24} /><span><strong>همراه تجربه سفر شما</strong><span>راهنما و پشتیبانی</span></span><Icon icon={ArrowUpLeft} size={18} /></button>
          </div>

          <div className="footer-columns">
            <nav className="footer-column" aria-label="خدمات">
              <h2>خدمات</h2>
              <button type="button" onClick={() => onNavigate("discover")}>بلیط هواپیما</button>
              <button type="button" onClick={() => onNavigate("results")}>پروازهای داخلی</button>
              <button type="button" onClick={onCompare ?? (() => setTopic("buying"))}>مقایسه قیمت بلیط</button>
              <button type="button" onClick={() => setTopic("travel")}>راهنمای سفر</button>
              <button type="button" onClick={() => onNavigate("method")}>درباره سابقه لغو</button>
            </nav>
            <nav className="footer-column" aria-label="اطلاعات تکمیلی">
              <h2>اطلاعات تکمیلی</h2>
              <button type="button" onClick={() => setTopic("buying")}>راهنمای خرید</button>
              <button type="button" onClick={() => setTopic("faq")}>سؤالات متداول</button>
              <button type="button" onClick={() => setTopic("terms")}>قوانین و مقررات</button>
              <button type="button" onClick={() => setTopic("privacy")}>حریم خصوصی</button>
            </nav>
            <nav className="footer-column" aria-label="درباره ترب بلیط">
              <h2>درباره ترب بلیط</h2>
              <button type="button" onClick={() => setTopic("about")}>درباره ما</button>
              <button type="button" onClick={() => setTopic("contact")}>تماس با ما</button>
              <button type="button" onClick={() => setTopic("partners")}>همکاری با ما</button>
              <button type="button" onClick={() => setTopic("image")}>منبع تصویر</button>
            </nav>
            <div className="footer-column footer-newsletter">
              <h2>هم‌سفر خبرهای تازه باشید</h2>
              <p>از ایده‌های سفر و پیشنهادهای تازه باخبر شوید.</p>
              <form onSubmit={subscribe} className="newsletter-form">
                <label htmlFor={emailId}>ایمیل شما</label>
                <div className="newsletter-input-row"><Input id={emailId} type="email" name="email" required maxLength={254} autoComplete="email" placeholder="name@example.com" dir="ltr" /><Button variant="coral" type="submit" aria-label="عضویت در خبرنامه"><Icon icon={ArrowLeft} size={18} /><span>عضویت</span></Button></div>
              </form>
              <p className="newsletter-disclosure">پیش‌نمایش خبرنامه؛ ارسال و ذخیره ایمیل غیرفعال است.</p>
              <p className="newsletter-message" role="status" aria-live="polite">{newsletterMessage}</p>
              <div className="footer-socials" aria-label="شبکه‌های اجتماعی؛ حساب رسمی فعال نیست">
                <Button variant="circle" aria-label="اینستاگرام؛ حساب رسمی فعال نیست" onClick={() => setTopic("social")}><InstagramIcon size={18} /></Button>
                <Button variant="circle" aria-label="تلگرام؛ اطلاعات حساب" onClick={() => setTopic("social")}><Icon icon={Send} size={18} /></Button>
                <Button variant="circle" aria-label="گفت‌وگو؛ اطلاعات تماس" onClick={() => setTopic("contact")}><Icon icon={MessageCircle} size={18} /></Button>
                <Button variant="circle" aria-label="ایمیل؛ اطلاعات تماس" onClick={() => setTopic("contact")}><Icon icon={Mail} size={18} /></Button>
              </div>
            </div>
          </div>

          <nav className="footer-popular" aria-label="مسیرهای پرطرفدار"><h2>مسیرهای پرطرفدار</h2><div>{popularRoutes.map((route) => <button key={route.code} type="button" onClick={() => onPopularRoute ? onPopularRoute(route.code) : onNavigate("discover")}>{route.label}<Icon icon={ArrowUpLeft} size={14} /></button>)}</div></nav>

          <div className="footer-bottom">
            <span>© ۱۴۰۵ ترب بلیط · پروژه نمایشی مستقل</span>
            <div className="footer-bottom-links"><button type="button" onClick={() => onNavigate("method")}><Icon icon={ShieldCheck} size={16} />روش محاسبه سابقه</button><span><Icon icon={Globe2} size={16} />فارسی · تقویم شمسی</span></div>
          </div>
        </div>
      </footer>

      <Dialog open={info !== null} onClose={() => setTopic(null)} title={info?.title ?? "اطلاعات ترب بلیط"}>
        {info?.body.map((paragraph) => <p className="footer-info-paragraph" key={paragraph}>{paragraph}</p>)}
        {topic === "about" && <AirlineLogoCredits />}
      </Dialog>
    </>
  );
}
