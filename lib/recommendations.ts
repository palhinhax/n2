import { prisma } from "@/lib/prisma";
import type { ListingItem } from "@/lib/car-listing";

/**
 * Motor de recomendações da homepage.
 *
 * Abordagem: filtragem por conteúdo ("content-based") — aprende um perfil de
 * gosto por visitante a partir dos eventos (views, pesquisas, favoritos) e
 * pontua os anúncios ativos (carros do site + externos) pela proximidade a
 * esse perfil. Sinais mais recentes pesam mais (meia-vida de 14 dias).
 * Funciona sem login (cookie n2vid) e junta o histórico anónimo à conta
 * quando o utilizador está autenticado.
 */

// peso base por tipo de sinal
const KIND_WEIGHT: Record<string, number> = {
  FAVORITE: 5,
  VIEW: 3,
  SEARCH: 2,
};
const HALF_LIFE_DAYS = 14;
const MAX_EVENTS = 300;
// abaixo disto o perfil ainda não é fiável → mostramos populares/recentes
const MIN_PROFILE_STRENGTH = 4;

export interface TasteProfile {
  brands: Map<string, number>; // 0..1 (normalizado ao máximo)
  models: Map<string, number>; // chave "marca::modelo"
  fuels: Map<string, number>;
  gearboxes: Map<string, number>;
  priceCenter: number | null; // média ponderada em log-espaço
  priceSigma: number; // desvio em log-espaço (mín. 0.35)
  yearCenter: number | null;
  strength: number; // soma dos pesos decadentes
  topBrands: string[]; // nomes originais, por ordem de interesse
}

const canonKey = (name: string) => {
  const t = name.trim().toLowerCase();
  if (t === "vw" || t === "volkswagen") return "volkswagen";
  return t;
};

