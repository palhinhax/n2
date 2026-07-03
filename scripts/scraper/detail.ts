import { fetchText } from "./http";
import { findDeep, intFrom, stripTags } from "./parse";
import type { Source } from "./types";

/**
 * Enriquecimento: vai à página de detalhe do anúncio na origem e extrai
 * descrição, equipamento, cor, portas, lugares, tracção, etc.
 *
 * Nota: NÃO recolhemos o contacto pessoal do vendedor (telefone/email).
 * Guardamos apenas as características do veículo e a descrição pública.
 */

export interface ListingDetail {
  description: string | null;
  equipment: { group: string; items: string[] }[];
  color: string | null;
  doors: number | null;
  seats: number | null;
  drivetrain: string | null;
  bodyType: string | null;
  condition: string | null;
  registrationDate: string | null;
  warranty: string | null;
  co2: number | null;
  imageUrls: string[]; // galeria completa (pode ser maior que a da listagem)
}

const EMPTY: ListingDetail = {
  description: null,
  equipment: [],
  color: null,
  doors: null,
  seats: null,
  drivetrain: null,
  bodyType: null,
  condition: null,
  registrationDate: null,
  warranty: null,
  co2: null,
  imageUrls: [],
};

// ---------------------------------------------------------------------------
// Standvirtual / OLX — páginas Next.js: o advert está no __NEXT_DATA__.
// ---------------------------------------------------------------------------

function parseNextData(html: string): unknown | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** Procura o objeto `advert` (Standvirtual) dentro do urqlState / __NEXT_DATA__. */
function findAdvert(nextData: unknown): any | null {
  const urql = findDeep(nextData, "urqlState") as
    Record<string, { data?: string }> | undefined;
  if (urql && typeof urql === "object") {
    for (const entry of Object.values(urql)) {
      if (!entry?.data || typeof entry.data !== "string") continue;
      try {
        const parsed = JSON.parse(entry.data);
        const advert =
          parsed?.advert ?? parsed?.advertReadById ?? parsed?.adDetails;
        if (advert && (advert.parameters || advert.details || advert.title)) {
          return advert;
        }
      } catch {
        /* ignora */
      }
    }
  }
  const advert = findDeep(nextData, "advert");
  return advert ?? null;
}

function paramMap(advert: any): Record<string, string> {
  const map: Record<string, string> = {};
  const params = advert?.parameters ?? advert?.details ?? [];
  for (const p of params) {
    const key = p?.key ?? p?.name ?? p?.label;
    const val = p?.displayValue ?? p?.value ?? p?.values?.[0]?.label;
    if (key) map[String(key).toLowerCase()] = String(val ?? "");
  }
  return map;
}

