// Feed de anúncios estrangeiros ("Importar carros da Europa") — o equivalente
// ao lib/car-listing.ts para a tabela ForeignListing, com filtros próprios
// (país, CO₂, cilindrada, distância, custo total estimado, poupança, …).

import { prisma } from "@/lib/prisma";
import { MIN_LISTING_PRICE } from "@/lib/car-listing";
import { IMPORT_COUNTRIES } from "@/lib/import-countries";
import {
  estimateImportCost,
  getImportAssumptions,
  rateImportDeal,
} from "@/lib/import-cost";
import { marketStatsBatch, mkKey } from "@/lib/price-intel";

export interface ImportQuery {
  pais?: string; // ISO-2 (DE, FR, …)
  marca?: string;
  modelo?: string;
  anoMin?: string;
  precoMax?: string; // preço do carro (EUR)
  kmMax?: string;
  fuel?: string;
  caixa?: string;
  cilMax?: string; // cilindrada máx (cm3)
  co2Max?: string; // g/km
  potMin?: string; // cv
  carroceria?: string;
  distMax?: string; // distância máx. a Portugal (km)
  vendedor?: string; // Particular | Profissional
  totalMax?: string; // custo total estimado em PT (EUR)
  poupancaMin?: string; // poupança mínima face a PT (EUR)
  ordenar?: string; // recentes | precoAsc | precoDesc | km | totalAsc | poupanca
  q?: string;
}

export const IMPORT_QUERY_KEYS: (keyof ImportQuery)[] = [
  "pais",
  "marca",
  "modelo",
  "anoMin",
  "precoMax",
  "kmMax",
  "fuel",
  "caixa",
  "cilMax",
  "co2Max",
  "potMin",
  "carroceria",
  "distMax",
  "vendedor",
  "totalMax",
  "poupancaMin",
  "ordenar",
  "q",
];

export interface ImportPage {
  items: any[];
  nextOffset: number | null;
  total: number;
}

const posInt = (v?: string): number | null => {
  if (v == null || v === "") return null;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Constrói o `where` Prisma para a ForeignListing a partir da query. */
export function buildImportWhere(q: ImportQuery): any {
  const w: any = {
    active: true,
    status: "APPROVED",
    isDuplicate: false,
    suspicious: false,
    priceEur: { gte: MIN_LISTING_PRICE },
  };

  if (q.pais) w.country = q.pais.toUpperCase();

  // distância: filtra pelos países dentro do raio
  const distMax = posInt(q.distMax);
  if (distMax != null && !q.pais) {
    const codes = IMPORT_COUNTRIES.filter((c) => c.distanceKm <= distMax).map(
      (c) => c.code
    );
    w.country = { in: codes.length ? codes : ["__none__"] };
  }

  if (q.marca) w.brand = { equals: q.marca, mode: "insensitive" };
  if (q.modelo) w.model = { contains: q.modelo, mode: "insensitive" };

  const anoMin = posInt(q.anoMin);
  if (anoMin != null) w.year = { gte: anoMin };
  const precoMax = posInt(q.precoMax);
  if (precoMax != null) w.priceEur = { ...w.priceEur, lte: precoMax };
  const kmMax = posInt(q.kmMax);
  if (kmMax != null) w.km = { lte: kmMax };

  if (q.fuel) w.fuel = { contains: q.fuel, mode: "insensitive" };
  if (q.caixa) w.gearbox = { equals: q.caixa, mode: "insensitive" };

  const cilMax = posInt(q.cilMax);
  if (cilMax != null) w.displacement = { lte: cilMax };
  const co2Max = posInt(q.co2Max);
  if (co2Max != null) w.co2 = { lte: co2Max };
  const potMin = posInt(q.potMin);
  if (potMin != null) w.power = { gte: potMin };

  if (q.carroceria)
    w.bodyType = { contains: q.carroceria, mode: "insensitive" };
  if (q.vendedor) w.sellerType = { contains: q.vendedor, mode: "insensitive" };

  const totalMax = posInt(q.totalMax);
  if (totalMax != null) w.importTotalEur = { lte: totalMax, not: null };
  const poupancaMin = posInt(q.poupancaMin);
  if (poupancaMin != null) w.savingsEur = { gte: poupancaMin };

  const tokens = (q.q ?? "")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 5);
  if (tokens.length) {
    w.AND = tokens.map((t) => ({
      OR: [
        { title: { contains: t, mode: "insensitive" } },
        { brand: { contains: t, mode: "insensitive" } },
        { model: { contains: t, mode: "insensitive" } },
      ],
    }));
  }

  return w;
}

