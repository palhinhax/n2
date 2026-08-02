import { fetchJson } from "../http";
import { intFrom } from "../parse";
import type { ListingDetail } from "../detail";
import type { Listing, PageResult, SiteAdapter, Source } from "../types";

/**
 * API Carros PT (n2-py-scraper no Railway) — fonte SECUNDÁRIA de backup.
 * Agrega as mesmas 4 fontes que o nosso scraper; serve para apanhar anúncios
 * que nos escapem. Os itens vêm marcados com `origin: "api"`, e o
 * upsertListing garante que nunca sobrepõem dados apanhados por nós
 * (em caso de duplicado, os nossos dados mandam).
 *
 * Também expõe detalhe on-demand (POST /listings/detail, com BACKUP_API_KEY)
 * — usado como fallback quando o nosso fetch direto à origem falha.
 * Nunca chamamos o POST /scrape/run.
 */

const BASE =
  process.env.BACKUP_API_URL ??
  "https://n2-py-scraper-production.up.railway.app";
const PAGE_SIZE = 200;

const SOURCE_MAP: Record<string, Source> = {
  standvirtual: "STANDVIRTUAL",
  olx: "OLX",
  piscapisca: "PISCAPISCA",
  autosapo: "AUTOSAPO",
};

const FUEL_MAP: Record<string, string> = {
  gasolina: "Gasolina",
  diesel: "Diesel",
  eletrico: "Elétrico",
  hibrido: "Híbrido",
  hibrido_plugin: "Híbrido Plug-In",
  gpl: "GPL",
  gnc: "GNC",
};

const GEARBOX_MAP: Record<string, string> = {
  manual: "Manual",
  automatica: "Automática",
};

interface ApiItem {
  source?: string;
  source_id?: string;
  url?: string;
  title?: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  mileage_km?: number | null;
  fuel?: string | null;
  gearbox?: string | null;
  power_hp?: number | null;
  engine_cc?: number | null;
  price_eur?: number | null;
  location_city?: string | null;
  location_region?: string | null;
  seller_type?: string | null;
  seller_name?: string | null;
  photo_url?: string | null;
  description?: string | null;
}

interface ApiResponse {
  total?: number;
  page?: number;
  items?: ApiItem[];
}

interface ApiCursor {
  page: number;
}

function toListing(item: ApiItem): Listing | null {
  const source = SOURCE_MAP[item.source ?? ""];
  if (!source || !item.source_id || !item.url || !item.title) return null;

  return {
    source,
    externalId: item.source_id,
    url: item.url,
    title: item.title,
    brand: item.make ?? null,
    model: item.model ?? null,
    year: item.year ?? null,
    km: item.mileage_km ?? null,
    fuel: item.fuel ? (FUEL_MAP[item.fuel] ?? null) : null,
    gearbox: item.gearbox ? (GEARBOX_MAP[item.gearbox] ?? null) : null,
    power: item.power_hp ?? null,
    // a API traz por vezes cilindradas mal parseadas (ex.: 19953) — descarta
    displacement:
      item.engine_cc != null && item.engine_cc >= 500 && item.engine_cc <= 9000
        ? item.engine_cc
        : null,
    price: item.price_eur != null ? Math.round(item.price_eur) : null,
    location:
      [item.location_city, item.location_region].filter(Boolean).join(", ") ||
      null,
    sellerType:
      item.seller_type === "dealer"
        ? "Profissional"
        : item.seller_type === "private"
          ? "Particular"
          : null,
    sellerName: item.seller_name ?? null,
    imageUrls: item.photo_url ? [item.photo_url] : [],
    description: item.description ?? null,
    origin: "api",
  };
}

// ---------------------------------------------------------------------------
// Detalhe on-demand via API de backup (fallback do scripts/scraper/detail.ts)
// ---------------------------------------------------------------------------

/** Formatos observados no raw.detail da API:
 *  - Standvirtual: { details: {key:{label,value}}, equipment: [{label,values:[{label}]}], photos: [url], seller: {name,type} }
 *  - OLX:          { params: {key:{name,value}}, photos: [url] } (+ descrição no topo) */
interface ApiDetailResponse extends ApiItem {
  raw?: {
    detail?: {
      details?: Record<string, { label?: string; value?: unknown }>;
      params?: Record<string, { name?: string; value?: unknown }>;
      equipment?: {
        label?: string;
        key?: string;
        values?: { label?: string; key?: string }[];
      }[];
      photos?: unknown[];
      seller?: { name?: string; type?: string };
    };
  };
}