function pickMap(map: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    const v = map[k.toLowerCase()];
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function parseStandvirtualEquipment(advert: any): ListingDetail["equipment"] {
  const groups: ListingDetail["equipment"] = [];
  const eq = advert?.equipment ?? advert?.features ?? [];
  if (Array.isArray(eq)) {
    for (const g of eq) {
      const group = g?.label ?? g?.name ?? g?.key ?? "Equipamento";
      const items = (g?.values ?? g?.items ?? [])
        .map((it: any) => it?.label ?? it?.name ?? String(it))
        .filter(Boolean);
      if (items.length) groups.push({ group, items });
    }
  }
  return groups;
}

function collectPhotos(advert: any, html: string): string[] {
  const urls = new Set<string>();
  const photos = advert?.photos ?? advert?.images ?? [];
  if (Array.isArray(photos)) {
    for (const p of photos) {
      const u =
        p?.url ?? p?.big ?? p?.large ?? (typeof p === "string" ? p : null);
      if (u) urls.add(String(u).replace(/;s=\d+x\d+.*$/, ";s=1280x0"));
    }
  }
  if (urls.size === 0) {
    // fallback: apanha imagens da galeria no HTML renderizado
    const re = /https:\/\/ireland\.apollo\.olxcdn\.com\/v1\/files\/[^\s"')]+/g;
    for (const m of html.match(re) ?? []) {
      if (m.includes(";s=") && !m.includes("s=148x110")) {
        urls.add(m.replace(/;s=\d+x\d+.*$/, ";s=1280x0"));
      }
    }
  }
  return Array.from(urls).slice(0, 60);
}

function nextDataDetail(html: string): ListingDetail {
  const nd = parseNextData(html);
  const advert = nd ? findAdvert(nd) : null;

  if (!advert) return textFallbackDetail(html);

  const map = paramMap(advert);
  const descRaw = advert.description ?? advert.text ?? advert.body ?? "";
  const description = descRaw
    ? stripTags(String(descRaw))
    : textDescription(html);

  return {
    description: description || null,
    equipment: parseStandvirtualEquipment(advert),
    color: pickMap(map, ["color", "colour", "cor"]),
    doors: intFrom(
      pickMap(map, ["door_count", "nr_doors", "nº de portas", "portas"])
    ),
    seats: intFrom(pickMap(map, ["nr_seats", "seats", "lotação", "lotacao"])),
    drivetrain: pickMap(map, [
      "transmission_type",
      "wheel_drive",
      "tracção",
      "traccao",
    ]),
    bodyType: pickMap(map, [
      "body_type",
      "segmento",
      "carroçaria",
      "carroceria",
    ]),
    condition: pickMap(map, ["condition", "estado", "new_used", "condição"]),
    registrationDate: pickMap(map, [
      "first_registration",
      "registration",
      "data de registo",
    ]),
    warranty: pickMap(map, ["warranty", "garantia", "dealer_warranty"]),
    co2: intFrom(pickMap(map, ["co2_emissions", "co2", "emissões"])),
    imageUrls: collectPhotos(advert, html),
  };
}

// ---------------------------------------------------------------------------
// Fallback genérico baseado no texto renderizado (funciona nos 3 sites).
// ---------------------------------------------------------------------------

function textAfter(text: string, label: string, maxLen = 40): string | null {
  const re = new RegExp(
    label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+([^\\n]{1,60}?)\\s{2,}",
    "i"
  );
  const m = text.match(re);
  if (m) return m[1].trim().slice(0, maxLen);
  return null;
}

function textDescription(html: string): string | null {
  // heurística: apanha o parágrafo mais longo do corpo
  const text = stripTags(html);
  const chunks = text.split(/\s{3,}/).filter((s) => s.length > 120);
  chunks.sort((a, b) => b.length - a.length);
  return chunks[0]?.trim() ?? null;
}

function textFallbackDetail(html: string): ListingDetail {
  const text = stripTags(html).replace(/\n+/g, "  ");
  return {
    ...EMPTY,
    description: textDescription(html),
    color: textAfter(text, "Cor"),
    doors: intFrom(
      textAfter(text, "Nº de portas") ?? textAfter(text, "Portas")
    ),
    seats: intFrom(textAfter(text, "Lotação")),
    drivetrain: textAfter(text, "Tracção"),
    bodyType: textAfter(text, "Segmento") ?? textAfter(text, "Carroçaria"),
    condition: textAfter(text, "Condição"),
    warranty:
      textAfter(text, "Garantia de Stand") ?? textAfter(text, "Garantia"),
  };
}

// ---------------------------------------------------------------------------
// Piscapisca — SSR Angular; parsing por texto/HTML.
// ---------------------------------------------------------------------------

function piscapiscaDetail(html: string): ListingDetail {
  const base = textFallbackDetail(html);
  // equipamento: o Pisca lista features em <li> dentro de secções
  const equipment: ListingDetail["equipment"] = [];
  const featBlock = html.match(/Equipamento[\s\S]{0,8000}/i)?.[0] ?? "";
  const items = Array.from(
    featBlock.matchAll(/<li[^>]*>\s*([^<>{}]{3,40})\s*<\/li>/gi)
  )
    .map((m) => m[1].trim())
    .filter((s) => s && !/^\d+$/.test(s));
  if (items.length)
    equipment.push({ group: "Equipamento", items: items.slice(0, 60) });

  const imgs = Array.from(
    html.matchAll(
      /https:\/\/static\.piscapisca\.pt\/[^\s"')]+\.(?:jpg|jpeg|png|webp)/gi
    )
  ).map((m) => m[0].replace(/\/m_/, "/"));
  return {
    ...base,
    equipment,
    imageUrls: Array.from(new Set(imgs)).slice(0, 30),
  };
}

// ---------------------------------------------------------------------------

export async function fetchListingDetail(
  source: Source,
  url: string
): Promise<ListingDetail> {
  try {
    const html = await fetchText(url);
    if (source === "PISCAPISCA") return piscapiscaDetail(html);
    return nextDataDetail(html); // OLX + Standvirtual
  } catch (err) {
    console.error(`[detail:${source}] falha em ${url}:`, err);
    return EMPTY;
  }
}
