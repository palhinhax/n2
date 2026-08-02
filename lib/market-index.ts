import { prisma } from "@/lib/prisma";

// Índice Nacional 2: agregados de preço do mercado de usados calculados
// diretamente do inventário scraped (todas as fontes). Tudo em SQL para não
// puxar dezenas de milhares de linhas para o Node.

const PRICE_MIN = 500;
const PRICE_MAX = 300000;

export type MonthPoint = { month: string; n: number; median: number };
export type FuelStat = { seg: string; n: number; median: number };
export type BrandStat = { brand: string; n: number; median: number };
export type SellTime = { seg: string; n: number; medianDays: number };
export type YearPoint = { year: number; n: number; median: number };
export type PriceBand = { label: string; n: number };

export type MarketIndex = {
  months: MonthPoint[]; // últimos 12 meses (só meses com amostra decente)
  fuels: FuelStat[];
  brands: BrandStat[];
  activeCount: number;
  currentMedian: number | null;
  momPct: number | null; // variação mês-a-mês da mediana (%)
  sellTimes: SellTime[]; // dias até desaparecer da origem ("Todos" primeiro)
  yearCurve: YearPoint[]; // mediana por ano do carro (desvalorização)
  priceBands: PriceBand[]; // histograma por faixa de preço
  drops: { count: number; medianDrop: number } | null; // descidas ativas
};

// bucket de combustível partilhado pelas queries (mesma lógica em SQL)
const FUEL_SEG_SQL = `CASE
  WHEN fuel ILIKE '%plug%' THEN 'Híbrido Plug-In'
  WHEN fuel ILIKE '%brido%' OR fuel ILIKE '%hybrid%' THEN 'Híbrido'
  WHEN fuel ILIKE '%trico%' OR fuel ILIKE '%electric%' THEN 'Elétrico'
  WHEN fuel ILIKE '%diesel%' THEN 'Diesel'
  WHEN fuel ILIKE '%gasolina%' THEN 'Gasolina'
END`;

const BAND_LABELS = [
  "até 5 k€",
  "5–10 k€",
  "10–15 k€",
  "15–20 k€",
  "20–30 k€",
  "30–50 k€",
  "50 k€+",
];

export async function computeMarketIndex(): Promise<MarketIndex | null> {
  try {
    const [
      months,
      fuels,
      brands,
      active,
      sellRaw,
      yearCurve,
      bandsRaw,
      dropsRaw,
    ] = await Promise.all([
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
      // tempo até desaparecer da origem (proxy de venda) — desativados nos
      // últimos 60 dias; "Todos" + por combustível numa só query (ROLLUP-like)
      prisma.$queryRawUnsafe<SellTime[]>(
        `SELECT CASE WHEN GROUPING(seg) = 1 THEN 'Todos' ELSE seg END AS seg,
                count(*)::int AS n,
                round(percentile_cont(0.5) WITHIN GROUP (ORDER BY days))::int AS "medianDays"
         FROM (
           SELECT extract(epoch FROM ("lastSeenAt" - "firstSeenAt")) / 86400.0 AS days,
                  ${FUEL_SEG_SQL} AS seg
           FROM "ScrapedListing"
           WHERE active = false AND suspicious = false
             AND "lastSeenAt" >= now() - interval '60 days'
             AND "lastSeenAt" > "firstSeenAt"
             AND price BETWEEN ${PRICE_MIN} AND ${PRICE_MAX}
         ) t
         GROUP BY GROUPING SETS ((seg), ())
         HAVING GROUPING(seg) = 1 OR seg IS NOT NULL`
      ),
      // curva de desvalorização: mediana por ano do carro (últimos 15 anos)
      prisma.$queryRaw<YearPoint[]>`
        SELECT year,
               count(*)::int AS n,
               round(percentile_cont(0.5) WITHIN GROUP (ORDER BY price))::int AS median
        FROM "ScrapedListing"
        WHERE active AND NOT suspicious AND NOT "isDuplicate"
          AND price BETWEEN ${PRICE_MIN} AND ${PRICE_MAX}
          AND year BETWEEN extract(year FROM now())::int - 14
                       AND extract(year FROM now())::int + 1
        GROUP BY year
        ORDER BY year`,
      // histograma por faixa de preço
      prisma.$queryRaw<{ bucket: number; n: number }[]>`
        SELECT width_bucket(price, ARRAY[5000, 10000, 15000, 20000, 30000, 50000]) AS bucket,
               count(*)::int AS n
        FROM "ScrapedListing"
        WHERE active AND NOT suspicious AND NOT "isDuplicate"
          AND price BETWEEN ${PRICE_MIN} AND ${PRICE_MAX}
        GROUP BY 1
        ORDER BY 1`,
      // anúncios ativos com descida de preço registada
      prisma.$queryRaw<{ count: number; medianDrop: number }[]>`
        SELECT count(*)::int AS count,
               round(percentile_cont(0.5) WITHIN GROUP (ORDER BY "previousPrice" - price))::int AS "medianDrop"
        FROM "ScrapedListing"
        WHERE active AND NOT suspicious AND NOT "isDuplicate"
          AND "previousPrice" > price
          AND price BETWEEN ${PRICE_MIN} AND ${PRICE_MAX}`,
    ]);

    // meses com amostra minúscula distorcem o gráfico (início da recolha)
    const solidMonths = months.filter((m) => m.n >= 100);
    const last = solidMonths[solidMonths.length - 1];
    const prev = solidMonths[solidMonths.length - 2];
    const momPct =
      last && prev && prev.median > 0
        ? Math.round(((last.median - prev.median) / prev.median) * 1000) / 10
        : null;

    // "Todos" primeiro, resto por amostra; só segmentos com amostra decente
    const sellTimes = [
      ...sellRaw.filter((s) => s.seg === "Todos"),
      ...sellRaw
        .filter((s) => s.seg !== "Todos" && s.n >= 50)
        .sort((a, b) => b.n - a.n),
    ];

    const priceBands: PriceBand[] = BAND_LABELS.map((label, i) => ({
      label,
      n: bandsRaw.find((b) => b.bucket === i)?.n ?? 0,
    }));

    const drops =
      dropsRaw[0] && dropsRaw[0].count > 0
        ? { count: dropsRaw[0].count, medianDrop: dropsRaw[0].medianDrop }
        : null;

    return {
      months: solidMonths,
      fuels,
      brands,
      activeCount: active,
      currentMedian: last?.median ?? null,
      momPct,
      sellTimes,
      yearCurve: yearCurve.filter((y) => y.n >= 30),
      priceBands,
      drops,
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
