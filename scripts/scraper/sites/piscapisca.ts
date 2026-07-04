import { fetchText } from "../http";
import { intFrom } from "../parse";
import type { Listing, PageResult, SiteAdapter } from "../types";

/**
 * PiscaPisca.pt — Angular com SSR. A listagem genérica /carros tem limite de
 * paginação, por isso percorremos marca a marca (/carros/{marca}?page=N).
 *
 * Em vez de raspar o HTML dos cartões, lemos o TransferState do Angular
 * (<script id="ssr-app-state" type="application/json">), que traz os anúncios
 * da página já estruturados (marca, modelo, versão, preço, km, stand, distrito)
 * e a paginação exata.
 *
 * Nota: o Cloudflare do site bloqueia o fetch do Node (fingerprint TLS) —
 * o fallback curl do http.ts trata disso de forma transparente.
 */

const ORIGIN = "https://www.piscapisca.pt";
const BASE = `${ORIGIN}/carros`;

// Slugs de marca conhecidos
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

// ---------------------------------------------------------------------------
// TransferState (ssr-app-state)
// ---------------------------------------------------------------------------

interface PpVehicle {
  id?: string;
  link?: string; // "/carros/usados/bmw-serie-1-120d-diesel/8ZQm9"
  thumbnail?: string;
  brand?: string;
  model?: string;
  serie?: string; // motorização/acabamento — ex. "120d, 190cv"
  prices?: { private?: number; professional?: number };
  year?: string;
  km?: string; // "208 971 km"
  kmsInValidation?: boolean; // km ainda por confirmar pelo próprio site
  fuel?: string;
  transmission?: string;
  powerCV?: string; // "190 cv"
  cylinderCapacity?: string; // "1995 cm3"
  stand?: string;
  seller?: string;
  standLocation?: { city?: string; county?: string; district?: string };
}

interface PpState {
  SEARCH_VEHICLES?: PpVehicle[];
  SEARCH_VEHICLES_HIGHLIGHT_PLUS?: PpVehicle[];
  SEARCH_VEHICLES_HIGHLIGHT_SEGMENT?: PpVehicle[];
  VEHICLES_PAGINATION?: { total_pages?: number; number?: number }; // number é 0-based
}

const STATE_RE =
  /<script id="ssr-app-state" type="application\/json"[^>]*>([\s\S]*?)<\/script>/;

/** Desfaz o escaping do TransferState do Angular. `&a;` tem de ser o último. */
function unescapeState(s: string): string {
  return s
    .replace(/&q;/g, '"')
    .replace(/&s;/g, "'")
    .replace(/&l;/g, "<")
    .replace(/&g;/g, ">")
    .replace(/&a;/g, "&");
}

function extractState(html: string): PpState {
  const m = STATE_RE.exec(html);
  if (!m) {
    throw new Error(
      "PiscaPisca: ssr-app-state não encontrado — o formato da página mudou?"
    );
  }
  return JSON.parse(unescapeState(m[1])) as PpState;
}

function toListing(v: PpVehicle): Listing | null {
  if (!v.id || !v.link) return null;
  const title = [v.brand, v.model, v.serie].filter(Boolean).join(" ").trim();
  if (!title) return null;

  const loc = v.standLocation;
  return {
    source: "PISCAPISCA",
    externalId: v.id,
    url: `${ORIGIN}${v.link}`,
    title,
    brand: v.brand ?? null,
    model: v.model ?? null,
    year: intFrom(v.year),
    // o próprio site marca alguns km como "em validação" — não os guardamos
    km: v.kmsInValidation ? null : intFrom(v.km),
    fuel: v.fuel ?? null,
    gearbox: v.transmission ?? null,
    power: intFrom(v.powerCV),
    displacement: intFrom(v.cylinderCapacity),
    price: v.prices?.private || v.prices?.professional || null,
    location:
      [loc?.county || loc?.city, loc?.district].filter(Boolean).join(", ") ||
      null,
    sellerType: v.stand ? "Profissional" : "Particular",
    sellerName: v.stand || v.seller || null,
    imageUrls: v.thumbnail ? [v.thumbnail] : [],
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
    const state = extractState(html);

    const seen = new Set<string>();
    const items: Listing[] = [];
    const pools = [
      state.SEARCH_VEHICLES,
      state.SEARCH_VEHICLES_HIGHLIGHT_PLUS,
      state.SEARCH_VEHICLES_HIGHLIGHT_SEGMENT,
    ];
    for (const pool of pools) {
      for (const v of pool ?? []) {
        if (!v.id || seen.has(v.id)) continue;
        seen.add(v.id);
        const listing = toListing(v);
        if (listing) items.push(listing);
      }
    }

    // paginação exata do próprio site; fallback para a heurística antiga
    const pag = state.VEHICLES_PAGINATION;
    const hasNextPage = pag
      ? (pag.number ?? cursor.page - 1) + 1 < (pag.total_pages ?? 0)
      : items.length > 0;

    let nextCursor: PpCursor | null;
    if (hasNextPage) {
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
