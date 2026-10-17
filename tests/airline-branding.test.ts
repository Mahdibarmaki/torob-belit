import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChevronDown, Menu, Plane, PlaneLanding, PlaneTakeoff, Trash2 } from "lucide-react";
import { AIRLINE_LOGOS, airlineLogoFor } from "@/data/airline-branding";
import { IRANIAN_AIRLINES } from "@/data/airlines";
import { AirlineIdentity } from "@/components/airline-identity";
import { AirlineLogoCredits } from "@/components/airline-logo-credits";
import { Icon } from "@/components/ui";

const hashes: Record<string, string> = {
  "/airlines/iran-air.jpg": "e843ec39d6a25c7114fd056412cf77e01b8410a604787cb42e1878c63034c943",
  "/airlines/zagros.png": "bcafb557f0101303fea58935fbe8df031b2013741c76f258e34e695497bae0ae",
  "/airlines/meraj.png": "e7da145dcd25e42056da025c8be5c891efc5637c45ea6e94b8e56d61eec994cd",
  "/airlines/ata.png": "6513744ee26b25ba30900148e1a2aa78da8ceacd9f319c33c36e836eab6d7cdb",
  "/airlines/taban.png": "a6be980b56dbae5d137e3d2d705382127cf58f6fb55371a11f9cf4fd369c22d5",
  "/airlines/air1air.png": "119d70b832934e6452cb94e6486733573d5b31d7d3e9889013e2a1a56dd5f474",
};

