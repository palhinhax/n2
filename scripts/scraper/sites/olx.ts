import { fetchText } from "../http";
import { intFrom, stripTags } from "../parse";
import type { Listing, PageResult, SiteAdapter } from "../types";

/**
 * OLX.pt — a API JSON interna deixou de devolver resultados, por isso lemos
 * o HTML da listagem (renderizado no servidor). Paginação em ?page=N.
 *
 * Cobertura: o OLX trunca cada pesquisa a ~1000 resultados (~25 páginas),
 * por isso:
 *  1. a lista de marcas é descoberta dinamicamente na própria página da
 *     categoria (inclui slugs não óbvios como `volkswagen-vw` e marcas novas,
 *     mais o catch-all `other`);
 *  2. quando uma marca seca perto do limite, subdividimos por distrito
 *     (/carros/{marca}/{distrito}/) e percorremos cada um.
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

// Distritos/regiões que o OLX usa como sub-caminho de marca — servem para
// subdividir marcas que batem no limite de resultados, e também para excluir
// os links de distrito ao descobrir os slugs de marca na página da categoria.
const DISTRICT_SLUGS = [
  "aveiro",
  "beja",
  "braga",
  "braganca",
  "castelobranco",
  "coimbra",
  "evora",
  "faro",
  "guarda",
  "leiria",
  "lisboa",
  "portalegre",
  "porto",
  "santarem",
  "setubal",
  "vianadocastelo",
  "vilareal",
  "viseu",
  "acores-faial",
  "acores-flores",
  "acores-graciosa",
  "acores-pico",
  "acores-saojorge",
  "acores-saomiguel",
  "acores-terceira",
  "madeira-madeira",
];
const DISTRICT_SET = new Set(DISTRICT_SLUGS);

/** Uma "seed" é uma pesquisa a paginar: marca, opcionalmente restrita a um
 * distrito (quando a marca sozinha bate no limite de resultados do OLX). */
interface OlxSeed {
  slug: string;
  district?: string;
}

interface OlxCursor {
  seeds?: OlxSeed[]; // descobertas dinamicamente na 1.ª invocação
  idx: number;
  page: number;
}

/** O OLX trunca pesquisas a ~1000 resultados (~25 páginas de ~40). Se uma
 * marca secar já perto desse limite, assumimos truncatura e subdividimos. */
const CAP_SUSPECT_PAGES = 24;

// links de marca na página da categoria: /carros-motos-e-barcos/carros/{slug}/
const BRAND_LINK_RE = /\/carros-motos-e-barcos\/carros\/([a-z0-9-]+)\//g;

function discoverBrandSlugs(html: string): string[] {
  const slugs = new Set<string>();
  BRAND_LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BRAND_LINK_RE.exec(html)) !== null) {
    const slug = m[1];
    if (DISTRICT_SET.has(slug)) continue; // link de distrito, não de marca
    if (slug.startsWith("q-")) continue; // pesquisas rápidas ("q-bmw-320d")
    slugs.add(slug);
  }
  return Array.from(slugs).sort();
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
      // devolve o resto todo — o normalizador (lib/vehicle-normalize) separa
      // depois modelo vs. versão contra a lista de modelos conhecidos.
      return { brand: label, model: rest || null };
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

function listUrl(seed: OlxSeed, page: number): string {
  const base = seed.district
    ? `${BASE}/${seed.slug}/${seed.district}`
    : `${BASE}/${seed.slug}`;
  return page <= 1 ? `${base}/` : `${base}/?page=${page}`;
}

const MAX_PAGE = 100; // travão duro (o OLX nunca serve tantas páginas)

// ---------------------------------------------------------------------------
// JSON-LD: a página inclui um bloco schema.org com TODOS os anúncios (nome,
// preço, cidade, imagens) — só uma parte dos cartões vem renderizada no HTML,
// por isso o JSON-LD é a fonte principal e o HTML serve para enriquecer.
// ---------------------------------------------------------------------------

const LDJSON_RE =
  /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;

interface OlxOffer {
  name?: string;
  price?: number;
  url?: string;
  image?: string[] | string;
  areaServed?: { name?: string };
}

function collectOffers(node: unknown, out: OlxOffer[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectOffers(item, out);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj["@type"] === "Offer" && typeof obj.url === "string") {
      out.push(obj as OlxOffer);
      return;
    }
    for (const value of Object.values(obj)) collectOffers(value, out);
  }
}

