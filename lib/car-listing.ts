import { prisma } from "@/lib/prisma";
import { maxPriceForMonthly } from "@/lib/finance";
import { marketStatsBatch, mkKey, ratePrice } from "@/lib/price-intel";

export interface ListingQuery {
  marca?: string;
  modelo?: string;
  precoMax?: string;
  fuel?: string;
  caixa?: string;
  anoMin?: string;
  kmMax?: string;
  ordenar?: string;
  distrito?: string; // distrito/localização
  // filtros avançados
  carroceria?: string; // tipo de carroçaria (só anúncios externos)
  cor?: string; // cor (só anúncios externos)
  potMin?: string; // potência mínima (cv)
  lugares?: string; // nº de lugares (só anúncios externos)
  mensalMax?: string; // mensalidade máxima (€/mês)
}

export type ListingItem =
  | { kind: "car"; id: string; data: any }
  | { kind: "ext"; id: string; data: any };

export interface ListingPage {
  items: ListingItem[];
  nextOffset: number | null;
}

// Preço mínimo plausível para um carro. Abaixo disto quase de certeza é erro
// de parsing do site de origem (ex.: 56 €), anúncio de peças/acessórios, ou
// valor de entrada de leasing — não um carro à venda. Bloqueamos na listagem
// e na página de detalhe.
export const MIN_LISTING_PRICE = 300;

