import type { Airport } from "@/data/airports";

// Search aliases only: these do not create airports or replace their displayed metadata.
const ENGLISH_SEARCH_ALIASES: Readonly<Record<string, readonly string[]>> = {
  THR: ["Tehran", "Mehrabad"],
  SYZ: ["Shiraz", "Shahid Dastgheib", "Dastghaib"],
  IKA: ["Tehran", "Imam Khomeini"],
  MHD: ["Mashhad", "Mashad", "Hashemi Nejad", "Hasheminejad"],
  KIH: ["Kish"],
  IFN: ["Isfahan", "Esfahan", "Shahid Beheshti"],
  TBZ: ["Tabriz", "Shahid Madani"],
  AWZ: ["Ahvaz", "Ahwaz"],
  IST: ["Istanbul"],
  DXB: ["Dubai"],
  LHR: ["London", "Heathrow"],
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[يى]/gu, "ی")
    .replace(/ك/gu, "ک")
    .replace(/\p{M}/gu, "")
    .replace(/[\s\u200c\u200d\u200e\u200f\u061c\u0640-]+/gu, "");
}

/** Stable partial matching over existing airport identities; never mutates the input. */
export function searchAirports(airports: readonly Airport[], query: string): Airport[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [...airports];

  return airports.filter((airport) => {
    const aliases = ENGLISH_SEARCH_ALIASES[airport.code.toUpperCase()] ?? [];
    return [airport.code, airport.city, airport.name, ...aliases]
      .some((field) => normalizeSearchText(field).includes(normalizedQuery));
  });
}
