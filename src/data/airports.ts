/** Curated airport reference metadata, independent of ticket inventory. */
export interface Airport {
  code: string;
  name: string;
  city: string;
  timeZone: string;
}

export const AIRPORTS: Airport[] = [
  { code: "THR", name: "مهرآباد", city: "تهران (مهرآباد)", timeZone: "Asia/Tehran" },
  { code: "SYZ", name: "شهید دستغیب", city: "شیراز", timeZone: "Asia/Tehran" },
  { code: "IKA", name: "امام خمینی", city: "تهران", timeZone: "Asia/Tehran" },
  { code: "MHD", name: "هاشمی‌نژاد", city: "مشهد", timeZone: "Asia/Tehran" },
  { code: "KIH", name: "کیش", city: "کیش", timeZone: "Asia/Tehran" },
  { code: "IFN", name: "شهید بهشتی", city: "اصفهان", timeZone: "Asia/Tehran" },
  { code: "TBZ", name: "شهید مدنی", city: "تبریز", timeZone: "Asia/Tehran" },
  { code: "AWZ", name: "اهواز", city: "اهواز", timeZone: "Asia/Tehran" },
  { code: "IST", name: "استانبول", city: "استانبول", timeZone: "Europe/Istanbul" },
  { code: "DXB", name: "دبی", city: "دبی", timeZone: "Asia/Dubai" },
  { code: "LHR", name: "هیترو", city: "لندن", timeZone: "Europe/London" },
];

