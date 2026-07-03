import { fetchJson } from "../http";
import { intFrom, pick } from "../parse";
import type { Listing, PageResult, SiteAdapter } from "../types";

/**
 * OLX.pt — usa a API JSON interna do site (a mesma que o frontend usa).
 * A API limita o offset a ~1000 resultados por pesquisa, por isso dividimos
 * o universo em bandas de preço até cada banda ter <= 1000 anúncios.
 */

const API = "https://www.olx.pt/api/v1/offers/";
const CATEGORY_CARROS = 5227;
const PAGE_SIZE = 40;
const MAX_OFFSET = 1000;
const MAX_PRICE = 1_000_000;

type Band = [number, number]; // [from, to] em EUR

interface OlxCursor {
  bands: Band[];
  bandIdx: number;
  offset: number;
}

interface OlxApiResponse {
  data?: OlxAd[];
  metadata?: { total_elements?: number };
}

interface OlxAd {
  id: number | string;
  url?: string;
  title?: string;
  business?: boolean;
  user?: { name?: string };
  location?: { city?: { name?: string }; region?: { name?: string } };
  photos?: { link?: string }[];
  params?: {
    key?: string;
    value?: { key?: string; label?: string; value?: unknown };
  }[];
}

function buildUrl(band: Band, offset: number, limit: number): string {
  const p = new URLSearchParams();
  p.set("offset", String(offset));
  p.set("limit", String(limit));
  p.set("category_id", String(CATEGORY_CARROS));
  p.set("filter_float_price:from", String(band[0]));
  p.set("filter_float_price:to", String(band[1]));
  p.set("sort_by", "created_at:desc");
  return `${API}?${p.toString()}`;
}

async function totalFor(band: Band): Promise<number> {
  const json = await fetchJson<OlxApiResponse>(buildUrl(band, 0, 1));
  return json.metadata?.total_elements ?? 0;
}

/** Divide [0, MAX_PRICE] em bandas com <= 1000 anúncios cada. */
async function computeBands(): Promise<Band[]> {
  const bands: Band[] = [];
  const queue: Band[] = [[0, MAX_PRICE]];
  while (queue.length > 0) {
    const band = queue.shift()!;
    const [from, to] = band;
    const total = await totalFor(band);
    if (total === 0) continue;
    if (total <= MAX_OFFSET || to - from <= 100) {
      bands.push(band);
    } else {
      const mid = Math.floor((from + to) / 2);
      queue.unshift([from, mid], [mid + 1, to]);
    }
  }
  console.log(`[OLX] ${bands.length} bandas de preço calculadas`);
  return bands;
}

function mapAd(ad: OlxAd): Listing | null {
  const externalId = ad.id != null ? String(ad.id) : null;
  const url = ad.url;
  if (!externalId || !url || !ad.title) return null;

  const params: Record<string, string> = {};
  let price: number | null = null;
  for (const p of ad.params ?? []) {
    if (!p?.key) continue;
    if (p.key === "price") {
      price = intFrom(
        (p.value as { value?: unknown })?.value ?? p.value?.label
      );
      continue;
    }
    params[p.key] = String(p.value?.label ?? p.value?.key ?? "");
  }

  const images = (ad.photos ?? [])
    .map((ph) => ph.link ?? "")
    .filter(Boolean)
    .map((link) => link.replace("{width}", "800").replace("{height}", "600"));

  const city = ad.location?.city?.name;
  const region = ad.location?.region?.name;

  return {
    source: "OLX",
    externalId,
    url,
    title: ad.title,
    brand: pick(params, ["carmake", "make", "marca"]),
    model: pick(params, ["carmodel", "model", "modelo"]),
    year: intFrom(
      pick(params, ["motor_year", "ano", "year", "first_registration_year"])
    ),
    km: intFrom(pick(params, ["mileage", "quilometros", "milage", "km"])),
    fuel: pick(params, [
      "petrol",
      "fuel",
      "combustivel",
      "motor_fuel",
      "fuel_type",
    ]),
    gearbox: pick(params, ["transmission", "caixa", "gearbox", "cars_gearbox"]),
    power: intFrom(
      pick(params, ["motor_power", "power", "potencia", "engine_power"])
    ),
    displacement: intFrom(
      pick(params, ["motor_engine_size", "cilindrada", "engine_capacity"])
    ),
    price,
    location: [city, region].filter(Boolean).join(", ") || null,
    sellerType:
      ad.business === true
        ? "Profissional"
        : ad.business === false
          ? "Particular"
          : null,
    sellerName: ad.user?.name ?? null,
    imageUrls: images,
  };
}

export const olx: SiteAdapter = {
  name: "OLX",
  async scrapePage(cursorRaw: unknown): Promise<PageResult> {
    let cursor = cursorRaw as OlxCursor | undefined;
    if (!cursor || !Array.isArray(cursor.bands) || cursor.bands.length === 0) {
      cursor = { bands: await computeBands(), bandIdx: 0, offset: 0 };
      if (cursor.bands.length === 0) return { items: [], nextCursor: null };
    }

    const band = cursor.bands[cursor.bandIdx];
    const json = await fetchJson<OlxApiResponse>(
      buildUrl(band, cursor.offset, PAGE_SIZE)
    );
    const ads = json.data ?? [];
    const items = ads.map(mapAd).filter((x): x is Listing => x !== null);

    const total = Math.min(json.metadata?.total_elements ?? 0, MAX_OFFSET);
    const nextOffset = cursor.offset + PAGE_SIZE;
    const bandDone = ads.length < PAGE_SIZE || nextOffset >= total;

    let nextCursor: OlxCursor | null;
    if (!bandDone) {
      nextCursor = { ...cursor, offset: nextOffset };
    } else if (cursor.bandIdx + 1 < cursor.bands.length) {
      nextCursor = { ...cursor, bandIdx: cursor.bandIdx + 1, offset: 0 };
    } else {
      nextCursor = null;
    }
    return { items, nextCursor };
  },
};
