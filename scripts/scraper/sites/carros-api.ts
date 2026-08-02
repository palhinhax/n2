import { fetchJson } from "../http";
import type { BackupListingSource, Listing, SiteAdapter } from "../types";

const BASE =
  process.env.CARROS_API_BASE_URL ??
  "https://n2-py-scraper-production.up.railway.app";
const API_KEY = process.env.CARROS_API_KEY?.trim();

const pageSizeEnv = Number(process.env.CARROS_API_PAGE_SIZE ?? 200);
const PAGE_SIZE = Number.isFinite(pageSizeEnv)
  ? Math.min(200, Math.max(1, pageSizeEnv))
  : 200;

const SOURCE_MAP: Record<string, BackupListingSource> = {
  olx: "API_OLX",
  standvirtual: "API_STANDVIRTUAL",
  piscapisca: "API_PISCAPISCA",
  autosapo: "API_AUTOSAPO",
};

const FUEL_LABEL: Record<string, string> = {
  gasolina: "Gasolina",
  diesel: "Diesel",
  eletrico: "Elétrico",
  hibrido: "Híbrido",
  hibrido_plugin: "Híbrido Plug-In",
  gpl: "GPL",
  gnc: "GNC",
  outro: "Outro",
};

const GEARBOX_LABEL: Record<string, string> = {
  manual: "Manual",
  automatica: "Automática",
};

const SELLER_LABEL: Record<string, string> = {
  dealer: "Profissional",
  private: "Particular",
};

interface ApiListing {
  id: number;
  source?: string | null;
  source_id?: string | null;
  url?: string | null;
  title?: string | null;
  make?: string | null;
  model?: string | null;
  version?: string | null;
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
  first_seen_at?: string | null;
  listed_at?: string | null;
}

interface ApiResponse {
  total: number;
  page: number;
  page_size: number;
  items: ApiListing[];
}

function text(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function int(v: unknown): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
}

function money(v: unknown): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function date(v: unknown): Date | null {
  const s = text(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function label(map: Record<string, string>, v: unknown): string | null {
  const key = text(v)?.toLowerCase();
  if (!key) return null;
  return map[key] ?? key;
}

function toListing(row: ApiListing): Listing | null {
  const apiSource = text(row.source)?.toLowerCase();
  const source = apiSource ? SOURCE_MAP[apiSource] : null;
  const url = text(row.url);
  if (!source || !url) return null;

  const title =
    text(row.title) ??
    [row.make, row.model, row.version].map(text).filter(Boolean).join(" ");
  if (!title) return null;

  const photo = text(row.photo_url);
  const location = [text(row.location_city), text(row.location_region)]
    .filter(Boolean)
    .join(", ");

  return {
    source,
    externalId: text(row.source_id) ?? String(row.id),
    url,
    title,
    brand: text(row.make),
    model: text(row.model),
    year: int(row.year),
    km: int(row.mileage_km),
    fuel: label(FUEL_LABEL, row.fuel),
    gearbox: label(GEARBOX_LABEL, row.gearbox),
    power: int(row.power_hp),
    displacement: int(row.engine_cc),
    price: money(row.price_eur),
    location: location || null,
    sellerType: label(SELLER_LABEL, row.seller_type),
    sellerName: text(row.seller_name),
    imageUrls: photo ? [photo] : [],
    description: text(row.description),
    firstSeenAt: date(row.first_seen_at) ?? date(row.listed_at),
  };
}

function pageFromCursor(cursor: unknown): number {
  if (typeof cursor === "number" && Number.isFinite(cursor)) return cursor;
  if (cursor && typeof cursor === "object" && "page" in cursor) {
    const n = Number((cursor as { page?: unknown }).page);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 1;
}

export const carrosApi: SiteAdapter = {
  name: "CARROS_API",

  async scrapePage(cursorRaw: unknown) {
    const page = pageFromCursor(cursorRaw);
    const url = new URL("/listings", BASE);
    url.searchParams.set("active", "true");
    url.searchParams.set("order", "last_seen");
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(PAGE_SIZE));

    const data = await fetchJson<ApiResponse>(
      url.toString(),
      API_KEY ? { "X-API-Key": API_KEY } : undefined
    );
    const items = (data.items ?? [])
      .map(toListing)
      .filter((item): item is Listing => item != null);

    const total = Number(data.total ?? 0);
    const nextCursor =
      page * PAGE_SIZE < total && data.items?.length
        ? { page: page + 1 }
        : null;

    return { items, nextCursor };
  },
};
