import { prisma } from "@/lib/prisma";
import { MIN_LISTING_PRICE } from "@/lib/car-listing";
import {
  marketStatsBatch,
  mkKey,
  ratePrice,
  type MarketStats,
} from "@/lib/price-intel";
import type { ScrapedListing } from "@prisma/client";

// Radar de negócios: anúncios recentes com preço claramente abaixo da mediana
// de mercado do próprio modelo (rating "great" do price-intel).

export type Deal = {
  listing: ScrapedListing;
  stats: MarketStats;
  belowPct: number; // % abaixo da mediana (ex.: 18)
};

const MIN_SAMPLE = 8; // amostra mínima para confiar na mediana
const MIN_BELOW = 10; // menos de 10% abaixo não é "negócio"
const MAX_BELOW = 45; // mais de 45% abaixo cheira a erro/esquema

export async function findDeals(opts: {
  distrito?: string;
  sinceDays?: number;
  take?: number;
}): Promise<Deal[]> {
  const since = new Date(Date.now() - (opts.sinceDays ?? 7) * 86400000);

  const rows = await prisma.scrapedListing.findMany({
    where: {
      active: true,
      isDuplicate: false,
      suspicious: false,
      price: { gte: MIN_LISTING_PRICE },
      brand: { not: null },
      model: { not: null },
      firstSeenAt: { gte: since },
      ...(opts.distrito
        ? { location: { contains: opts.distrito, mode: "insensitive" } }
        : {}),
    },
    orderBy: { firstSeenAt: "desc" },
    take: 600,
  });
  if (rows.length === 0) return [];

  const statsMap = await marketStatsBatch(
    rows.map((r) => ({ brand: r.brand!, model: r.model! }))
  );

  const deals: Deal[] = [];
  for (const r of rows) {
    const stats = statsMap.get(mkKey(r.brand, r.model));
    if (!stats || stats.count < MIN_SAMPLE) continue;
    if (ratePrice(r.price, stats) !== "great") continue;
    const belowPct = Math.round((1 - (r.price as number) / stats.median) * 100);
    if (belowPct < MIN_BELOW || belowPct > MAX_BELOW) continue;
    deals.push({ listing: r, stats, belowPct });
  }

  deals.sort((a, b) => b.belowPct - a.belowPct);
  return deals.slice(0, opts.take ?? 48);
}
