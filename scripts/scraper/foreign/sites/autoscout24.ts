// Adaptador AutoScout24 — marketplace pan-europeu (DE, FR, BE, NL, ES, IT,
// LU, AT). A mesma implementação serve todas as instâncias: o host vem do
// baseUrl da fonte (ex.: https://www.autoscout24.de).
//
// Estratégia: as páginas de listagem são Next.js e trazem os anúncios no JSON
// __NEXT_DATA__ — parsing defensivo porque o shape muda sem aviso.
//
// Conformidade: antes de cada pedido verificamos o robots.txt do host
// (assertAllowedByRobots). Se o site proibir o caminho, a fonte é abortada e
// o erro fica registado no painel de admin. Só extraímos dados públicos.

import { fetchText, politeDelay, sleep } from "../../http";
import { assertAllowedByRobots } from "../robots";
import { kwToCv } from "../normalize";
import type {
  ForeignAdapter,
  ForeignPageResult,
  ForeignRawListing,
  ForeignSourceConfig,
} from "../types";

const MAX_PAGES = Number(process.env.IMPORT_SCRAPE_MAX_PAGES ?? 20);
const PAGE_SIZE_HINT = 20;

interface Cursor {
  page: number;
}

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
};

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** Procura o array de anúncios dentro do __NEXT_DATA__, tolerante a mudanças. */
function findListingsArray(nextData: any): any[] {
  const candidates = [
    nextData?.props?.pageProps?.listings,
    nextData?.props?.pageProps?.searchResults?.listings,
    nextData?.props?.pageProps?.results?.listings,
  ];
  for (const c of candidates) if (Array.isArray(c) && c.length) return c;
  // fallback: procura em profundidade um array de objetos com id+vehicle
  const seen = new Set<any>();
  const stack = [nextData];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);
    if (
      Array.isArray(cur) &&
      cur.length &&
      cur.every((x) => x && typeof x === "object") &&
      cur[0].id != null &&
      (cur[0].vehicle || cur[0].make || cur[0].tracking)
    ) {
      return cur;
    }
    for (const v of Array.isArray(cur) ? cur : Object.values(cur)) {
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return [];
}

function parseListing(
  item: any,
  source: ForeignSourceConfig
): ForeignRawListing | null {
  const id = str(item.id) ?? str(item.guid);
  if (!id) return null;

  const vehicle = item.vehicle ?? {};
  const tracking = item.tracking ?? {};
  const location = item.location ?? {};
  const seller = item.seller ?? {};
  const priceObj = item.price ?? {};

  const brand = str(vehicle.make) ?? str(item.make) ?? str(tracking.make);
  const model = str(vehicle.model) ?? str(item.model) ?? str(tracking.model);
  const title =
    [brand, model, str(vehicle.modelVersionInput)].filter(Boolean).join(" ") ||
    str(item.title) ||
    "";
  if (!title) return null;

  const price =
    num(priceObj.priceRaw) ??
    num(priceObj.raw) ??
    num(tracking.price) ??
    num(item.priceRaw) ??
    num(typeof priceObj === "object" ? priceObj.value : priceObj);

  const km =
    num(tracking.mileage) ?? num(vehicle.mileageInKmRaw) ?? num(item.mileage);

  const firstRegistration =
    str(tracking.firstRegistration) ??
    str(vehicle.firstRegistrationDateRaw) ??
    str(item.firstRegistration);

  const powerKw = num(tracking.powerInKw) ?? num(vehicle.rawPowerInKw) ?? null;

  const urlPath = str(item.url) ?? `/anuncio/${id}`;
  const url = /^https?:/.test(urlPath)
    ? urlPath
    : source.baseUrl.replace(/\/$/, "") + urlPath;

  const images: string[] = [];
  for (const img of Array.isArray(item.images) ? item.images : []) {
    const u = typeof img === "string" ? img : str(img?.url);
    if (u) images.push(/^https?:/.test(u) ? u : `https:${u}`);
  }

  return {
    externalId: id,
    url,
    title,
    brand,
    model,
    version: str(vehicle.modelVersionInput),
    firstRegistration,
    km,
    price,
    currency: "EUR",
    fuel: str(tracking.fuelType) ?? str(vehicle.fuel) ?? str(item.fuel),
    gearbox:
      str(tracking.transmission) ??
      str(vehicle.transmissionType) ??
      str(item.gear),
    power: kwToCv(powerKw) ?? num(vehicle.rawPowerInHp),
    co2: num(vehicle.co2emissionInGramPerKm) ?? num(tracking.co2emission),
    emissionStandard: str(vehicle.emissionClass) ?? str(item.emissionClass),
    bodyType: str(tracking.bodyType) ?? str(vehicle.bodyType),
    region:
      [str(location.zip), str(location.city)].filter(Boolean).join(" ") ||
      str(location.countryCode),
    sellerType: str(seller.type) ?? str(tracking.sellerType),
    sellerName: str(seller.companyName) ?? null,
    imageUrls: images.slice(0, 12),
    description: null, // só listagem — detalhe fica para enriquecimento futuro
  };
}

export const autoscout24: ForeignAdapter = {
  name: "autoscout24",

  async scrapePage(
    source: ForeignSourceConfig,
    cursor: unknown
  ): Promise<ForeignPageResult> {
    const c: Cursor = (cursor as Cursor) ?? { page: 1 };
    const base = source.baseUrl.replace(/\/$/, "");
    const url =
      `${base}/lst?atype=C&damaged_listing=exclude&desc=1&sort=age` +
      `&page=${c.page}`;

    const { crawlDelayMs } = await assertAllowedByRobots(url);
    if (crawlDelayMs) await sleep(crawlDelayMs);
    else await politeDelay();

    const html = await fetchText(url);
    const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    if (!m) {
      throw new Error(
        `AutoScout24: __NEXT_DATA__ não encontrado em ${url} — layout mudou?`
      );
    }
    const nextData = JSON.parse(m[1]);
    const rawItems = findListingsArray(nextData);
    const items = rawItems
      .map((it) => parseListing(it, source))
      .filter((x): x is ForeignRawListing => x != null);

    const done =
      items.length < Math.min(PAGE_SIZE_HINT, 5) || c.page >= MAX_PAGES;

    return { items, nextCursor: done ? null : { page: c.page + 1 } };
  },
};