const CURRENT_YEAR = new Date().getFullYear();
// Sanitização de números vindos da query — valores inválidos são ignorados
// (não filtram nada) em vez de partir a pesquisa.
const posInt = (v?: string): number | null => {
  if (v == null || v === "") return null;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const validYear = (v?: string): number | null => {
  const n = posInt(v);
  if (n == null) return null;
  return n >= 1950 && n <= CURRENT_YEAR + 1 ? n : null;
};

const BRAND_ALIASES: Record<string, string[]> = {
  volkswagen: ["Volkswagen", "VW"],
  vw: ["Volkswagen", "VW"],
};
const aliasesFor = (name: string) =>
  BRAND_ALIASES[name.toLowerCase()] ?? [name];

/**
 * Aplica o filtro de combustível a um objeto `where`, tolerante às variações
 * entre sites (ex. "Híbrido (Gasolina)", "Hibrido a gasolina", "Plug-in Hybrid").
 * Muta `w.fuel` e, quando preciso, acrescenta exclusões via `w.NOT`.
 */
function applyFuel(w: any, fuel: string) {
  const not = (cond: any) => {
    w.NOT = [...(w.NOT ? (Array.isArray(w.NOT) ? w.NOT : [w.NOT]) : []), cond];
  };

  if (/plug/i.test(fuel)) {
    // plug-in híbrido — escrito de muitas formas
    w.OR = [
      ...(w.OR ?? []),
      { fuel: { contains: "plug", mode: "insensitive" } },
      { fuel: { contains: "phev", mode: "insensitive" } },
    ];
    return;
  }
  if (/el[ée]tric/i.test(fuel)) {
    w.fuel = { contains: "létric", mode: "insensitive" }; // létric(o)
    not({ fuel: { contains: "plug", mode: "insensitive" } });
    not({ fuel: { contains: "brido", mode: "insensitive" } });
    return;
  }
  if (/h[íi]brid/i.test(fuel)) {
    // híbrido "normal" (não plug-in)
    w.fuel = { contains: "brido", mode: "insensitive" };
    not({ fuel: { contains: "plug", mode: "insensitive" } });
    not({ fuel: { contains: "phev", mode: "insensitive" } });
    return;
  }
  if (/gasolina/i.test(fuel)) {
    // gasolina "pura" — exclui híbridos/plug-in que também dizem "gasolina"
    w.fuel = { contains: "gasolina", mode: "insensitive" };
    not({ fuel: { contains: "brido", mode: "insensitive" } });
    not({ fuel: { contains: "plug", mode: "insensitive" } });
    return;
  }
  if (/diesel|gas[oó]leo/i.test(fuel)) {
    w.fuel = { contains: "diesel", mode: "insensitive" };
    not({ fuel: { contains: "brido", mode: "insensitive" } });
    not({ fuel: { contains: "plug", mode: "insensitive" } });
    return;
  }
  if (/gpl/i.test(fuel)) {
    w.fuel = { contains: "gpl", mode: "insensitive" };
    return;
  }
  w.fuel = { equals: fuel, mode: "insensitive" };
}

const canonBrand = (name: string) => {
  const t = name.trim();
  if (["vw", "volkswagen"].includes(t.toLowerCase())) return "Volkswagen";
  return t;
};

/**
 * Lista de marcas/modelos para os filtros.
 * - normal: tabela Brand + todos os distintos do scraping.
 * - electric: apenas marcas/modelos que tenham carros elétricos.
 */
export async function fetchBrandOptions(opts: { electric?: boolean } = {}) {
  const electric = opts.electric === true;
  const fuelWhere = electric
    ? { fuel: { contains: "létric", mode: "insensitive" as const } }
    : {};

  const [brandTable, cars, scrapedBrands, scrapedModels] = await Promise.all([
    electric
      ? Promise.resolve([] as { name: string; models: { name: string }[] }[])
      : prisma.brand.findMany({
          orderBy: { name: "asc" },
          include: { models: { orderBy: { name: "asc" } } },
        }),
    electric
      ? prisma.car.findMany({
          where: { fuel: { contains: "létric", mode: "insensitive" } },
          select: {
            brand: { select: { name: true } },
            model: { select: { name: true } },
          },
        })
      : Promise.resolve([] as any[]),
    prisma.scrapedListing.findMany({
      where: { active: true, brand: { not: null }, ...fuelWhere },
      select: { brand: true },
      distinct: ["brand"],
    }),
    prisma.scrapedListing.findMany({
      where: {
        active: true,
        brand: { not: null },
        model: { not: null },
        ...fuelWhere,
      },
      select: { brand: true, model: true },
      distinct: ["brand", "model"],
    }),
  ]);

  const brandMap = new Map<string, { name: string; models: Set<string> }>();
  const addBrand = (name: string) => {
    const key = name.toLowerCase();
    let e = brandMap.get(key);
    if (!e) {
      e = { name, models: new Set<string>() };
      brandMap.set(key, e);
    }
    return e;
  };
  for (const b of brandTable) {
    const e = addBrand(b.name);
    for (const m of b.models) e.models.add(m.name);
  }
  for (const c of cars) {
    if (!c.brand?.name) continue;
    const e = addBrand(canonBrand(c.brand.name));
    if (c.model?.name) e.models.add(c.model.name);
  }
  for (const r of scrapedBrands) if (r.brand) addBrand(canonBrand(r.brand));
  for (const r of scrapedModels) {
    if (!r.brand) continue;
    const e = addBrand(canonBrand(r.brand));
    if (r.model) e.models.add(r.model);
  }
  return Array.from(brandMap.values())
    .map((b) => ({
      name: b.name,
      models: Array.from(b.models).sort((a, c) => a.localeCompare(c)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Constrói os filtros Prisma (carros do site + externos) a partir da query. */
export function buildWheres(q: ListingQuery): { where: any; whereExt: any } {
  const anoMin = validYear(q.anoMin);
  const kmMax = posInt(q.kmMax);
  const potMin = posInt(q.potMin);
  const lugares = posInt(q.lugares);

  // teto de preço: menor entre "preço até" e o equivalente a "mensalidade até"
  const precoMaxRaw = posInt(q.precoMax);
  const mensalMax = posInt(q.mensalMax);
  const priceCeils = [
    precoMaxRaw,
    mensalMax ? maxPriceForMonthly(mensalMax) : null,
  ].filter((n): n is number => n != null);
  const precoMax = priceCeils.length ? Math.min(...priceCeils) : null;

  // filtros que só existem nos anúncios externos — quando ativos, escondemos
  // os carros do site (não têm esses campos).
  const externalOnly = !!(q.carroceria || q.cor || lugares != null);

  const where: any = { forSale: true, status: "APPROVED" };
  if (externalOnly) where.id = "__hide_site_cars__";
  if (q.marca) where.brand = { name: { in: aliasesFor(q.marca) } };
  if (q.modelo)
    where.model = { name: { equals: q.modelo, mode: "insensitive" } };
  if (precoMax != null) where.price = { lte: precoMax };
  if (q.fuel) applyFuel(where, q.fuel);
  if (q.caixa) where.gearbox = q.caixa;
  if (anoMin != null) where.year = { gte: anoMin };
  if (kmMax != null) where.km = { lte: kmMax };
  if (potMin != null) where.power = { gte: potMin };
  if (q.distrito) where.district = { equals: q.distrito, mode: "insensitive" };

  const whereExt: any = { active: true, isDuplicate: false };
  // marca com aliases: como o filtro de combustível também usa OR, juntamos
  // as marcas num AND separado para não colidir.
  if (q.marca) {
    whereExt.AND = [
      {
        OR: aliasesFor(q.marca).map((a) => ({
          brand: { equals: a, mode: "insensitive" },
        })),
      },
    ];
  }
  if (q.modelo) whereExt.model = { contains: q.modelo, mode: "insensitive" };
  if (precoMax != null) whereExt.price = { lte: precoMax };
  if (q.fuel) applyFuel(whereExt, q.fuel);
  if (q.caixa) whereExt.gearbox = q.caixa;
  if (anoMin != null) whereExt.year = { gte: anoMin };
  if (kmMax != null) whereExt.km = { lte: kmMax };
  if (potMin != null) whereExt.power = { gte: potMin };
  if (q.carroceria)
    whereExt.bodyType = { contains: q.carroceria, mode: "insensitive" };
  if (q.cor) whereExt.color = { contains: q.cor, mode: "insensitive" };
  if (lugares != null) whereExt.seats = lugares;
  if (q.distrito)
    whereExt.location = { contains: q.distrito, mode: "insensitive" };

  // bloqueia preços absurdamente baixos (erros de parsing / peças). Deixa
  // passar os "sob consulta" (preço nulo).
  whereExt.AND = [
    ...(whereExt.AND ?? []),
    { OR: [{ price: null }, { price: { gte: MIN_LISTING_PRICE } }] },
  ];

  return { where, whereExt };
}

/** Conta quantos carros (site + externos) correspondem a uma pesquisa. */
export async function countListings(q: ListingQuery): Promise<number> {
  const { where, whereExt } = buildWheres(q);
  const [a, b] = await Promise.all([
    prisma.car.count({ where }),
    prisma.scrapedListing.count({ where: whereExt }),
  ]);
  return a + b;
}

/** Uma "página" da lista combinada (carros do site + anúncios externos). */
export async function fetchListingPage(
  q: ListingQuery,
  offset: number,
  limit: number
): Promise<ListingPage> {
  const ordenar = q.ordenar || "recentes";
  const orderBy: any =
    ordenar === "precoAsc"
      ? { price: "asc" }
      : ordenar === "precoDesc"
        ? { price: "desc" }
        : ordenar === "km"
          ? { km: "asc" }
          : { createdAt: "desc" };
  const orderByExt: any =
    ordenar === "precoAsc"
      ? { price: "asc" }
      : ordenar === "precoDesc"
        ? { price: "desc" }
        : ordenar === "km"
          ? { km: "asc" }
          : { firstSeenAt: "desc" };

  // ----- filtros (por nome, funciona para ambos) -----
  const { where, whereExt } = buildWheres(q);

  // para devolver [offset, offset+limit) da lista combinada e ordenada,
  // basta ir buscar os primeiros (offset+limit) de cada fonte e juntar.
  const need = offset + limit;
  const [cars, external] = await Promise.all([
    prisma.car.findMany({
      where,
      include: {
        brand: true,
        model: true,
        photos: { orderBy: { position: "asc" } },
        owner: true,
        _count: { select: { offers: true } },
      },
      orderBy,
      take: need,
    }),
    prisma.scrapedListing.findMany({
      where: whereExt,
      orderBy: orderByExt,
      take: need,
    }),
  ]);

  const priceKey = ordenar === "precoAsc" || ordenar === "precoDesc";
  const kmKey = ordenar === "km";
  const sortKeyCar = (c: any) =>
    priceKey
      ? (c.price ?? Number.MAX_SAFE_INTEGER)
      : kmKey
        ? c.km
        : -c.createdAt.getTime();
  const sortKeyExt = (e: any) =>
    priceKey
      ? (e.price ?? Number.MAX_SAFE_INTEGER)
      : kmKey
        ? (e.km ?? Number.MAX_SAFE_INTEGER)
        : -e.firstSeenAt.getTime();

  const merged = [
    ...cars.map((c) => ({
      kind: "car" as const,
      sortKey: sortKeyCar(c),
      id: c.id,
      data: c,
    })),
    ...external.map((e) => ({
      kind: "ext" as const,
      sortKey: sortKeyExt(e),
      id: e.id,
      data: e,
    })),
  ].sort((a, b) =>
    ordenar === "precoDesc" ? b.sortKey - a.sortKey : a.sortKey - b.sortKey
  );

  const pageItems = merged
    .slice(offset, offset + limit)
    .map(({ kind, id, data }) => ({ kind, id, data })) as ListingItem[];

  // classificação de preço (barato/justo/caro) para cada cartão — 1 query
  try {
    const keyOf = (it: ListingItem) =>
      it.kind === "car"
        ? { brand: it.data.brand?.name, model: it.data.model?.name }
        : { brand: it.data.brand, model: it.data.model };
    const keys = pageItems
      .map(keyOf)
      .filter(
        (k): k is { brand: string; model: string } => !!k.brand && !!k.model
      );
    if (keys.length) {
      const statsMap = await marketStatsBatch(keys);
      for (const it of pageItems) {
        const k = keyOf(it);
        const stats =
          k.brand && k.model ? statsMap.get(mkKey(k.brand, k.model)) : null;
        it.data._rating = ratePrice(it.data.price ?? null, stats ?? null);
      }
    }
  } catch {
    // se falhar, os cartões simplesmente não mostram a classificação
  }

  // há mais? se alguma fonte devolveu o máximo pedido, há provavelmente mais
  const maybeMore =
    cars.length + external.length > offset + limit ||
    cars.length === need ||
    external.length === need;
  const nextOffset =
    maybeMore && pageItems.length === limit ? offset + limit : null;

  return { items: pageItems, nextOffset };
}