function normalizeDetailPhoto(u: string): string {
  return u
    .replace(/^(https:\/\/[^/:]+):443\//, "$1/")
    .replace(/;s=\d+x\d+.*$/, ";s=1280x0");
}

/** Primeiro inteiro numa string — "4-5" → 4 (intFrom daria 45). */
function firstInt(s: string | null): number | null {
  const m = String(s ?? "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/**
 * Pede o detalhe de um anúncio à API de backup. Devolve null se a chave não
 * estiver configurada, se a fonte/id não for suportado ou se a API falhar.
 * Para OLX a API exige o id interno numérico — só o temos em anúncios que
 * vieram dela própria (origin "api").
 */
export async function fetchDetailFromBackupApi(
  source: Source,
  listing: { url: string; externalId: string }
): Promise<ListingDetail | null> {
  const key = process.env.BACKUP_API_KEY;
  if (!key) return null;

  const body: Record<string, string> = { source: source.toLowerCase() };
  if (source === "OLX") {
    if (!/^\d+$/.test(listing.externalId)) return null;
    body.source_id = listing.externalId;
  } else {
    body.url = listing.url;
  }

  let item: ApiDetailResponse;
  try {
    const res = await fetch(`${BASE}/listings/detail`, {
      method: "POST",
      headers: { "X-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    item = (await res.json()) as ApiDetailResponse;
  } catch {
    return null;
  }

  const d = item.raw?.detail ?? {};
  const dict: Record<string, string> = {};
  for (const [k, v] of Object.entries(d.details ?? d.params ?? {})) {
    const value = v?.value;
    if (value != null && String(value).trim())
      dict[k.toLowerCase()] = String(value).trim();
  }
  const dv = (...keys: string[]): string | null => {
    for (const k of keys) if (dict[k]) return dict[k];
    return null;
  };

  const equipment = Array.isArray(d.equipment)
    ? d.equipment
        .map((g) => ({
          group: g?.label ?? g?.key ?? "Equipamento",
          items: (g?.values ?? [])
            .map((v) => v?.label ?? v?.key)
            .filter((x): x is string => Boolean(x)),
        }))
        .filter((g) => g.items.length > 0)
    : [];

  const photos = (Array.isArray(d.photos) ? d.photos : [])
    .filter((p): p is string => typeof p === "string")
    .map(normalizeDetailPhoto)
    .slice(0, 60);
  if (photos.length === 0 && item.photo_url) photos.push(item.photo_url);

  const year = item.year ?? intFrom(dv("year", "ano"));
  const regMonth = dv("first_registration_month");

  return {
    description: item.description ?? null,
    equipment,
    color: dv("color", "cor"),
    doors: firstInt(dv("door_count", "nr_doors", "portas")),
    seats: intFrom(dv("nr_seats", "lugares")),
    drivetrain: dv("transmission_type", "wheel_drive", "traccao"),
    bodyType: dv("body_type", "segmento"),
    condition: dv("new_used", "condicao", "condition"),
    registrationDate:
      dv("first_registration") ??
      (regMonth ? [regMonth, year].filter(Boolean).join(" ") : null),
    warranty: dv("warranty", "garantia"),
    co2: intFrom(dv("co2_emissions", "co2")),
    imageUrls: photos,
    gearbox:
      (item.gearbox ? (GEARBOX_MAP[item.gearbox] ?? null) : null) ??
      dv("gearbox", "caixa"),
    power: item.power_hp ?? intFrom(dv("engine_power", "potencia")),
    displacement:
      item.engine_cc != null && item.engine_cc >= 500 && item.engine_cc <= 9000
        ? item.engine_cc
        : intFrom(dv("engine_capacity", "cilindrada")),
    km: item.mileage_km ?? intFrom(dv("quilometros", "mileage")),
    fuel:
      (item.fuel ? (FUEL_MAP[item.fuel] ?? null) : null) ??
      dv("combustivel", "fuel_type"),
    year: year ?? null,
    location:
      [item.location_city, item.location_region].filter(Boolean).join(", ") ||
      null,
    sellerType:
      d.seller?.type === "PROFESSIONAL" || item.seller_type === "dealer"
        ? "Profissional"
        : d.seller?.type === "PRIVATE" || item.seller_type === "private"
          ? "Particular"
          : null,
    sellerName: d.seller?.name ?? item.seller_name ?? null,
  };
}

export const backupApi: SiteAdapter = {
  name: "API",
  async scrapePage(cursorRaw: unknown): Promise<PageResult> {
    const cursor: ApiCursor = (cursorRaw as ApiCursor) ?? { page: 1 };
    const res = await fetchJson<ApiResponse>(
      `${BASE}/listings?active=true&order=last_seen&page=${cursor.page}&page_size=${PAGE_SIZE}`
    );

    const items = (res.items ?? [])
      .map(toListing)
      .filter((x): x is Listing => x !== null);

    const total = res.total ?? 0;
    const finished = items.length === 0 || cursor.page * PAGE_SIZE >= total;
    return {
      items,
      nextCursor: finished ? null : { page: cursor.page + 1 },
    };
  },
};
