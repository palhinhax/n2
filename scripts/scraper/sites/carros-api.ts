import { fetchJson } from "../http";
import { intFrom } from "../parse";
import type { ListingDetail } from "../detail";
import type {
  BackupListingSource,
  Listing,
  PortalSource,
  SiteAdapter,
  Source,
} from "../types";
import { primarySourceForBackup } from "../types";

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
    origin: "api",
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

function portalSource(
  source: Source | string,
  url: string
): PortalSource | null {
  const fromBackup = primarySourceForBackup(source);
  if (fromBackup) return fromBackup;
  if (
    source === "OLX" ||
    source === "STANDVIRTUAL" ||
    source === "PISCAPISCA" ||
    source === "AUTOSAPO"
  ) {
    return source;
  }
  try {
    const host = new URL(url).host.toLowerCase();
    if (host.includes("olx.")) return "OLX";
    if (host.includes("standvirtual.")) return "STANDVIRTUAL";
    if (host.includes("piscapisca.")) return "PISCAPISCA";
    if (host.includes("auto.sapo.")) return "AUTOSAPO";
  } catch {
    return null;
  }
  return null;
}

function normalizeDetailPhoto(u: string): string {
  return u
    .replace(/^(https:\/\/[^/:]+):443\//, "$1/")
    .replace(/;s=\d+x\d+.*$/, ";s=1280x0");
}

function firstInt(s: string | null): number | null {
  const m = String(s ?? "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export async function fetchDetailFromCarrosApi(
  source: Source | string,
  listing: { url: string; externalId: string }
): Promise<ListingDetail | null> {
  if (!API_KEY) return null;

  const canonicalSource = portalSource(source, listing.url);
  if (!canonicalSource) return null;

  const body: Record<string, string> = {
    source: canonicalSource.toLowerCase(),
  };
  if (canonicalSource === "OLX") {
    if (!/^\d+$/.test(listing.externalId)) return null;
    body.source_id = listing.externalId;
  } else {
    body.url = listing.url;
  }

  let item: ApiListing;
  try {
    const res = await fetch(new URL("/listings/detail", BASE), {
      method: "POST",
      headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    item = (await res.json()) as ApiListing;
  } catch {
    return null;
  }

  const d = item.raw?.detail ?? {};
  const dict: Record<string, string> = {};
  for (const [k, v] of Object.entries(d.details ?? d.params ?? {})) {
    const value = v?.value;
    if (value != null && String(value).trim()) {
      dict[k.toLowerCase()] = String(value).trim();
    }
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
  const fallbackPhoto = text(item.photo_url);
  if (photos.length === 0 && fallbackPhoto) photos.push(fallbackPhoto);

  const year = item.year ?? intFrom(dv("year", "ano"));
  const regMonth = dv("first_registration_month");

  return {
    description: text(item.description),
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
      (item.gearbox ? (GEARBOX_LABEL[item.gearbox] ?? null) : null) ??
      dv("gearbox", "caixa"),
    power: item.power_hp ?? intFrom(dv("engine_power", "potencia")),
    displacement:
      item.engine_cc != null && item.engine_cc >= 500 && item.engine_cc <= 9000
        ? item.engine_cc
        : intFrom(dv("engine_capacity", "cilindrada")),
    km: item.mileage_km ?? intFrom(dv("quilometros", "mileage")),
    fuel:
      (item.fuel ? (FUEL_LABEL[item.fuel] ?? null) : null) ??
      dv("combustivel", "fuel_type"),
    year: year ?? null,
    location:
      [text(item.location_city), text(item.location_region)]
        .filter(Boolean)
        .join(", ") || null,
    sellerType:
      d.seller?.type === "PROFESSIONAL" || item.seller_type === "dealer"
        ? "Profissional"
        : d.seller?.type === "PRIVATE" || item.seller_type === "private"
          ? "Particular"
          : null,
    sellerName: d.seller?.name ?? text(item.seller_name),
  };
}
