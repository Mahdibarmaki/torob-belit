import "server-only";
import { createUnavailableAdapter } from "./adapter-definition";

export function createSafarmarketAdapter() {
  return createUnavailableAdapter({
    provider: { id: "safarmarket", name: "سفرمارکت", homepage: "https://safarmarket.com/", bookingHosts: ["safarmarket.com"] },
    status: "awaiting-agreement",
    message: "استخراج و بازنشر نتایج سفرمارکت نیازمند اجازه کتبی است؛ دریافت موجودی متصل نیست.",
    missingRequirements: [
      "اجازه کتبی دریافت و بازنشر نتایج برای مقایسه مستقل؛ ثبت‌نام تأمین‌کننده مجوز مصرف موجودی نیست",
      "قرارداد خروجی رسمی داده، حقوق نمایش هر فروشنده، انتساب منبع، ذخیره موقت و لینک ارجاع",
      "مستندات سرویس و نمونه پاسخ شامل هویت پرواز و فروشنده، بار، شرایط، موجودی و قیمت کامل با واحد صریح",
      "دسترسی آزمایشی، احراز هویت، سهمیه، قواعد تازگی و اعتبار نشانی خرید هر فروشنده",
    ],
  });
}
