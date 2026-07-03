import { fetchText } from "../http";
import { intFrom, stripTags } from "../parse";
import type { Listing, PageResult, SiteAdapter } from "../types";

/**
 * Auto SAPO (auto.sapo.pt) — HTML renderizado no servidor.
 * Listagem em /carros-usados?p=N. Cada cartão liga a
 * /carro-usado/{id24hex}/{slug} e traz marca/modelo (no slug), ano, km,
 * combustível e preço.
 */

const BASE = "https://auto.sapo.pt/carros-usados";
// links de detalhe (o link da imagem é /carro-usado/{id}/search/... → ignoramos slug "search")
const LINK_RE = /\/carro-usado\/([0-9a-f]{24})\/([a-z0-9-]+)/g;

// marcas conhecidas (multi-palavra primeiro, para dividir o slug marca-modelo)
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

function brandModelFromSlug(slug: string): {
  brand: string | null;
  model: string | null;
} {
  for (const b of BRANDS) {
    if (slug === b || slug.startsWith(`${b}-`)) {
      const brand = b
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("-");
      const rest = slug
        .slice(b.length + 1)
        .replace(/-/g, " ")
        .trim();
      // modelo = 1-2 primeiras palavras do resto
      const model = rest ? rest.split(" ").slice(0, 2).join(" ") : null;
      return { brand, model };
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
  if (/\bgpl\b|\blpg\b/i.test(text)) return "GPL";
  return null;
}

interface SapoCursor {
  page: number;
  totalPages: number | null;
}

function parseCard(
  html: string,
  atIndex: number,
  id: string,
  slug: string
): Listing | null {
  const chunk = html.slice(Math.max(0, atIndex - 300), atIndex + 1400);
  const text = stripTags(chunk);

  const priceMatch = text.match(/([\d]{1,3}(?:[.\s]\d{3})*)\s*€/);
  const kmMatch = text.match(/([\d]{1,3}(?:[.\s]\d{3})*|\d+)\s*km/i);
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const powerMatch = text.match(/(\d{2,4})\s*cv/i);

  const { brand, model } = brandModelFromSlug(slug);
  const title =
    [brand, model].filter(Boolean).join(" ") || slug.replace(/-/g, " ");

  if (!priceMatch && !yearMatch) return null;

  return {
    source: "AUTOSAPO",
    externalId: id,
    url: `https://auto.sapo.pt/carro-usado/${id}/${slug}`,
    title,
    brand,
    model,
    year: yearMatch ? intFrom(yearMatch[0]) : null,
    km: kmMatch ? intFrom(kmMatch[1]) : null,
    fuel: fuelFrom(text),
    gearbox: null,
    power: powerMatch ? intFrom(powerMatch[1]) : null,
    displacement: null,
    price: priceMatch ? intFrom(priceMatch[1]) : null,
    location: null,
    sellerType: null,
    sellerName: null,
    imageUrls: [`https://auto.sapo.pt/carro-usado/${id}/search/${slug}-0.jpg`],
  };
}

export const autosapo: SiteAdapter = {
  name: "AUTOSAPO",
  async scrapePage(cursorRaw: unknown): Promise<PageResult> {
    const cursor: SapoCursor = (cursorRaw as SapoCursor) ?? {
      page: 1,
      totalPages: null,
    };
    const url = cursor.page <= 1 ? BASE : `${BASE}?p=${cursor.page}`;
    const html = await fetchText(url);

    let totalPages = cursor.totalPages;
    if (totalPages == null) {
      const m =
        html.match(/de\s+([\d.]+)\s*viaturas/i) ||
        html.match(/de\s+([\d.]+)\s*\/\s*[\d.]+/i);
      // total de páginas: nº de viaturas / ~20 por página (fallback grande)
      const totalCars = m ? intFrom(m[1]) : null;
      totalPages = totalCars ? Math.ceil(totalCars / 20) : null;
    }

    const seen = new Set<string>();
    const items: Listing[] = [];
    LINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = LINK_RE.exec(html)) !== null) {
      const [, id, slug] = m;
      if (slug === "search" || seen.has(id)) continue;
      seen.add(id);
      const listing = parseCard(html, m.index, id, slug);
      if (listing) items.push(listing);
    }

    const finished =
      items.length === 0 || (totalPages != null && cursor.page >= totalPages);
    return {
      items,
      nextCursor: finished ? null : { page: cursor.page + 1, totalPages },
    };
  },
};
