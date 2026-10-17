import "server-only";
import { createUnavailableAdapter } from "./adapter-definition";

/** No endpoint, token format or response schema is assumed from the reference description. */
export function createAlibabaAdapter() {
  return createUnavailableAdapter({
    provider: { id: "alibaba", name: "علی‌بابا", homepage: "https://www.alibaba.ir/", bookingHosts: ["alibaba.ir"] },
    status: "unverified",
    message: "دسترسی رسمی علی‌بابا تأیید نشده است؛ داده زنده دریافت نمی‌شود.",
    missingRequirements: [
      "تأیید رسمی مسیر مجاز جست‌وجوی پرواز و مجوز مکتوب دریافت خودکار، مقایسه، نمایش، ذخیره موقت و ارجاع خرید",
      "مستندات رسمی نشانی سرویس، احراز هویت، سهمیه، خطاها، اعتبار قیمت و واحد ریال یا تومان",
      "قرارداد فیلدهای پرواز و نمونه پاسخ مجاز، شناسه عملیاتی، هزینه کامل مسافران و دامنه‌های مجاز رزرو",
      "دسترسی آزمایشی و اعتبارنامه صادرشده برای Flight AI در صورت نیاز قرارداد",
      "مشخصات رسمی و تأییدشده توکن جست‌وجو؛ وجود کد و پاسخ ذخیره‌شده مرجع، مجوز اتصال زنده نیست",
    ],
  });
}
