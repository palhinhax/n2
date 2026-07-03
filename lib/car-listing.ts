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

/** Match de combustível tolerante às variações entre sites. */
function fuelFilter(fuel: string) {
  if (/plug/i.test(fuel)) return { contains: "Plug", mode: "insensitive" };
  if (/el[ée]tric/i.test(fuel))
    return { contains: "létric", mode: "insensitive" };
  return { equals: fuel, mode: "insensitive" as const };
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
  const where: any = { forSale: true, status: "APPROVED" };
  if (q.marca) where.brand = { name: { in: aliasesFor(q.marca) } };
  if (q.modelo)
    where.model = { name: { equals: q.modelo, mode: "insensitive" } };
  if (q.precoMax) where.price = { lte: +q.precoMax };
  if (q.fuel) where.fuel = fuelFilter(q.fuel);
  if (q.caixa) where.gearbox = q.caixa;
  if (q.anoMin) where.year = { gte: +q.anoMin };
  if (q.kmMax) where.km = { lte: +q.kmMax };

  const whereExt: any = { active: true };
  if (q.marca) {
    whereExt.OR = aliasesFor(q.marca).map((a) => ({
      brand: { equals: a, mode: "insensitive" },
    }));
  }
  if (q.modelo) whereExt.model = { contains: q.modelo, mode: "insensitive" };
  if (q.precoMax) whereExt.price = { lte: +q.precoMax };
  if (q.fuel) whereExt.fuel = fuelFilter(q.fuel);
  if (q.caixa) whereExt.gearbox = q.caixa;
  if (q.anoMin) whereExt.year = { gte: +q.anoMin };
  if (q.kmMax) whereExt.km = { lte: +q.kmMax };

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