function decay(createdAt: Date, now: number): number {
  const ageDays = Math.max(0, (now - createdAt.getTime()) / 86_400_000);
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

interface Signal {
  kind: string;
  brand?: string | null;
  model?: string | null;
  fuel?: string | null;
  gearbox?: string | null;
  price?: number | null;
  year?: number | null;
  createdAt: Date;
}

export function buildTasteProfile(signals: Signal[]): TasteProfile {
  const now = Date.now();
  const brands = new Map<string, number>();
  const brandNames = new Map<string, string>(); // chave canónica → nome original
  const models = new Map<string, number>();
  const fuels = new Map<string, number>();
  const gearboxes = new Map<string, number>();
  let strength = 0;

  // preço em log-espaço (os preços de carros são log-distribuídos)
  let pSum = 0,
    pW = 0;
  let ySum = 0,
    yW = 0;
  const pSamples: { v: number; w: number }[] = [];

  const bump = (map: Map<string, number>, key: string, w: number) =>
    map.set(key, (map.get(key) ?? 0) + w);

  for (const s of signals) {
    const w = (KIND_WEIGHT[s.kind] ?? 1) * decay(s.createdAt, now);
    strength += w;

    if (s.brand) {
      const key = canonKey(s.brand);
      bump(brands, key, w);
      if (!brandNames.has(key)) brandNames.set(key, s.brand.trim());
      if (s.model) bump(models, `${key}::${s.model.trim().toLowerCase()}`, w);
    }
    if (s.fuel) bump(fuels, canonKey(s.fuel), w);
    if (s.gearbox) bump(gearboxes, canonKey(s.gearbox), w);

    // numa pesquisa, precoMax/anoMin são limites — aproximamos o alvo real
    let price = s.price ?? null;
    let year = s.year ?? null;
    if (s.kind === "SEARCH") {
      price = price != null ? Math.round(price * 0.8) : null;
      year = year != null ? year + 1 : null;
    }
    if (price != null && price > 0) {
      const lp = Math.log(price);
      pSum += lp * w;
      pW += w;
      pSamples.push({ v: lp, w });
    }
    if (year != null && year > 1950) {
      ySum += year * w;
      yW += w;
    }
  }

  const normalize = (map: Map<string, number>) => {
    const max = Math.max(0, ...Array.from(map.values()));
    if (max > 0) map.forEach((v, k) => map.set(k, v / max));
    return map;
  };

  const priceCenter = pW > 0 ? Math.exp(pSum / pW) : null;
  let priceSigma = 0.35;
  if (pW > 0 && pSamples.length > 1) {
    const mean = pSum / pW;
    const varSum = pSamples.reduce(
      (acc, s) => acc + s.w * (s.v - mean) * (s.v - mean),
      0
    );
    priceSigma = Math.max(0.35, Math.sqrt(varSum / pW));
  }

  const topBrands = Array.from(brands.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => brandNames.get(k) ?? k);

  return {
    brands: normalize(brands),
    models: normalize(models),
    fuels: normalize(fuels),
    gearboxes: normalize(gearboxes),
    priceCenter,
    priceSigma,
    yearCenter: yW > 0 ? ySum / yW : null,
    strength,
    topBrands,
  };
}

// ---------- candidatos ----------

interface Candidate {
  item: ListingItem;
  brand: string | null;
  model: string | null;
  fuel: string | null;
  gearbox: string | null;
  price: number | null;
  year: number | null;
  freshAt: Date;
  hasPhoto: boolean;
}

async function fetchCandidates(excludeOwnerId?: string): Promise<Candidate[]> {
  const [cars, external] = await Promise.all([
    prisma.car.findMany({
      where: {
        forSale: true,
        status: "APPROVED",
        ...(excludeOwnerId ? { ownerId: { not: excludeOwnerId } } : {}),
      },
      include: {
        brand: true,
        model: true,
        photos: { orderBy: { position: "asc" } },
        owner: true,
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.scrapedListing.findMany({
      where: { active: true, price: { not: null }, imageUrls: { not: "[]" } },
      orderBy: { firstSeenAt: "desc" },
      take: 400,
    }),
  ]);

  const candidates: Candidate[] = [];
  for (const c of cars) {
    candidates.push({
      item: { kind: "car", id: c.id, data: c },
      brand: c.brand?.name ?? null,
      model: c.model?.name ?? null,
      fuel: c.fuel,
      gearbox: c.gearbox,
      price: c.price,
      year: c.year,
      freshAt: c.createdAt,
      hasPhoto: c.photos.length > 0,
    });
  }
  for (const e of external) {
    candidates.push({
      item: { kind: "ext", id: e.id, data: e },
      brand: e.brand,
      model: e.model,
      fuel: e.fuel,
      gearbox: e.gearbox,
      price: e.price,
      year: e.year,
      freshAt: e.firstSeenAt,
      hasPhoto: e.imageUrls !== "[]",
    });
  }
  return candidates;
}

// ---------- scoring ----------

function scoreCandidate(c: Candidate, p: TasteProfile, now: number): number {
  const brandKey = c.brand ? canonKey(c.brand) : null;
  const brandAff = brandKey ? (p.brands.get(brandKey) ?? 0) : 0;
  const modelAff =
    brandKey && c.model
      ? (p.models.get(`${brandKey}::${c.model.trim().toLowerCase()}`) ?? 0)
      : 0;
  const fuelAff = c.fuel ? (p.fuels.get(canonKey(c.fuel)) ?? 0) : 0;
  const gearAff = c.gearbox ? (p.gearboxes.get(canonKey(c.gearbox)) ?? 0) : 0;

  let priceClose = 0;
  if (c.price != null && c.price > 0 && p.priceCenter != null) {
    const d = Math.log(c.price) - Math.log(p.priceCenter);
    priceClose = Math.exp(-(d * d) / (2 * p.priceSigma * p.priceSigma));
  }
  let yearClose = 0;
  if (c.year != null && p.yearCenter != null) {
    yearClose = Math.exp(-Math.abs(c.year - p.yearCenter) / 4);
  }

  const ageDays = Math.max(0, (now - c.freshAt.getTime()) / 86_400_000);
  const freshness = Math.exp(-ageDays / 14);

  return (
    3.0 * brandAff +
    2.0 * modelAff +
    1.5 * fuelAff +
    0.5 * gearAff +
    2.0 * priceClose +
    1.0 * yearClose +
    0.6 * freshness +
    (c.hasPhoto ? 0.3 : 0)
  );
}

/** Ordena por score com limite por marca/modelo, para a fila não ser monótona. */
function diversify(
  ranked: { c: Candidate; score: number }[],
  take: number,
  maxPerBrand = 3,
  maxPerModel = 2
): Candidate[] {
  const out: Candidate[] = [];
  const brandCount = new Map<string, number>();
  const modelCount = new Map<string, number>();
  const skipped: Candidate[] = [];

  for (const { c } of ranked) {
    if (out.length >= take) break;
    const bk = c.brand ? canonKey(c.brand) : `?${out.length}`;
    const mk = c.model
      ? `${bk}::${c.model.trim().toLowerCase()}`
      : `?${out.length}`;
    if (
      (brandCount.get(bk) ?? 0) >= maxPerBrand ||
      (modelCount.get(mk) ?? 0) >= maxPerModel
    ) {
      skipped.push(c);
      continue;
    }
    brandCount.set(bk, (brandCount.get(bk) ?? 0) + 1);
    modelCount.set(mk, (modelCount.get(mk) ?? 0) + 1);
    out.push(c);
  }
  // se a diversidade deixou buracos, preenche com os melhores ignorados
  for (const c of skipped) {
    if (out.length >= take) break;
    out.push(c);
  }
  return out;
}

// ---------- API principal ----------

export interface Recommendations {
  items: ListingItem[];
  personalized: boolean;
  topBrands: string[];
}

export async function getRecommendations(opts: {
  visitorId: string | null;
  userId?: string | null;
  take?: number;
}): Promise<Recommendations> {
  const take = opts.take ?? 8;
  const now = Date.now();

  const identity: any[] = [];
  if (opts.userId) identity.push({ userId: opts.userId });
  if (opts.visitorId) identity.push({ visitorId: opts.visitorId });

  const [events, favorites] = await Promise.all([
    identity.length
      ? prisma.browseEvent.findMany({
          where: { OR: identity },
          orderBy: { createdAt: "desc" },
          take: MAX_EVENTS,
        })
      : Promise.resolve([]),
    // favoritos da conta contam como sinal forte e duradouro
    opts.userId
      ? prisma.favorite.findMany({
          where: { userId: opts.userId },
          include: {
            car: { include: { brand: true, model: true } },
            listing: true,
          },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  const signals: Signal[] = events.map((e) => ({
    kind: e.kind,
    brand: e.brand,
    model: e.model,
    fuel: e.fuel,
    gearbox: e.gearbox,
    price: e.price,
    year: e.year,
    createdAt: e.createdAt,
  }));
  // o que já foi visto leva uma penalização leve no score — preferimos
  // mostrar semelhante-mas-novo a repetir o mesmo anúncio
  const seenCarIds = new Set<string>();
  const seenListingIds = new Set<string>();
  for (const e of events) {
    if (e.kind !== "VIEW") continue;
    if (e.carId) seenCarIds.add(e.carId);
    if (e.listingId) seenListingIds.add(e.listingId);
  }
  const favoritedCarIds = new Set<string>();
  const favoritedListingIds = new Set<string>();
  for (const f of favorites) {
    if (f.carId) favoritedCarIds.add(f.carId);
    if (f.listingId) favoritedListingIds.add(f.listingId);
    const src = f.car
      ? {
          brand: f.car.brand?.name,
          model: f.car.model?.name,
          fuel: f.car.fuel,
          gearbox: f.car.gearbox,
          price: f.car.price,
          year: f.car.year,
        }
      : f.listing
        ? {
            brand: f.listing.brand,
            model: f.listing.model,
            fuel: f.listing.fuel,
            gearbox: f.listing.gearbox,
            price: f.listing.price,
            year: f.listing.year,
          }
        : null;
    if (src) signals.push({ kind: "FAVORITE", createdAt: f.createdAt, ...src });
  }

  const profile = buildTasteProfile(signals);
  const personalized = profile.strength >= MIN_PROFILE_STRENGTH;

  const candidates = (await fetchCandidates(opts.userId ?? undefined)).filter(
    (c) =>
      // o que já está guardado não precisa de ser recomendado outra vez
      !(c.item.kind === "car" && favoritedCarIds.has(c.item.id)) &&
      !(c.item.kind === "ext" && favoritedListingIds.has(c.item.id))
  );

  const seenPenalty = (c: Candidate) =>
    (c.item.kind === "car" && seenCarIds.has(c.item.id)) ||
    (c.item.kind === "ext" && seenListingIds.has(c.item.id))
      ? 0.65
      : 1;

  let ranked: { c: Candidate; score: number }[];
  if (personalized) {
    ranked = candidates.map((c) => ({
      c,
      score: scoreCandidate(c, profile, now) * seenPenalty(c),
    }));
  } else {
    // arranque a frio: recentes, com foto e com preço — e variados
    ranked = candidates.map((c) => {
      const ageDays = Math.max(0, (now - c.freshAt.getTime()) / 86_400_000);
      const score =
        Math.exp(-ageDays / 10) +
        (c.hasPhoto ? 0.5 : 0) +
        (c.price != null ? 0.3 : 0) +
        // dá palco aos carros do site quando existem
        (c.item.kind === "car" ? 0.4 : 0);
      return { c, score };
    });
  }
  ranked.sort((a, b) => b.score - a.score);

  const picked = diversify(ranked, take);
  return {
    items: picked.map((c) => c.item),
    personalized,
    topBrands: personalized ? profile.topBrands : [],
  };
}

/** Anúncios mais recentes das duas fontes (para a fila "Acabados de chegar"). */
export async function getRecentListings(
  take: number,
  excludeKeys?: Set<string>
): Promise<ListingItem[]> {
  const candidates = await fetchCandidates();
  return candidates
    .filter((c) => c.hasPhoto || c.item.kind === "car")
    .filter((c) => !excludeKeys?.has(`${c.item.kind}-${c.item.id}`))
    .sort((a, b) => b.freshAt.getTime() - a.freshAt.getTime())
    .slice(0, take)
    .map((c) => c.item);
}

/** Total de anúncios públicos (site + externos ativos). */
export async function countAllForSale(): Promise<number> {
  const [cars, ext] = await Promise.all([
    prisma.car.count({ where: { forSale: true, status: "APPROVED" } }),
    prisma.scrapedListing.count({ where: { active: true } }),
  ]);
  return cars + ext;
}

// ---------- registo de eventos ----------

/** Cria um evento de navegação; nunca falha o pedido por causa do tracking. */
export async function recordEvent(data: {
  visitorId: string;
  userId?: string | null;
  kind: "VIEW" | "SEARCH" | "FAVORITE";
  carId?: string | null;
  listingId?: string | null;
  brand?: string | null;
  model?: string | null;
  fuel?: string | null;
  gearbox?: string | null;
  price?: number | null;
  year?: number | null;
  query?: string | null;
}) {
  try {
    await prisma.browseEvent.create({ data });
  } catch {
    // tracking é "best effort"
  }
}