/** Uma página do feed de importação (tabela única, paginação simples). */
export async function fetchImportPage(
  q: ImportQuery,
  offset: number,
  limit: number
): Promise<ImportPage> {
  const where = buildImportWhere(q);
  const ordenar = q.ordenar || "recentes";
  const orderBy: any =
    ordenar === "precoAsc"
      ? { priceEur: "asc" }
      : ordenar === "precoDesc"
        ? { priceEur: "desc" }
        : ordenar === "km"
          ? { km: "asc" }
          : ordenar === "totalAsc"
            ? { importTotalEur: { sort: "asc", nulls: "last" } }
            : ordenar === "poupanca"
              ? { savingsEur: { sort: "desc", nulls: "last" } }
              : { firstSeenAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.foreignListing.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.foreignListing.count({ where }),
  ]);

  return {
    items,
    total,
    nextOffset: offset + items.length < total ? offset + limit : null,
  };
}

/** Marcas/modelos disponíveis nos anúncios estrangeiros (para os filtros). */
export async function fetchImportBrandOptions(country?: string) {
  const rows = await prisma.foreignListing.findMany({
    where: {
      active: true,
      status: "APPROVED",
      isDuplicate: false,
      suspicious: false,
      brand: { not: null },
      ...(country ? { country: country.toUpperCase() } : {}),
    },
    select: { brand: true, model: true },
    distinct: ["brand", "model"],
  });
  const map = new Map<string, { name: string; models: Set<string> }>();
  for (const r of rows) {
    if (!r.brand) continue;
    const key = r.brand.toLowerCase();
    let e = map.get(key);
    if (!e) {
      e = { name: r.brand, models: new Set() };
      map.set(key, e);
    }
    if (r.model) e.models.add(r.model);
  }
  return Array.from(map.values())
    .map((b) => ({
      name: b.name,
      models: Array.from(b.models).sort((a, c) => a.localeCompare(c)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Nº de anúncios ativos por país (para os chips/landing pages). */
export async function countByCountry(): Promise<Record<string, number>> {
  const rows = await prisma.foreignListing.groupBy({
    by: ["country"],
    where: {
      active: true,
      status: "APPROVED",
      isDuplicate: false,
      suspicious: false,
    },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.country] = r._count._all;
  return out;
}

// ---------------------------------------------------------------------------
// Recalcular custo/comparação com o mercado PT (colunas cacheadas)
// ---------------------------------------------------------------------------

/**
 * Recalcula, em lotes, o custo total de importação e a comparação com o
 * mercado português para anúncios estrangeiros ativos. Corre no fim de cada
 * ciclo de scraping e pode ser disparado pelo admin.
 */
export async function refreshImportComparisons(
  opts: {
    batchSize?: number;
    maxListings?: number;
    onlyMissing?: boolean; // só quem ainda não tem comparação
  } = {}
): Promise<{ processed: number }> {
  const batchSize = opts.batchSize ?? 200;
  const maxListings = opts.maxListings ?? 20_000;
  const a = await getImportAssumptions();

  let processed = 0;
  let cursor: string | null = null;

  while (processed < maxListings) {
    const batch: any[] = await prisma.foreignListing.findMany({
      where: {
        active: true,
        priceEur: { not: null },
        ...(opts.onlyMissing ? { dealRating: null } : {}),
      },
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;

    // estatísticas PT (mediana) para todos os marca+modelo do lote — 1 query
    const keys = batch
      .filter((l) => l.brand && l.model)
      .map((l) => ({ brand: l.brand as string, model: l.model as string }));
    const stats = await marketStatsBatch(keys);

    for (const l of batch) {
      const breakdown = estimateImportCost(
        {
          price: l.priceEur as number,
          currency: "EUR",
          country: l.country,
          fuel: l.fuel,
          year: l.year,
          firstRegistration: l.firstRegistration,
          displacement: l.displacement,
          power: l.power,
          co2: l.co2,
        },
        a
      );
      const st = l.brand && l.model ? stats.get(mkKey(l.brand, l.model)) : null;
      const deal = rateImportDeal(breakdown.totalEur, st?.median ?? null);

      await prisma.foreignListing.update({
        where: { id: l.id },
        data: {
          importCostJson: JSON.stringify(breakdown),
          importTotalEur: breakdown.totalEur,
          ptMarketMedian: st?.median ?? null,
          savingsEur: deal?.savings ?? null,
          dealRating: deal?.rating ?? null,
        },
      });
      processed++;
    }
    if (batch.length < batchSize) break;
  }
  return { processed };
}
