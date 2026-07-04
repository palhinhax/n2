// Estatísticas de mercado para as páginas SEO programáticas: mediana de
// preço, km médio e anos mais comuns do inventário que corresponde a uma
// pesquisa. Dá conteúdo único/útil a cada página (Google e LLMs adoram) sem
// pesar: 1 query, revalidada com a página (ISR).

import { prisma } from "@/lib/prisma";
import { buildWheres, type ListingQuery } from "@/lib/car-listing";

export interface SeoStats {
  sample: number; // nº de anúncios usados no cálculo
  medianPrice: number | null;
  avgKm: number | null;
  commonYears: number[]; // até 3, mais frequentes
}

const MIN_SAMPLE = 5;
const MAX_ROWS = 4000;

function median(sorted: number[]): number | null {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export async function seoStats(q: ListingQuery): Promise<SeoStats | null> {
  const { whereExt } = buildWheres(q);
  let rows: { price: number | null; km: number | null; year: number | null }[];
  try {
    rows = await prisma.scrapedListing.findMany({
      where: whereExt,
      select: { price: true, km: true, year: true },
      orderBy: { firstSeenAt: "desc" },
      take: MAX_ROWS,
    });
  } catch {
    return null;
  }
  if (rows.length < MIN_SAMPLE) return null;

  const prices = rows
    .map((r) => r.price)
    .filter((p): p is number => p != null && p > 0)
    .sort((a, b) => a - b);

  const kms = rows.map((r) => r.km).filter((k): k is number => k != null);
  const avgKm = kms.length
    ? Math.round(kms.reduce((s, k) => s + k, 0) / kms.length / 1000) * 1000
    : null;

  const yearCount = new Map<number, number>();
  for (const r of rows)
    if (r.year != null) yearCount.set(r.year, (yearCount.get(r.year) ?? 0) + 1);
  const commonYears = Array.from(yearCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([y]) => y)
    .sort((a, b) => b - a);

  return {
    sample: rows.length,
    medianPrice: median(prices),
    avgKm,
    commonYears,
  };
}
