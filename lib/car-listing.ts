import { prisma } from "@/lib/prisma";

export interface ListingQuery {
  marca?: string;
  modelo?: string;
  precoMax?: string;
  fuel?: string;
  caixa?: string;
  anoMin?: string;
  kmMax?: string;
  ordenar?: string;
}

export type ListingItem =
  | { kind: "car"; id: string; data: any }
  | { kind: "ext"; id: string; data: any };

export interface ListingPage {
  items: ListingItem[];
  nextOffset: number | null;
}

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
  const where: any = { forSale: true, status: "APPROVED" };
  if (q.marca) where.brand = { name: { in: aliasesFor(q.marca) } };
  if (q.modelo)
    where.model = { name: { equals: q.modelo, mode: "insensitive" } };
  if (q.precoMax) where.price = { lte: +q.precoMax };
  if (q.fuel) applyFuel(where, q.fuel);
  if (q.caixa) where.gearbox = q.caixa;
  if (q.anoMin) where.year = { gte: +q.anoMin };
  if (q.kmMax) where.km = { lte: +q.kmMax };

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
  if (q.precoMax) whereExt.price = { lte: +q.precoMax };
  if (q.fuel) applyFuel(whereExt, q.fuel);
  if (q.caixa) whereExt.gearbox = q.caixa;
  if (q.anoMin) whereExt.year = { gte: +q.anoMin };
  if (q.kmMax) whereExt.km = { lte: +q.kmMax };

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

  // há mais? se alguma fonte devolveu o máximo pedido, há provavelmente mais
  const maybeMore =
    cars.length + external.length > offset + limit ||
    cars.length === need ||
    external.length === need;
  const nextOffset =
    maybeMore && pageItems.length === limit ? offset + limit : null;

  return { items: pageItems, nextOffset };
}
