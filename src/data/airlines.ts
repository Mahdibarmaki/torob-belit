/**
 * Real identities and documented historical aircraft associations only.
 * These are reference examples, not a current fleet register or a dispatch feed.
 * Every flight number, route assignment, schedule, fare and outcome using them in
 * the demo is synthetic. See docs/AIRLINE_REFERENCES.md for dated evidence.
 */
export interface AirlineReference {
  /** Verified ICAO designator, or verified IATA designator when ICAO is ambiguous. */
  id: string;
  name: string;
  englishName: string;
  iata?: string;
  icao?: string;
  aircraftModels: readonly string[];
  evidenceUrls: readonly string[];
}

const codeReference = "https://www.faa.gov/air_traffic/publications/atpubs/cnt_html/chap3_section_3.html";
const historical2014 = "https://www.icao.int/MID/Documents/2014/RASG-MID4/WP8.pdf";
const historical2015 = "https://www.icao.int/MID/Documents/2015/ANSIG%201/WP%2026.pdf";

export const IRANIAN_AIRLINES: readonly AirlineReference[] = [
  {
    id: "IRA", name: "ایران‌ایر", englishName: "Iran Air", iata: "IR", icao: "IRA",
    aircraftModels: ["Airbus A321", "ATR 72-600"],
    evidenceUrls: [
      "https://www.iata.org/en/about/members/airline-list/iran-air/102/",
      "https://www.airbus.com/en/newsroom/press-releases/2017-01-iran-air-takes-delivery-of-its-first-of-100-airbus-aircraft",
      "https://www.atr-aircraft.com/wp-content/uploads/2020/07/atr_iran_air_fr_final_1437.pdf",
    ],
  },
  {
    id: "IRM", name: "ماهان", englishName: "Mahan Air", iata: "W5", icao: "IRM",
    aircraftModels: ["Airbus A310", "Airbus A300-600"], evidenceUrls: [codeReference, historical2014],
  },
  {
    id: "IRC", name: "آسمان", englishName: "Iran Aseman Airlines", iata: "EP", icao: "IRC",
    aircraftModels: ["Fokker 100"], evidenceUrls: [codeReference, historical2014, historical2015],
  },
  {
    id: "QSM", name: "قشم‌ایر", englishName: "Qeshm Air", icao: "QSM",
    aircraftModels: ["Airbus A320", "Fokker 100", "Airbus A300-600"],
    evidenceUrls: [codeReference, "https://www.qeshm-air.com/web2/knowledge.asp?ctype=fleet&lang=fa&title=%D9%85%D8%B9%D8%B1%D9%81%DB%8C_%D9%86%D8%A7%D9%88%DA%AF%D8%A7%D9%86"],
  },
  {
    // Historical ICAO IRK conflicts with a newer FAA entry. Do not guess a code.
    id: "Y9", name: "کیش‌ایر", englishName: "Kish Air", iata: "Y9",
    aircraftModels: ["Fokker 100"], evidenceUrls: [historical2014],
  },
  {
    id: "IZG", name: "زاگرس", englishName: "Zagros Airlines", icao: "IZG",
    aircraftModels: ["Airbus A320"], evidenceUrls: [codeReference, historical2015],
  },
  {
    id: "TBZ", name: "آتا", englishName: "ATA Airlines", iata: "I3", icao: "TBZ",
    aircraftModels: ["Airbus A320"], evidenceUrls: [codeReference, historical2014],
  },
  {
    id: "CPN", name: "کاسپین", englishName: "Caspian Airlines", icao: "CPN",
    aircraftModels: ["Boeing 737-400"], evidenceUrls: [codeReference, "https://www.linkedin.com/company/caspian-airlines"],
  },
  {
    id: "VRH", name: "وارش", englishName: "Varesh Airlines", icao: "VRH",
    aircraftModels: ["Boeing 737-300"], evidenceUrls: [codeReference, "https://avherald.com/files/Final%20Report%20%28English%29EP-VAI.pdf"],
  },
  {
    id: "MRJ", name: "معراج", englishName: "Meraj Airlines", icao: "MRJ",
    aircraftModels: ["Airbus A320"], evidenceUrls: [codeReference, historical2015],
  },
  {
    id: "SHI", name: "سپهران", englishName: "Sepehran Airlines", icao: "SHI",
    aircraftModels: ["Boeing 737-400"], evidenceUrls: [codeReference, "https://blog.flysepehran.com/fa/airline/boeing-737/"],
  },
];