function extractOffers(html: string): OlxOffer[] {
  const offers: OlxOffer[] = [];
  LDJSON_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LDJSON_RE.exec(html)) !== null) {
    try {
      collectOffers(JSON.parse(m[1]), offers);
    } catch {
      /* bloco JSON-LD inválido — ignora */
    }
  }
  return offers;
}

function yearFrom(text: string): number | null {
  const m = text.match(/\b(19[5-9]\d|20[0-4]\d)\b/);
  return m ? intFrom(m[0]) : null;
}

function kmFrom(text: string): number | null {
  const m = text.match(/(\d{1,3}(?:[.\s]\d{3})+|\d{4,7})\s*km/i);
  return m ? intFrom(m[1]) : null;
}

function normalizeImg(url: string): string {
  return url.replace(/^(https:\/\/[^/:]+):443\//, "$1/");
}

// ---------------------------------------------------------------------------
// __PRERENDERED_STATE__: o estado completo da app (window.__PRERENDERED_STATE__
// = "…json escapado…") traz TODOS os anúncios da página com parâmetros
// estruturados (ano, modelo, km, combustível, caixa, potência), preço,
// fotos, localização e vendedor — é a fonte principal.
// ---------------------------------------------------------------------------

interface OlxAdParam {
  key?: string;
  value?: string;
  normalizedValue?: string;
}

interface OlxAd {
  url?: string;
  title?: string;
  isBusiness?: boolean;
  price?: { regularPrice?: { value?: number } };
  params?: OlxAdParam[];
  photos?: string[];
  location?: { cityName?: string; regionName?: string; pathName?: string };
  user?: { name?: string };
}

function extractPrerenderedAds(html: string): OlxAd[] {
  const marker = html.indexOf("window.__PRERENDERED_STATE__");
  if (marker === -1) return [];
  const rest = html.slice(html.indexOf("=", marker) + 1).trimStart();
  if (!rest.startsWith('"')) return [];
  // fim da string JS (respeitando escapes)
  let end = 1;
  while (end < rest.length) {
    if (rest[end] === "\\") end += 2;
    else if (rest[end] === '"') break;
    else end++;
  }
  try {
    const state = JSON.parse(JSON.parse(rest.slice(0, end + 1))) as {
      listing?: { listing?: { ads?: OlxAd[] } };
    };
    const ads = state?.listing?.listing?.ads;
    return Array.isArray(ads) ? ads : [];
  } catch {
    return [];
  }
}

function adToListing(ad: OlxAd): Listing | null {
  const link = ad.url?.match(
    /\/d\/anuncio\/([a-z0-9-]+)-(ID[A-Za-z0-9]+)\.html/i
  );
  if (!link) return null;
  const [, slug, id] = link;

  const params: Record<string, { value?: string; norm?: string }> = {};
  for (const p of ad.params ?? []) {
    if (p?.key) params[p.key] = { value: p.value, norm: p.normalizedValue };
  }
  const norm = (key: string) => params[key]?.norm ?? params[key]?.value ?? null;
  const display = (key: string) =>
    params[key]?.value ?? params[key]?.norm ?? null;

  const { brand } = brandModelFromSlug(slug);
  const model = display("modelo");
  const loc = ad.location;

  return {
    source: "OLX",
    externalId: id,
    url: `https://www.olx.pt/d/anuncio/${slug}-${id}.html`,
    title: ad.title?.trim() || slug.replace(/-/g, " "),
    brand,
    // sem modelo estruturado, deixa o normalizador separar o resto do slug
    model: model ?? brandModelFromSlug(slug).model,
    year: intFrom(norm("year")),
    km: intFrom(norm("quilometros") ?? norm("mileage")),
    fuel: display("combustivel") ?? display("fuel_type"),
    gearbox: display("gearbox"),
    power: intFrom(norm("engine_power")),
    displacement: intFrom(norm("engine_capacity")),
    price: ad.price?.regularPrice?.value ?? null,
    location:
      loc?.pathName ||
      [loc?.cityName, loc?.regionName].filter(Boolean).join(", ") ||
      null,
    sellerType:
      ad.isBusiness == null
        ? null
        : ad.isBusiness
          ? "Profissional"
          : "Particular",
    sellerName: ad.user?.name ?? null,
    imageUrls: (ad.photos ?? []).map(normalizeImg),
  };
}

function parseCards(html: string): Listing[] {
  // 1) cartões renderizados no HTML (têm ano/km/combustível no texto)
  const htmlById = new Map<string, Listing>();
  LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(html)) !== null) {
    const [, slug, id] = m;
    if (htmlById.has(id)) continue;
    const listing = parseCard(html, m.index, slug, id);
    if (listing) htmlById.set(id, listing);
  }

  // 2) __PRERENDERED_STATE__ — fonte principal (dados completos)
  const out = new Map<string, Listing>();
  for (const ad of extractPrerenderedAds(html)) {
    const listing = adToListing(ad);
    if (listing && !out.has(listing.externalId))
      out.set(listing.externalId, listing);
  }

  // 3) JSON-LD (fallback: nome, preço, cidade, imagens)
  for (const offer of extractOffers(html)) {
    const link = offer.url?.match(
      /\/d\/anuncio\/([a-z0-9-]+)-(ID[A-Za-z0-9]+)\.html/i
    );
    if (!link) continue;
    const [, slug, id] = link;
    if (out.has(id)) continue;
    const base = htmlById.get(id);
    const name = offer.name?.trim() || null;
    const { brand, model } = brandModelFromSlug(slug);
    const images = (
      Array.isArray(offer.image)
        ? offer.image
        : offer.image
          ? [offer.image]
          : []
    ).map(normalizeImg);
    out.set(id, {
      source: "OLX",
      externalId: id,
      url: `https://www.olx.pt/d/anuncio/${slug}-${id}.html`,
      title: name ?? base?.title ?? slug.replace(/-/g, " "),
      brand,
      model,
      year: base?.year ?? (name ? yearFrom(name) : null),
      km: base?.km ?? (name ? kmFrom(name) : null),
      fuel: base?.fuel ?? fuelFrom(name ?? ""),
      gearbox: null,
      power: null,
      displacement: null,
      price:
        typeof offer.price === "number"
          ? Math.round(offer.price)
          : (base?.price ?? null),
      location: offer.areaServed?.name ?? null,
      sellerType: null,
      sellerName: null,
      imageUrls: images.length ? images : (base?.imageUrls ?? []),
    });
  }

  // 4) anúncios que só aparecem no HTML (fora do estado e do JSON-LD)
  for (const [id, listing] of Array.from(htmlById)) {
    if (!out.has(id)) out.set(id, listing);
  }
  return Array.from(out.values());
}

