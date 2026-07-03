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
  // specs que também vivem na listagem — usados para preencher campos em falta
  // (sobretudo em anúncios OLX, que chegam pobres do cartão)
  gearbox: string | null;
  power: number | null;
  displacement: number | null;
  km: number | null;
  fuel: string | null;
  year: number | null;
  location: string | null;
  sellerType: string | null;
  sellerName: string | null;
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
  gearbox: null,
  power: null,
  displacement: null,
  km: null,
  fuel: null,
  year: null,
  location: null,
  sellerType: null,
  sellerName: null,
};

// ---------------------------------------------------------------------------
// JSON-LD (dados estruturados Schema.org) — presente em OLX, Standvirtual, etc.
// É a forma mais fiável de obter descrição e especificações limpas.
// ---------------------------------------------------------------------------

const JUNK_RE =
  /(pol[íi]tica de (privacidade|cookies)|direitos do consumidor|aceitar( todos)? os? cookies|iniciar sess[ãa]o|criar conta|todas as categorias|standvirtual|imovirtual|olx\.(bg|pl|ro|ua)|©\s*\d{4}|termos e condi)/i;

/** Verdadeiro se o texto parece um despejo de navegação/legal e não uma descrição. */
function looksLikeJunk(text: string): boolean {
  return JUNK_RE.test(text);
}

function parseJsonLd(html: string): any[] {
  const out: any[] = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const j = JSON.parse(m[1].trim());
      if (Array.isArray(j)) out.push(...j);
      else out.push(j);
    } catch {
      /* ignora blocos inválidos */
    }
  }
  return out;
}

function jsonLdVehicle(html: string): any | null {
  const nodes = parseJsonLd(html);
  const flat: any[] = [];
  for (const n of nodes) {
    if (!n || typeof n !== "object") continue;
    flat.push(n);
    if (Array.isArray(n["@graph"])) flat.push(...n["@graph"]);
    if (n.itemOffered) flat.push(n.itemOffered);
    if (n.mainEntity) flat.push(n.mainEntity);
  }
  const isVeh = (t: unknown) => {
    const s = Array.isArray(t) ? t.join(",") : String(t ?? "");
    return /Car|Vehicle|Product/i.test(s);
  };
  // preferimos um nó com specs de veículo; senão qualquer um com descrição
  return (
    flat.find(
      (o) =>
        o &&
        isVeh(o["@type"]) &&
        (o.vehicleTransmission || o.fuelType || o.mileageFromOdometer)
    ) ||
    flat.find((o) => o && isVeh(o["@type"])) ||
    null
  );
}

/** Lê um número de um QuantitativeValue do Schema.org (ou string simples). */
function qv(x: any): number | null {
  if (x == null) return null;
  if (typeof x === "object")
    return intFrom(String(x.value ?? x["@value"] ?? x.minValue ?? ""));
  return intFrom(String(x));
}
function txt(x: any): string | null {
  if (x == null) return null;
  if (typeof x === "object")
    return (x.name ?? x.value ?? null) as string | null;
  const s = String(x).trim();
  return s || null;
}

function jsonLdDetail(html: string): Partial<ListingDetail> {
  const v = jsonLdVehicle(html);
  if (!v) return {};
  const descRaw =
    typeof v.description === "string" ? stripTags(v.description) : "";
  const description =
    descRaw && !looksLikeJunk(descRaw) ? descRaw.trim() : null;
  return {
    description,
    color: txt(v.color),
    doors: qv(v.numberOfDoors),
    seats: qv(v.vehicleSeatingCapacity ?? v.seatingCapacity),
    bodyType: txt(v.bodyType),
    fuel: txt(v.fuelType),
    gearbox: txt(v.vehicleTransmission),
    power: qv(v.vehicleEngine?.enginePower ?? v.vehicleEngine?.power),
    displacement: qv(
      v.vehicleEngine?.engineDisplacement ?? v.vehicleEngine?.displacement
    ),
    km: qv(v.mileageFromOdometer),
    co2: qv(v.emissionsCO2),
    year: qv(
      v.vehicleModelDate ?? v.productionDate ?? v.dateVehicleFirstRegistered
    ),
  };
}

// ---------------------------------------------------------------------------
// OLX — o anúncio NÃO vem em __NEXT_DATA__: vem em window.__PRERENDERED_STATE__,
// uma string JSON duplamente codificada com o objeto `ad` completo (params
// estruturados, fotos, localização, vendedor). É a fonte mais fiável no OLX.
// ---------------------------------------------------------------------------

