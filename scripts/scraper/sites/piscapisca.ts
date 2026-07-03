import { fetchText } from "../http";
import { intFrom, stripTags } from "../parse";
import type { Listing, PageResult, SiteAdapter } from "../types";

/**
 * PiscaPisca.pt — Angular com SSR. A listagem genérica /carros tem limite de
 * paginação, por isso percorremos marca a marca (/carros/{marca}?page=N).
 * O parsing é feito sobre o HTML renderizado no servidor.
 */

const BASE = "https://www.piscapisca.pt/carros";

// Slugs de marca conhecidos (multi-palavra primeiro para o parsing de brand/model)
const BRANDS = [
  "alfa-romeo",
  "aston-martin",
  "land-rover",
  "mercedes-benz",
  "abarth",
  "audi",
  "bentley",
  "bmw",
  "byd",
  "chevrolet",
  "chrysler",
  "citroen",
  "cupra",
  "dacia",
  "daewoo",
  "daihatsu",
  "dodge",
  "ds",
  "ferrari",
  "fiat",
  "ford",
  "honda",
  "hyundai",
  "isuzu",
  "iveco",
  "jaguar",
  "jeep",
  "kia",
  "lamborghini",
  "lancia",
  "lexus",
  "maserati",
  "mazda",
  "mg",
  "mini",
  "mitsubishi",
  "nissan",
  "opel",
  "peugeot",
  "polestar",
  "porsche",
  "renault",
  "rover",
  "saab",
  "seat",
  "skoda",
  "smart",
  "ssangyong",
  "subaru",
  "suzuki",
  "tesla",
  "toyota",
  "volkswagen",
  "volvo",
] as const;

interface PpCursor {
  brandIdx: number;
  page: number;
}

const CARD_LINK_RE =
  /href="(https:\/\/www\.piscapisca\.pt\/carros\/usados\/([a-z0-9-]+)\/([A-Za-z0-9]+))[^"]*"/g;

function brandModelFromSlug(slug: string): {
  brand: string | null;
  model: string | null;
} {
  for (const b of BRANDS) {
    if (slug === b || slug.startsWith(`${b}-`)) {
      const rest = slug
        .slice(b.length + 1)
        // remove sufixo de combustível do slug
        .replace(
          /-(gasolina|diesel|eletrico|gpl|hibrido(-a-gasolina|-a-diesel)?|hidrogenio)$/i,
          ""
        );
      const brand = b
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("-");
      return { brand, model: rest ? rest.replace(/-/g, " ") : null };
    }
  }
  return { brand: null, model: null };
}

/** Extrai um anúncio a partir do troço de HTML à volta do link do cartão. */
function parseCard(
  html: string,
  url: string,
  slug: string,
  externalId: string
): Listing | null {
  const idx = html.indexOf(url);
  if (idx === -1) return null;
  const chunk = html.slice(Math.max(0, idx - 2500), idx + 5000);
  const text = stripTags(chunk);

  // "Fiat Panda 1.0 Hybrid City Life 88 836 km • Manual • Gasolina • 2022 Moure - Barcelos"
  const specs = text.match(
    /([\dº.,\s]{1,12})km\s*•\s*(Manual|Automática|Semi-automática)\s*•\s*([A-Za-zÀ-ÿ() -]{3,40}?)\s*•\s*((?:19|20)\d{2})\s*([A-Za-zÀ-ÿ' -]{0,60})/
  );

  // título: texto imediatamente antes do bloco "N km •"
  let title: string | null = null;
  if (specs && specs.index != null) {
    const before = text.slice(0, specs.index).trim();
    const parts = before.split(/(?:>>|€|\bkm\b)/);
    title =
      parts[parts.length - 1]
        .trim()
        .replace(/^[\d\s.,]+/, "")
        .trim() || null;
    if (title && title.length > 90) title = title.slice(-90).trim();
  }

  const priceMatch = text.match(/([\d]{1,3}(?:[\s.]\d{3})*)\s*€/);
  const imgMatch = chunk.match(
    /https:\/\/static\.piscapisca\.pt\/[^"'\s)]+\.(?:jpg|jpeg|png|webp)/i
  );
  const powerMatch = text.match(/Potência\s*([\d\s]{1,6})\s*cv/i);
  const dispMatch = text.match(/Cilindrada\s*([\d\s]{1,7})\s*cm3/i);

  const { brand, model } = brandModelFromSlug(slug);

  if (!title && !brand) return null;

  return {
    source: "PISCAPISCA",
    externalId,
    url,
    title: title ?? [brand, model].filter(Boolean).join(" "),
    brand,
    model,
    year: specs ? intFrom(specs[4]) : null,
    km: specs ? intFrom(specs[1]) : null,
    fuel: specs ? specs[3].trim() : null,
    gearbox: specs ? specs[2] : null,
    power: powerMatch ? intFrom(powerMatch[1]) : null,
    displacement: dispMatch ? intFrom(dispMatch[1]) : null,
    price: priceMatch ? intFrom(priceMatch[1]) : null,
    location: specs && specs[5] ? specs[5].trim() || null : null,
    sellerType: /PARTICULAR/i.test(text) ? "Particular" : "Profissional",
    sellerName: null,
    imageUrls: imgMatch ? [imgMatch[0]] : [],
  };
}

export const piscapisca: SiteAdapter = {
  name: "PISCAPISCA",
  async scrapePage(cursorRaw: unknown): Promise<PageResult> {
    const cursor: PpCursor = (cursorRaw as PpCursor) ?? {
      brandIdx: 0,
      page: 1,
    };
    const brand = BRANDS[cursor.brandIdx];
    const url =
      cursor.page === 1
        ? `${BASE}/${brand}`
        : `${BASE}/${brand}?page=${cursor.page}`;
    const html = await fetchText(url);

    const seen = new Set<string>();
    const items: Listing[] = [];
    CARD_LINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CARD_LINK_RE.exec(html)) !== null) {
      const [, cardUrl, slug, externalId] = m;
      if (seen.has(externalId)) continue;
      seen.add(externalId);
      const listing = parseCard(html, cardUrl, slug, externalId);
      if (listing) items.push(listing);
    }

    let nextCursor: PpCursor | null;
    if (items.length > 0) {
      nextCursor = { ...cursor, page: cursor.page + 1 };
    } else if (cursor.brandIdx + 1 < BRANDS.length) {
      nextCursor = { brandIdx: cursor.brandIdx + 1, page: 1 };
    } else {
      nextCursor = null;
    }
    return { items, nextCursor };
  },
};
// EOF