describe("reviewed airline presentation identity", () => {
  it.each(AIRLINE_LOGOS)("maps the reviewed name and codes for $airlineId without changing data", (logo) => {
    for (const code of logo.codes) for (const name of logo.names) {
      const input = { code, name };
      expect(airlineLogoFor(input.code, input.name)).toBe(logo);
      expect(input).toEqual({ code, name });
    }
  });

  it("normalizes Persian typography and code casing only", () => {
    expect(airlineLogoFor(" ir ", "ایران‌اير")?.airlineId).toBe("IRA");
    expect(airlineLogoFor("I3", "هواپيمايی آتا")?.airlineId).toBe("TBZ");
  });

  it("resolves reviewed formal aliases and diacritic/formatting variants through the supplied stable code", () => {
    expect(airlineLogoFor("ＩＲ", "\u2067هَـواپیمایی\u200d ایران‌ ایر\u2069")?.airlineId).toBe("IRA");
    expect(airlineLogoFor("a1", "اِرْوان")?.src).toBe("/airlines/air1air.png");
    expect(airlineLogoFor("A1", "Air 1 Air")?.src).toBe("/airlines/air1air.png");
    expect(airlineLogoFor("IRA", "هواپیمایی جمهوری اسلامی ایران")?.airlineId).toBe("IRA");
    expect(airlineLogoFor("IRA", "IranAir")?.airlineId).toBe("IRA");
    expect(airlineLogoFor("A1", "Iran Air")).toBeNull();
  });

  it("never gives two logo identities ownership of the same code", () => {
    const codes = AIRLINE_LOGOS.flatMap((logo) => [...logo.codes]);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("audits every actual demo and imported reference identity without treating missing permissions as a mapping success", () => {
    const demoWithLogo = new Set(["IRA", "IZG", "MRJ", "TBZ"]);
    for (const airline of IRANIAN_AIRLINES) {
      expect(airlineLogoFor(airline.id, airline.name) !== null, `${airline.id} ${airline.name}`).toBe(demoWithLogo.has(airline.id));
    }
    const referenceWithLogo = new Set(["ZV", "JI", "IR", "HH", "I3", "A1"]);
    const found = new Set<string>();
    for (const filename of ["alibaba-THR-MHD.json", "alibaba-THR-SYZ.json"]) {
      const saved = JSON.parse(readFileSync(new URL(`../src/fixtures/alibaba/${filename}`, import.meta.url), "utf8")) as {
        result: { departing: { airlineCode: string; airlineName: string }[] };
      };
      for (const record of saved.result.departing) {
        found.add(`${record.airlineCode}:${record.airlineName}`);
        expect(airlineLogoFor(record.airlineCode, record.airlineName) !== null, `${record.airlineCode} ${record.airlineName}`).toBe(referenceWithLogo.has(record.airlineCode));
      }
    }
    expect(found.size).toBe(18);
    expect(airlineLogoFor("QSM", "قشم‌ایر")).toBeNull();
  });

  it.each([
    ["AA", "آوا ایر"], ["MH", "هواپیمایی مهر"], ["B9", "ایران ایرتور"],
    ["IR", "ایران ایرتور"], ["IRM", "ایران‌ایر"], ["IRA", "ماهان"],
    ["IR", "ایران‌ایر و آسمان"], ["", "ایران‌ایر"], ["unknown", "ایران‌ایر"],
  ])("rejects unknown or contradictory code/name %s / %s", (code, name) => {
    expect(airlineLogoFor(code, name)).toBeNull();
  });

  it("uses name-only lookup solely when the code is absent and the full alias agrees", () => {
    expect(airlineLogoFor(undefined, "Iran Air")?.airlineId).toBe("IRA");
    expect(airlineLogoFor(undefined, "Iran")?.airlineId).toBeUndefined();
    expect(airlineLogoFor(undefined, "Iran Airtour")).toBeNull();
  });

  it.each(AIRLINE_LOGOS)("ships the reviewed unchanged asset for $airlineId", (logo) => {
    const file = readFileSync(new URL(`../public${logo.src}`, import.meta.url));
    expect(createHash("sha256").update(file).digest("hex")).toBe(hashes[logo.src]);
    expect(logo.width).toBeGreaterThan(0);
    expect(logo.height).toBeGreaterThan(0);
    if (logo.src.endsWith(".png")) {
      expect(file.readUInt32BE(16)).toBe(logo.width);
      expect(file.readUInt32BE(20)).toBe(logo.height);
    }
  });

  it("keeps the name visible alongside accessible local image information", () => {
    const html = renderToStaticMarkup(createElement(AirlineIdentity, { airlineId: "IRA", name: "ایران‌ایر", size: 32 }));
    expect(html).toContain('alt="نشان ایران‌ایر"');
    expect(html).toMatch(/<bdi[^>]*>ایران‌ایر<\/bdi>/u);
    expect(html).toContain("iran-air.jpg");
    expect(html).not.toContain('src="https://');
  });

  it("preserves an unknown airline with a clearly generic accessible fallback", () => {
    const html = renderToStaticMarkup(createElement(AirlineIdentity, { airlineId: "MH", name: "هواپیمایی مهر" }));
    expect(html).not.toContain("<img");
    expect(html).toContain("نماد عمومی شرکت هواپیمایی هواپیمایی مهر");
    expect(html).toMatch(/<bdi[^>]*>هواپیمایی مهر<\/bdi>/u);
  });

  it("credits only distinct logos actually selected with accessible source and license links", () => {
    const html = renderToStaticMarkup(createElement(AirlineLogoCredits, {
      airlines: [
        { airlineId: "MRJ", name: "معراج" }, { airlineId: "JI", name: "معراج" },
        { airlineId: "MH", name: "هواپیمایی مهر" },
      ],
    }));
    expect(html.match(/<li\b/gu)).toHaveLength(1);
    expect(html).toContain("Dreamliner 2012");
    expect(html).toContain("https://creativecommons.org/licenses/by-sa/3.0/");
    expect(html).toContain("https://commons.wikimedia.org/wiki/File:Meraj_Logo.png");
    expect(html).not.toContain("Edward Zahrabian");
    expect(renderToStaticMarkup(createElement(AirlineLogoCredits, { airlines: [{ name: "ناشناخته" }] }))).toBe("");
  });
});

describe("shared solid icon semantics", () => {
  it.each([Menu, Trash2, Plane, PlaneTakeoff, PlaneLanding])("renders an reviewed semantic silhouette", (icon) => {
    const html = renderToStaticMarkup(createElement(Icon, { icon, size: 18 }));
    expect(html).toContain('data-icon-style="solid"');
    expect(html).toContain(`data-icon-name="${icon.displayName}"`);
    expect(html).toContain('fill="currentColor"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).toContain('width="18"');
  });

  it("preserves clear disclosure glyphs instead of blindly filling open chevrons", () => {
    const html = renderToStaticMarkup(createElement(Icon, { icon: ChevronDown }));
    expect(html).toContain('data-icon-style="outline"');
    expect(html).toContain('fill="none"');
  });

  it("keeps the route plane orientation and distinguishes ascent from descent", () => {
    const ordinary = renderToStaticMarkup(createElement(Icon, { icon: Plane }));
    const takeoff = renderToStaticMarkup(createElement(Icon, { icon: PlaneTakeoff }));
    const landing = renderToStaticMarkup(createElement(Icon, { icon: PlaneLanding }));
    expect(ordinary).toContain("rotate(45 12 12)");
    expect(takeoff).toContain("rotate(55 12 12)");
    expect(landing).toContain("rotate(125 12 12)");
  });
});