/** Normaliza URL de foto do CDN do OLX: remove a porta explícita (:443) e
 *  pede um tamanho grande fixo (;s=1280x0). */
function normalizePhotoUrl(u: string): string {
  return String(u)
    .replace(/^(https:\/\/[^/:]+):443\//, "$1/")
    .replace(/;s=\d+x\d+.*$/, ";s=1280x0");
}

function parsePrerenderedAd(html: string): any | null {
  const m = html.match(/__PRERENDERED_STATE__\s*=\s*("(?:[^"\\]|\\.)*")/);
  if (!m) return null;
  try {
    const state = JSON.parse(JSON.parse(m[1]));
    return state?.ad?.ad ?? null;
  } catch {
    return null;
  }
}

/** Primeiro inteiro numa string — "4-5" → 4 (intFrom daria 45). */
function firstInt(s: string | null): number | null {
  const m = String(s ?? "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/** Ano plausível no título ("dacia duster 2016") — último recurso quando o
 *  vendedor não preencheu o parâmetro. */
function yearFromTitle(title: unknown): number | null {
  const m = String(title ?? "").match(/\b(19[5-9]\d|20[0-4]\d)\b/);
  return m ? parseInt(m[0], 10) : null;
}

/** Como stripTags, mas preserva quebras de linha (<br>, </p>) — para descrições. */
function stripTagsKeepBreaks(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .trim();
}

function olxPrerenderedDetail(ad: any): ListingDetail {
  // params: [{ key, name, value, normalizedValue }] — o normalizedValue já vem
  // limpo ("168.000 km" → "168000"), preferimo-lo para números.
  const byKey: Record<string, { value: string; norm: string }> = {};
  for (const p of ad?.params ?? []) {
    if (!p?.key) continue;
    byKey[String(p.key).toLowerCase()] = {
      value: String(p.value ?? ""),
      norm: String(p.normalizedValue ?? p.value ?? ""),
    };
  }
  const val = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = byKey[k]?.value?.trim();
      if (v) return v;
    }
    return null;
  };
  const num = (...keys: string[]): number | null => {
    for (const k of keys) {
      const e = byKey[k];
      const n = intFrom(e?.norm || e?.value);
      if (n != null) return n;
    }
    return null;
  };

  const descRaw = ad?.description
    ? stripTagsKeepBreaks(String(ad.description))
    : "";
  const year = num("year", "ano") ?? yearFromTitle(ad?.title);
  const regMonth = val("first_registration_month");

  const photos: string[] = Array.isArray(ad?.photos)
    ? ad.photos
        .filter((p: unknown): p is string => typeof p === "string")
        .map(normalizePhotoUrl)
    : [];

  const loc = ad?.location;
  const location =
    loc?.pathName ??
    ([loc?.regionName, loc?.cityName].filter(Boolean).join(", ") || null);

  return {
    description: descRaw && !looksLikeJunk(descRaw) ? descRaw : null,
    equipment: [],
    color: val("color", "cor"),
    doors: firstInt(val("portas", "door_count", "nr_doors")),
    seats: num("nr_seats", "lugares"),
    drivetrain: val("traccao", "wheel_drive", "transmission_type"),
    bodyType: val("body_type", "segmento"),
    condition: val("condicao", "condition", "estado"),
    registrationDate: regMonth
      ? [regMonth, year].filter(Boolean).join(" ")
      : null,
    warranty: val("warranty", "garantia"),
    co2: num("co2", "co2_emissions"),
    imageUrls: photos.slice(0, 60),
    gearbox: val("gearbox", "caixa"),
    power: num("engine_power", "potencia"),
    displacement: num("engine_capacity", "cilindrada"),
    km: num("quilometros", "mileage"),
    fuel: val("combustivel", "fuel_type"),
    year,
    location,
    sellerType:
      typeof ad?.isBusiness === "boolean"
        ? ad.isBusiness
          ? "Profissional"
          : "Particular"
        : null,
    sellerName: ad?.user?.name ?? null,
  };
}

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
    // (o OLX serve os URLs com porta explícita — ireland.apollo.olxcdn.com:443)
    const re =
      /https:\/\/ireland\.apollo\.olxcdn\.com(?::\d+)?\/v1\/files\/[^\s"')]+/g;
    for (const m of html.match(re) ?? []) {
      if (m.includes(";s=") && !m.includes("s=148x110")) {
        urls.add(normalizePhotoUrl(m));
      }
    }
  }
  return Array.from(urls).slice(0, 60);
}

