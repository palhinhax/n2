import { fetchText } from "../http";
import { intFrom, stripTags } from "../parse";
import type { Listing, PageResult, SiteAdapter } from "../types";

/**
 * OLX.pt — a API JSON interna deixou de devolver resultados, por isso lemos
 * o HTML da listagem (renderizado no servidor). Paginação em ?page=N.
 * O OLX limita a paginação a 100 páginas por pesquisa; percorremos marca a
 * marca para cobrir o universo (cada marca < 100 páginas).
 */

const BASE = "https://www.olx.pt/carros-motos-e-barcos/carros";
// links de detalhe: /d/anuncio/{slug}-{ID...}.html
const LINK_RE = /\/d\/anuncio\/([a-z0-9-]+)-(ID[A-Za-z0-9]+)\.html/gi;

// slugs de marca no OLX (multi-palavra primeiro)
const BRANDS = [
  "alfa-romeo",
  "aston-martin",
  "land-rover",
  "mercedes-benz",
  "rolls-royce",
  "abarth",
  "audi",
  "bentley",
  "bmw",
  "byd",
  "cadillac",
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
  "land-rover",
  "lexus",
  "maserati",
  "mazda",
  "mclaren",
  "mercedes-benz",
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
  "vw",
  "volvo",
] as const;

// marcas para percorrer (slug do OLX)
const BRAND_SLUGS = [
  "audi",
  "bmw",
  "citroen",
  "dacia",
  "fiat",
  "ford",
  "honda",
  "hyundai",
  "jaguar",
  "jeep",
  "kia",
  "land-rover",
  "mazda",
  "mercedes-benz",
  "mini",
  "mitsubishi",
  "nissan",
  "opel",
  "peugeot",
  "porsche",
  "renault",
  "seat",
  "skoda",
  "smart",
  "tesla",
  "toyota",
  "volkswagen",
  "volvo",
  "cupra",
  "byd",
  "alfa-romeo",
  "lexus",
  "suzuki",
  "ssangyong",
  "dodge",
  "chevrolet",
  "ferrari",
  "lamborghini",
  "maserati",
  "bentley",
  "lancia",
  "chrysler",
];

interface OlxCursor {
  brandIdx: number; // -1 = pesquisa geral (recentes) antes das marcas
  page: number;
}

function brandModelFromSlug(slug: string): {
  brand: string | null;
  model: string | null;
} {
  const canon: Record<string, string> = { vw: "Volkswagen" };
  for (const b of BRANDS) {
    if (slug === b || slug.startsWith(`${b}-`)) {
      const label =
        canon[b] ||
        b
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join("-");
      const rest = slug
        .slice(b.length + 1)
        .replace(/-/g, " ")
        .trim();
      const model = rest ? rest.split(" ").slice(0, 2).join(" ") : null;
      return { brand: label, model };
    }
  }
  return { brand: null, model: null };
}

function fuelFrom(text: string): string | null {
  if (/plug|phev/i.test(text)) return "Híbrido Plug-In";
  if (/el[ée]ctric|el[ée]tric/i.test(text)) return "Elétrico";
  if (/h[íi]brid/i.test(text)) return "Híbrido";
  if (/diesel|gas[oó]leo/i.test(text)) return "Diesel";
  if (/gasolina/i.test(text)) return "Gasolina";
  if (/\bgpl\b/i.test(text)) return "GPL";
  return null;
}

function parseCard(
  html: string,
  atIndex: number,
  slug: string,
  id: string
): Listing | null {
  const chunk = html.slice(Math.max(0, atIndex - 200), atIndex + 1500);
  const text = stripTags(chunk);

  // "… 19 990 €  Local - data  2018 - 103.000 km"
  const priceMatch = text.match(/([\d]{1,3}(?:[.\s]\d{3})*)\s*€/g);
  const price = priceMatch ? intFrom(priceMatch[priceMatch.length - 1]) : null;
  const ykMatch = text.match(/((?:19|20)\d{2})\s*[-–]\s*([\d.\s]+)\s*km/i);
  const year = ykMatch ? intFrom(ykMatch[1]) : null;
  const km = ykMatch ? intFrom(ykMatch[2]) : null;

  // imagem do cartão: o OLX usa o CDN apollo.olxcdn.com; a <img> aparece
  // antes do link do anúncio no HTML (procuramos a mais próxima antes).
  const before = html.slice(Math.max(0, atIndex - 2500), atIndex);
  const imgMatches = before.match(
    /https:\/\/[a-z0-9.-]*apollo\.olxcdn\.com(?::\d+)?\/v1\/files\/[^\s"'\\)]+/gi
  );
  let image: string | undefined;
  if (imgMatches?.length) {
    image = imgMatches[imgMatches.length - 1]
      .replace(/^(https:\/\/[^/:]+):443\//, "$1/")
      .replace(/;s=\d+x\d+.*$/, ";s=800x600")
      .replace(/&quot;.*$/, "");
  }

  const { brand, model } = brandModelFromSlug(slug);
  const title = slug.replace(/-/g, " ");

  if (price == null && year == null) return null;

  return {
    source: "OLX",
    externalId: id,
    url: `https://www.olx.pt/d/anuncio/${slug}-${id}.html`,
    title,
    brand,
    model,
    year,
    km,
    fuel: fuelFrom(text),
    gearbox: null,
    power: null,
    displacement: null,
    price,
    location: null,
    sellerType: null,
    sellerName: null,
    imageUrls: image ? [image] : [],
  };
}

function listUrl(cursor: OlxCursor): string {
  const base =
    cursor.brandIdx < 0 ? BASE : `${BASE}/${BRAND_SLUGS[cursor.brandIdx]}`;
  return cursor.page <= 1 ? `${base}/` : `${base}/?page=${cursor.page}`;
}

const MAX_PAGE = 100; // limite de paginação do OLX

export const olx: SiteAdapter = {
  name: "OLX",
  async scrapePage(cursorRaw: unknown): Promise<PageResult> {
    const cursor: OlxCursor = (cursorRaw as OlxCursor) ?? {
      brandIdx: -1,
      page: 1,
    };
    const html = await fetchText(listUrl(cursor));

    const seen = new Set<string>();
    const items: Listing[] = [];
    LINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = LINK_RE.exec(html)) !== null) {
      const [, slug, id] = m;
      if (seen.has(id)) continue;
      seen.add(id);
      const listing = parseCard(html, m.index, slug, id);
      if (listing) items.push(listing);
    }

    // avança página; ao esgotar (0 itens ou página 100), passa à marca seguinte
    const pageExhausted = items.length === 0 || cursor.page >= MAX_PAGE;
    let nextCursor: OlxCursor | null;
    if (!pageExhausted) {
      nextCursor = { ...cursor, page: cursor.page + 1 };
    } else if (cursor.brandIdx + 1 < BRAND_SLUGS.length) {
      nextCursor = { brandIdx: cursor.brandIdx + 1, page: 1 };
    } else {
      nextCursor = null;
    }
    return { items, nextCursor };
  },
};
