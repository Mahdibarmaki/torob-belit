import "server-only";
import { createUnavailableAdapter } from "./adapter-definition";

export function createSnapptripAdapter() {
  return createUnavailableAdapter({
    provider: { id: "snapptrip", name: "اسنپ‌تریپ", homepage: "https://www.snapptrip.com/", bookingHosts: ["snapptrip.com"] },
    status: "awaiting-agreement",
    message: "وب‌سرویس B2B اسنپ‌تریپ معرفی شده است؛ توافق و قرارداد فنی هنوز موجود نیست.",
    missingRequirements: [
      "تأیید پوشش جست‌وجوی پرواز در وب‌سرویس B2B و اجازه مکتوب مقایسه مستقل، نمایش، ذخیره موقت و ارجاع خرید",
      "مستندات رسمی میزبان و مسیر مجاز، قرارداد پاسخ، احراز هویت، سهمیه و سیاست خطا و محدودیت درخواست",
      "تعریف شناسه عملیاتی، زمان و منطقه زمانی، بار، موجودی، هزینه کامل و واحد صریح ریال یا تومان",
      "اعتبارنامه و محیط آزمایشی، قواعد انقضای قیمت و دامنه و عمر لینک رزرو مورد تأیید",
    ],
  });
}
