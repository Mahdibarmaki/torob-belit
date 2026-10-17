/** Concise UI wording for authored demo text; original fixture provenance is retained. */
export function presentationCopy(text: string): string {
  return text
    .replace(/شرایط ساختگی:\s*/gu, "")
    .replace(/شرایط ساختگی/gu, "شرایط پیشنهاد")
    .replace(/قیمت ساختگی/gu, "قیمت")
    .replace(/سابقه ساختگی/gu, "سابقه")
    .replace(/داده شبیه‌سازی‌شده/gu, "اطلاعات مجموعه")
    .replace(/مبلغ نمایشی/gu, "مبلغ")
    .replace(/تأیید موجودی واقعی نیست\./gu, "")
    .replace(/نسخه نمایشی/gu, "محصول آزمایشی")
    .trim();
}
