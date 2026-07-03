import { prisma } from "@/lib/prisma";

// Inteligência de preço: usa o inventário agregado para estimar o valor de
// mercado de um carro (mediana e percentis) por marca+modelo+ano.

export interface MarketStats {
  count: number;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
}

export type PriceRating = "great" | "good" | "fair" | "high";

export const RATING_LABEL: Record<PriceRating, string> = {
  great: "Excelente preço",
  good: "Bom preço",
  fair: "Preço de mercado",
  high: "Acima do mercado",
};

export const RATING_STYLE: Record<PriceRating, string> = {
  great: "bg-[#1FA37A] text-white",
  good: "bg-[#4BA65A] text-white",
  fair: "bg-[#5B6B7B] text-white",
  high: "bg-[#C6603B] text-white",
};

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const MIN_SAMPLE = 5;

/** Estatísticas de mercado para um carro (marca+modelo+ano ±1). */
export async function marketStats(opts: {
  brand?: string | null;
  model?: string | null;
  year?: number | null;
}): Promise<MarketStats | null> {
  const brand = opts.brand?.trim();
  const model = opts.model?.trim();
  if (!brand || !model) return null;

  const yearWhere =
    opts.year != null ? { gte: opts.year - 1, lte: opts.year + 1 } : undefined;

  const listings = await prisma.scrapedListing.findMany({
    where: {
      active: true,
      isDuplicate: false,
      price: { gt: 100 },
      brand: { equals: brand, mode: "insensitive" },
      model: { contains: model, mode: "insensitive" },
      ...(yearWhere ? { year: yearWhere } : {}),
    },
    select: { price: true },
    take: 3000,
  });

  const prices = listings
    .map((l) => l.price as number)
    .filter((p) => p != null && p > 100)
    .sort((a, b) => a - b);

  if (prices.length < MIN_SAMPLE) return null;

  return {
    count: prices.length,
    median: Math.round(percentile(prices, 0.5)),
    p25: Math.round(percentile(prices, 0.25)),
    p75: Math.round(percentile(prices, 0.75)),
    min: prices[0],
    max: prices[prices.length - 1],
  };
}

/** Classifica um preço face à mediana de mercado. */
export function ratePrice(
  price: number | null | undefined,
  stats: MarketStats | null
): PriceRating | null {
  if (price == null || !stats) return null;
  const m = stats.median;
  if (price <= m * 0.85) return "great";
  if (price <= m * 0.97) return "good";
  if (price <= m * 1.1) return "fair";
  return "high";
}
