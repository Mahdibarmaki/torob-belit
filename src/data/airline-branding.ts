/** Presentation-only aliases. These never rewrite operating identities or provider records. */
export interface AirlineLogo {
  airlineId: string;
  codes: readonly string[];
  names: readonly string[];
  src: string;
  width: number;
  height: number;
  sourceUrl: string;
  license: "CC BY-SA 4.0" | "CC BY-SA 3.0" | "CC0 1.0" | "PD-textlogo";
  licenseUrl: string;
  author: string;
  attribution: string;
}

export const AIRLINE_LOGOS: readonly AirlineLogo[] = [
  {
    airlineId: "IRA", codes: ["IRA", "IR"], names: ["ایران‌ایر", "ایران ایر", "هواپیمایی ایران ایر", "هواپیمایی جمهوری اسلامی ایران", "هما", "Iran Air", "IranAir"],
    src: "/airlines/iran-air.jpg", width: 980, height: 980,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Iranair_logo.jpg",
    license: "CC0 1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    author: "Edward Zahrabian (ادوارد زهرابیان)",
    attribution: "Iran Air logo — Edward Zahrabian (ادوارد زهرابیان), via Wikimedia Commons; CC0 1.0; unchanged.",
  },
  {
    airlineId: "IZG", codes: ["IZG", "ZV"], names: ["زاگرس", "هواپیمایی زاگرس", "Zagros", "Zagros Air", "Zagros Airlines"],
    src: "/airlines/zagros.png", width: 783, height: 782,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Zagros-logo.png",
    license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    author: "zagros airline",
    attribution: "Zagros Airlines logo — zagros airline, via Wikimedia Commons; CC BY-SA 4.0; unchanged.",
  },
  {
    airlineId: "MRJ", codes: ["MRJ", "JI"], names: ["معراج", "هواپیمایی معراج", "Meraj Airlines", "Meraj Air"],
    src: "/airlines/meraj.png", width: 298, height: 283,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Meraj_Logo.png",
    license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    author: "Dreamliner 2012",
    attribution: "Meraj Airlines logo — Dreamliner 2012, via Wikimedia Commons; CC BY-SA 3.0; unchanged.",
  },
  {
    airlineId: "TBZ", codes: ["TBZ", "I3"], names: ["آتا", "هواپیمایی آتا", "ATA Airlines", "ATA Airlines (Iran)"],
    src: "/airlines/ata.png", width: 800, height: 309,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Logo_text_ATA_Airlines_(Iran)_2025.png",
    license: "PD-textlogo", licenseUrl: "https://commons.wikimedia.org/wiki/Template:PD-textlogo",
    author: "ATA Airlines (Iran)",
    attribution: "ATA Airlines (Iran) wordmark — ATA Airlines (Iran), via Wikimedia Commons; PD-textlogo; unchanged; trademark retained.",
  },
  {
    airlineId: "TBN", codes: ["TBN", "HH"], names: ["تابان", "تابان ایر", "هواپیمایی تابان", "Taban", "Taban Air", "Taban Airlines"],
    src: "/airlines/taban.png", width: 2480, height: 3508,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Taban_Airlines_official_logo.png",
    license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    author: "Tabanairlines",
    attribution: "Taban Airlines official logo — Tabanairlines, via Wikimedia Commons; CC BY-SA 4.0; unchanged.",
  },
  {
    // A1 is the stored provider alias, not a newly verified IATA/ICAO designator.
    airlineId: "A1", codes: ["A1"], names: ["اروان", "اِروان", "هواپیمایی اروان", "هواپیمایی اِروان", "Air1Air", "Air 1 Air", "Air1 Air"],
    src: "/airlines/air1air.png", width: 280, height: 159,
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Logo_Air1Air_(Iran).png",
    license: "PD-textlogo", licenseUrl: "https://commons.wikimedia.org/wiki/Template:PD-textlogo",
    author: "Air1Air",
    attribution: "Air1Air (Iran) logo — Air1Air, via Wikimedia Commons; PD-textlogo; unchanged; trademark retained.",
  },
];

/** Normalize typography only; do not fuzzy-match or infer an airline from a similar name. */
function normalizedName(name: string): string {
  return name.normalize("NFKC").replaceAll("ي", "ی").replaceAll("ك", "ک")
    .replaceAll("ى", "ی")
    .replace(/[\s\u0640\u064b-\u065f\u0670\u200b-\u200f\u202a-\u202e\u2066-\u2069]+/gu, "")
    .toLocaleLowerCase("en");
}

const logosByCode = new Map(AIRLINE_LOGOS.flatMap((logo) => logo.codes.map((code) => [code, logo] as const)));

/** A supplied code AND name must agree. Missing code may use an exact reviewed name alias. */
export function airlineLogoFor(airlineId: string | undefined, name: string): AirlineLogo | null {
  const normalized = normalizedName(name);
  if (!normalized) return null;
  const agrees = (logo: AirlineLogo) => logo.names.some((alias) => normalizedName(alias) === normalized);
  if (airlineId !== undefined) {
    const byCode = logosByCode.get(airlineId.normalize("NFKC").trim().toUpperCase());
    return byCode && agrees(byCode) ? byCode : null;
  }
  return AIRLINE_LOGOS.find(agrees) ?? null;
}
