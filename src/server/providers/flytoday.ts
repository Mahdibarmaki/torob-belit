import "server-only";
import { createUnavailableAdapter } from "./adapter-definition";

export function createFlytodayAdapter() {
  return createUnavailableAdapter({
    provider: { id: "flytoday", name: "فلای‌تودی", homepage: "https://www.flytoday.ir/", bookingHosts: ["flytoday.ir"] },
    status: "awaiting-agreement",
    message: "شرایط عمومی فلای‌تودی استخراج خودکار را محدود می‌کند؛ قرارداد جداگانه لازم است.",
    missingRequirements: [
      "استثنا یا توافق مکتوب برای دریافت خودکار و استفاده تجاری در مقایسه و نمایش؛ پنل خرید سازمانی کافی نیست",
      "تأیید وجود سرویس رسمی مصرف موجودی و مستندات نشانی، احراز هویت، سهمیه، ذخیره موقت و ارجاع خرید",
      "نمونه پاسخ و قرارداد شناسه عملیاتی، زمان‌بندی، بار، موجودی، قیمت کامل و واحد صریح ریال یا تومان",
      "دسترسی آزمایشی، اعتبارنامه و قواعد انقضا، بازبینی قیمت و دامنه رزرو مورد تأیید",
    ],
  });
}
