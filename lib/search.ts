import { prisma } from "@/lib/prisma";
import { fetchListingPage } from "@/lib/car-listing";
import { slugify } from "@/lib/slug";

// Pesquisa "tipo Google": tolerante a erros de escrita. Faz matching por
// trigramas (coeficiente de Dice) contra o vocabulário de marcas/modelos, para
// que "ferrare 452" encontre Ferrari, "mgane" encontre Mégane, etc.

function bigrams(s: string): string[] {
  const t = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
  return out;
}

/** Semelhança 0..1 entre duas strings (Dice sobre bigramas). */
export function similarity(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.length || !B.length) return 0;
  const m = new Map<string, number>();
  for (const g of A) m.set(g, (m.get(g) || 0) + 1);
  let inter = 0;
  for (const g of B) {
    const c = m.get(g) || 0;
    if (c > 0) {
      inter++;
      m.set(g, c - 1);
    }
  }
  return (2 * inter) / (A.length + B.length);
}

// Pontuação de um termo do vocabulário face à pesquisa (melhor de: query
// completa, ou o melhor token individual — apanha "ferrari" em "ferrare 458").
function scoreTerm(term: string, q: string, tokens: string[]): number {
  let best = similarity(term, q);
  const tl = term.toLowerCase();
  // bónus forte para prefixo/substring (ex.: "golf" em "golf gti")
  if (tl.includes(q) || q.includes(tl)) best = Math.max(best, 0.82);
  for (const t of tokens) {
    best = Math.max(best, similarity(term, t));
    if (t.length >= 3 && (tl.startsWith(t) || tl.includes(t)))
      best = Math.max(best, 0.75);
  }
  return best;
}

type Vocab = { brands: string[]; models: { name: string; brand: string }[] };
let vocabCache: { data: Vocab; at: number } | null = null;
const VOCAB_TTL = 10 * 60 * 1000;

async function getVocab(): Promise<Vocab> {
  if (vocabCache && Date.now() - vocabCache.at < VOCAB_TTL)
    return vocabCache.data;
  const [brandRows, scrapedBrands, scrapedModels] = await Promise.all([
    prisma.brand.findMany({
      select: { name: true, models: { select: { name: true } } },
    }),
    prisma.scrapedListing.findMany({
      where: { active: true, brand: { not: null } },
      select: { brand: true },
      distinct: ["brand"],
    }),
    prisma.scrapedListing.findMany({
      where: { active: true, brand: { not: null }, model: { not: null } },
      select: { brand: true, model: true },
      distinct: ["brand", "model"],
      take: 4000,
    }),
  ]);
  const brandSet = new Map<string, string>();
  const models: { name: string; brand: string }[] = [];
  for (const b of brandRows) {
    brandSet.set(b.name.toLowerCase(), b.name);
    for (const m of b.models) models.push({ name: m.name, brand: b.name });
  }
  for (const r of scrapedBrands)
    if (r.brand) brandSet.set(r.brand.toLowerCase(), r.brand);
  const seenModel = new Set(
    models.map((m) => `${m.brand}|${m.name}`.toLowerCase())
  );
  for (const r of scrapedModels) {
    if (!r.brand || !r.model) continue;
    const key = `${r.brand}|${r.model}`.toLowerCase();
    if (!seenModel.has(key)) {
      seenModel.add(key);
      models.push({ name: r.model, brand: r.brand });
    }
  }
  const data: Vocab = { brands: Array.from(brandSet.values()), models };
  vocabCache = { data, at: Date.now() };
  return data;
}

export interface SearchResult {
  title: string;
  href: string;
  price: number | null;
  year: number | null;
  km: number | null;
  thumb: string | null;
  origem: string;
}
export interface SearchResponse {
  brand: string | null;
  model: string | null;
  brandHref: string | null;
  results: SearchResult[];
}

export async function searchSite(qRaw: string): Promise<SearchResponse> {
  const q = qRaw.trim().toLowerCase();
  if (q.length < 2)
    return { brand: null, model: null, brandHref: null, results: [] };
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  const vocab = await getVocab();

  // melhor marca
  let brand: string | null = null;
  let brandScore = 0;
  for (const b of vocab.brands) {
    const s = scoreTerm(b, q, tokens);
    if (s > brandScore) {
      brandScore = s;
      brand = b;
    }
  }
  if (brandScore < 0.45) brand = null;

  // melhor modelo (preferindo os da marca encontrada)
  let model: string | null = null;
  let modelScore = 0;
  for (const m of vocab.models) {
    if (brand && m.brand.toLowerCase() !== brand.toLowerCase()) continue;
    const s = scoreTerm(m.name, q, tokens);
    if (s > modelScore) {
      modelScore = s;
      model = m.name;
    }
  }
  if (modelScore < 0.5) model = null;

  // resultados concretos
  let results: SearchResult[] = [];
  if (brand) {
    const page = await fetchListingPage(
      { marca: brand, ...(model ? { modelo: model } : {}) },
      0,
      6
    );
    results = page.items.map(toResult);
  } else {
    // sem marca reconhecida: procura no título dos anúncios externos
    const longest = [...tokens].sort((a, b) => b.length - a.length)[0] ?? q;
    const rows = await prisma.scrapedListing.findMany({
      where: {
        active: true,
        isDuplicate: false,
        suspicious: false,
        title: { contains: longest, mode: "insensitive" },
      },
      orderBy: { firstSeenAt: "desc" },
      take: 6,
    });
    results = rows.map((l) => ({
      title: l.title,
      href: `/carros/externo/${l.id}`,
      price: l.price,
      year: l.year,
      km: l.km,
      thumb: firstImg(l.imageUrls),
      origem: l.source,
    }));
  }

  return {
    brand,
    model,
    brandHref: brand ? `/marcas/${slugify(brand)}` : null,
    results,
  };
}

function firstImg(imageUrls: string): string | null {
  try {
    return JSON.parse(imageUrls || "[]")[0] ?? null;
  } catch {
    return null;
  }
}

function toResult(it: {
  kind: "car" | "ext";
  id: string;
  data: any;
}): SearchResult {
  const d = it.data;
  const isCar = it.kind === "car";
  return {
    title: isCar ? `${d.brand?.name} ${d.model?.name}` : d.title,
    href: isCar ? `/carros/${it.id}` : `/carros/externo/${it.id}`,
    price: d.price ?? null,
    year: d.year ?? null,
    km: d.km ?? null,
    thumb: isCar ? (d.photos?.[0]?.url ?? null) : firstImg(d.imageUrls || "[]"),
    origem: isCar ? "Nacional 2" : d.source,
  };
}