export const olx: SiteAdapter = {
  name: "OLX",
  async scrapePage(cursorRaw: unknown): Promise<PageResult> {
    const cursor = cursorRaw as OlxCursor | undefined;

    // 1.ª invocação (ou cursor de versão antiga, sem seeds): descobre as
    // marcas na página da categoria — que também é a listagem geral, por isso
    // aproveitamos logo os anúncios dela.
    if (!cursor?.seeds) {
      const html = await fetchText(`${BASE}/`);
      const seeds = discoverBrandSlugs(html).map((slug) => ({ slug }));
      if (seeds.length === 0)
        throw new Error(
          "[OLX] nenhuma marca descoberta na página da categoria — o layout mudou?"
        );
      console.log(`[OLX] ${seeds.length} marcas descobertas`);
      return {
        items: parseCards(html),
        nextCursor: { seeds, idx: 0, page: 1 },
      };
    }

    const seed = cursor.seeds[cursor.idx];
    const html = await fetchText(listUrl(seed, cursor.page));
    const items = parseCards(html);

    const pageExhausted = items.length === 0 || cursor.page >= MAX_PAGE;
    if (!pageExhausted) {
      return { items, nextCursor: { ...cursor, page: cursor.page + 1 } };
    }

    // seed esgotada — se secou perto do limite de resultados do OLX, o
    // universo desta pesquisa foi truncado: subdivide por distrito (uma vez).
    const seeds = cursor.seeds;
    let nextSeeds = seeds;
    if (cursor.page >= CAP_SUSPECT_PAGES) {
      if (!seed.district) {
        const subSeeds = DISTRICT_SLUGS.map((district) => ({
          slug: seed.slug,
          district,
        }));
        nextSeeds = [
          ...seeds.slice(0, cursor.idx + 1),
          ...subSeeds,
          ...seeds.slice(cursor.idx + 1),
        ];
        console.log(
          `[OLX] "${seed.slug}" truncado pelo limite de resultados — a subdividir por ${subSeeds.length} distritos`
        );
      } else {
        console.warn(
          `[OLX] "${seed.slug}/${seed.district}" também bate no limite de resultados — cauda inalcançável`
        );
      }
    }

    const nextIdx = cursor.idx + 1;
    return {
      items,
      nextCursor:
        nextIdx < nextSeeds.length
          ? { seeds: nextSeeds, idx: nextIdx, page: 1 }
          : null,
    };
  },
};