function nextDataDetail(html: string): ListingDetail {
  const nd = parseNextData(html);
  const advert = nd ? findAdvert(nd) : null;
  const ld = jsonLdDetail(html);

  // sem advert estruturado → OLX guarda o anúncio no __PRERENDERED_STATE__
  if (!advert) {
    const olxAd = parsePrerenderedAd(html);
    if (olxAd) {
      const olx = olxPrerenderedDetail(olxAd);
      return {
        ...olx,
        description: olx.description ?? ld.description ?? null,
        imageUrls: olx.imageUrls.length
          ? olx.imageUrls
          : collectPhotos(null, html),
      };
    }
    // último recurso: JSON-LD + texto sanitizado
    const base = textFallbackDetail(html);
    return {
      ...base,
      description: ld.description ?? base.description,
      color: ld.color ?? base.color,
      doors: ld.doors ?? base.doors,
      seats: ld.seats ?? base.seats,
      bodyType: ld.bodyType ?? base.bodyType,
      co2: ld.co2 ?? base.co2,
      gearbox: ld.gearbox ?? null,
      power: ld.power ?? null,
      displacement: ld.displacement ?? null,
      km: ld.km ?? null,
      fuel: ld.fuel ?? null,
      year: ld.year ?? null,
      imageUrls: collectPhotos(null, html),
    };
  }

  const map = paramMap(advert);
  const descRaw = advert.description ?? advert.text ?? advert.body ?? "";
  const advDesc = descRaw ? stripTags(String(descRaw)) : "";
  const description =
    (advDesc && !looksLikeJunk(advDesc) ? advDesc.trim() : "") ||
    ld.description ||
    textDescription(html);

  return {
    description: description || null,
    equipment: parseStandvirtualEquipment(advert),
    color: pickMap(map, ["color", "colour", "cor"]) ?? ld.color ?? null,
    doors:
      intFrom(
        pickMap(map, ["door_count", "nr_doors", "nº de portas", "portas"])
      ) ??
      ld.doors ??
      null,
    seats:
      intFrom(pickMap(map, ["nr_seats", "seats", "lotação", "lotacao"])) ??
      ld.seats ??
      null,
    drivetrain: pickMap(map, [
      "transmission_type",
      "wheel_drive",
      "tracção",
      "traccao",
    ]),
    bodyType:
      pickMap(map, ["body_type", "segmento", "carroçaria", "carroceria"]) ??
      ld.bodyType ??
      null,
    condition: pickMap(map, ["condition", "estado", "new_used", "condição"]),
    registrationDate: pickMap(map, [
      "first_registration",
      "registration",
      "data de registo",
    ]),
    warranty: pickMap(map, ["warranty", "garantia", "dealer_warranty"]),
    co2:
      intFrom(pickMap(map, ["co2_emissions", "co2", "emissões"])) ??
      ld.co2 ??
      null,
    imageUrls: collectPhotos(advert, html),
    gearbox:
      pickMap(map, ["gearbox", "caixa", "transmission"]) ?? ld.gearbox ?? null,
    power:
      intFrom(pickMap(map, ["engine_power", "potência", "potencia"])) ??
      ld.power ??
      null,
    displacement:
      intFrom(pickMap(map, ["engine_capacity", "cilindrada"])) ??
      ld.displacement ??
      null,
    km:
      intFrom(pickMap(map, ["mileage", "quilómetros", "quilometros"])) ??
      ld.km ??
      null,
    fuel:
      pickMap(map, ["fuel_type", "combustível", "combustivel"]) ??
      ld.fuel ??
      null,
    year:
      intFrom(pickMap(map, ["year", "ano", "first_registration_year"])) ?? null,
    location: pickMap(map, ["city", "location", "localização", "localizacao"]),
    sellerType: pickMap(map, ["seller_type", "tipo de vendedor"]),
    sellerName: null,
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
  // heurística: apanha o parágrafo mais longo do corpo, DESCARTANDO blocos que
  // pareçam navegação/legal/cookies (o problema dos anúncios OLX) e os
  // demasiado longos (dumps da página inteira).
  const text = stripTags(html);
  const chunks = text
    .split(/\s{3,}/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 120 && s.length <= 1500 && !looksLikeJunk(s));
  chunks.sort((a, b) => b.length - a.length);
  return chunks[0] ?? null;
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
