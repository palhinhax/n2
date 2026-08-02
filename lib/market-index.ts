import { prisma } from "@/lib/prisma";

// Índice Nacional 2: agregados de preço do mercado de usados calculados
// diretamente do inventário scraped (todas as fontes). Tudo em SQL para não
// puxar dezenas de milhares de linhas para o Node.

const PRICE_MIN = 500;
const PRICE_MAX = 300000;

export type MonthPoint = { month: string; n: number; median: number };
export type FuelStat = { seg: string; n: number; median: number };
export type BrandStat = { brand: string; n: number; median: number };

export type MarketIndex = {
  months: MonthPoint[]; // últimos 12 meses (só meses com amostra decente)
  fuels: FuelStat[];
  brands: BrandStat[];
  activeCount: number;
  currentMedian: number | null;
  momPct: number | null; // variação mês-a-mês da mediana (%)
};

export async function computeMarketIndex(): Promise<MarketIndex | null> {
  try {
    const [months, fuels, brands, active] = await Promise.all([
      // mediana mensal: um anúncio conta no mês se esteve visível nesse mês
      prisma.$queryRaw<MonthPoint[]>`
        SELECT to_char(m.month, 'YYYY-MM') AS month,
               count(*)::int AS n,
               round(percentile_cont(0.5) WITHIN GROUP (ORDER BY l.price))::int AS median
        FROM generate_series(
               date_trunc('month', now()) - interval '11 months',
               date_trunc('month', now()),
               interval '1 month'
             ) AS m(month)
        JOIN "ScrapedListing" l
          ON l."firstSeenAt" < m.month + interval '1 month'
         AND l."lastSeenAt" >= m.month
        WHERE l.price BETWEEN ${PRICE_MIN} AND ${PRICE_MAX}
          AND l.suspicious = false
        GROUP BY m.month
        ORDER BY m.month`,
      prisma.$queryRaw<FuelStat[]>`
        SELECT seg,
               count(*)::int AS n,
               round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price))::int AS median
        FROM (
          SELECT price,
                 CASE
                   WHEN fuel ILIKE '%plug%' THEN 'Híbrido Plug-In'
                   WHEN fuel ILIKE '%brido%' OR fuel ILIKE '%hybrid%' THEN 'Híbrido'
                   WHEN fuel ILIKE '%trico%' OR fuel ILIKE '%electric%' THEN 'Elétrico'
                   WHEN fuel ILIKE '%diesel%' THEN 'Diesel'
                   WHEN fuel ILIKE '%gasolina%' THEN 'Gasolina'
                 END AS seg
          FROM "ScrapedListing"
          WHERE active AND NOT suspicious AND NOT "isDuplicate"
            AND price BETWEEN ${PRICE_MIN} AND ${PRICE_MAX}
            AND fuel IS NOT NULL
        ) t
        WHERE seg IS NOT NULL
        GROUP BY seg
        ORDER BY n DESC`,
      prisma.$queryRaw<BrandStat[]>`
        SELECT brand,
               count(*)::int AS n,
               round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price))::int AS median
        FROM "ScrapedListing"
        WHERE active AND NOT suspicious AND NOT "isDuplicate"
          AND price BETWEEN ${PRICE_MIN} AND ${PRICE_MAX}
          AND brand IS NOT NULL
        GROUP BY brand
        ORDER BY count(*) DESC
        LIMIT 12`,
      prisma.scrapedListing.count({
        where: {
          active: true,
          suspicious: false,
          isDuplicate: false,
          price: { gte: PRICE_MIN, lte: PRICE_MAX },
        },
      }),
    ]);

    // meses com amostra minúscula distorcem o gráfico (início da recolha)
    const solidMonths = months.filter((m) => m.n >= 100);
    const last = solidMonths[solidMonths.length - 1];
    const prev = solidMonths[solidMonths.length - 2];
    const momPct =
      last && prev && prev.median > 0
        ? Math.round(((last.median - prev.median) / prev.median) * 1000) / 10
        : null;

    return {
      months: solidMonths,
      fuels,
      brands,
      activeCount: active,
      currentMedian: last?.median ?? null,
      momPct,
    };
  } catch (err) {
    // BD indisponível (ex.: build) — a página mostra fallback
    console.error("[market-index]", err);
    return null;
  }
}

const MONTH_NAMES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** "2026-08" → "ago 2026" */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTH_NAMES[(m ?? 1) - 1]} ${y}`;
}
