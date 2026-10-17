import thrMhd from "./alibaba-THR-MHD.json";
import thrSyz from "./alibaba-THR-SYZ.json";

/** Sanitized offline copies supplied with the inspected reference; no capture date or price unit is asserted. */
export const ALIBABA_REFERENCE_MANIFEST = {
  id: "alibaba-reference-sanitized-v1",
  label: "پاسخ ذخیره‌شده مرجع علی‌بابا؛ تاریخ دریافت نامعلوم و واحد قیمت تأییدنشده",
  importedAt: "2026-10-15T08:27:36Z",
  capturedAt: null,
  priceUnit: "unverified",
  sources: [
    {
      originalPath: "reference/extracted/torob-belit/fixtures/alibaba-THR-MHD.json",
      originalSha256: "e0716575fa2e807db30779ad5ac37c698bed057a93362e5dddcc677bb3ae6bb9",
      sanitizedPath: "src/fixtures/alibaba/alibaba-THR-MHD.json",
      sanitizedSha256: "312ca3f11db80f491a6572843053f2dd98d4797b997b8e51298c9729af037021",
    },
    {
      originalPath: "reference/extracted/torob-belit/fixtures/alibaba-THR-SYZ.json",
      originalSha256: "deaa84acd4a13425e3f75ed561f8ca6f93cd1a6acdfb195d96c5ac8d23ea4d57",
      sanitizedPath: "src/fixtures/alibaba/alibaba-THR-SYZ.json",
      sanitizedSha256: "77e1a8bf15b2a27e33aee3eb36038d4092ef0eb230858d5a0c4ae3773c2c502b",
    },
  ],
  routes: [
    { origin: "THR", destination: "MHD", departureDates: ["2026-10-15"], file: "alibaba-THR-MHD.json", recordCount: 55 },
    { origin: "THR", destination: "SYZ", departureDates: ["2026-10-15"], file: "alibaba-THR-SYZ.json", recordCount: 14 },
  ],
} as const;

export const ALIBABA_REFERENCE_FIXTURES = [
  { ...ALIBABA_REFERENCE_MANIFEST.routes[0], payload: thrMhd as unknown },
  { ...ALIBABA_REFERENCE_MANIFEST.routes[1], payload: thrSyz as unknown },
] as const;
