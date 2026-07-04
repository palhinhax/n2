import { prisma } from "@/lib/prisma";

// Histórico de um anúncio: há quantos dias está à venda, quantas vezes o
// preço mudou (com a linha temporal completa) e se parece republicado.

export interface PricePointView {
  price: number;
  date: Date;
  /** diferença face ao ponto anterior (negativa = desceu) */
  delta: number | null;
}

export interface ListingHistory {
  daysOnMarket: number;
  firstSeenAt: Date;
  changes: number; // nº de mudanças de preço
  points: PricePointView[]; // do mais antigo ao mais recente
  republished: boolean; // o mesmo carro já apareceu noutro anúncio entretanto removido
}

function toViews(
  rows: { price: number; createdAt: Date }[],
  fallback: { price: number | null; date: Date } | null
): PricePointView[] {
  let pts = rows.map((r) => ({ price: r.price, date: r.createdAt }));
  // anúncios antigos (antes do PricePoint existir): usa o preço atual como
  // ponto único para a linha não ficar vazia
  if (pts.length === 0 && fallback?.price != null) {
    pts = [{ price: fallback.price, date: fallback.date }];
  }
  return pts.map((p, i) => ({
    ...p,
    delta: i > 0 ? p.price - pts[i - 1].price : null,
  }));
}

const dayMs = 86_400_000;

/** Histórico de um anúncio externo (agregado). */
export async function externalListingHistory(listing: {
  id: string;
  source: string;
  externalId: string;
  dedupeKey: string | null;
  firstSeenAt: Date;
  price: number | null;
  previousPrice: number | null;
  priceChangedAt: Date | null;
}): Promise<ListingHistory> {
  const [rows, republishedCount] = await Promise.all([
    prisma.pricePoint.findMany({
      where: { listingId: listing.id },
      orderBy: { createdAt: "asc" },
      select: { price: true, createdAt: true },
    }),
    // republicação: mesmo dedupeKey noutro anúncio da MESMA fonte que
    // entretanto ficou inativo (o vendedor apagou e voltou a publicar)
    listing.dedupeKey
      ? prisma.scrapedListing.count({
          where: {
            dedupeKey: listing.dedupeKey,
            source: listing.source,
            externalId: { not: listing.externalId },
            active: false,
          },
        })
      : Promise.resolve(0),
  ]);

  let points = toViews(rows, {
    price: listing.price,
    date: listing.firstSeenAt,
  });

  // compat: anúncios com mudança registada no modelo antigo (previousPrice)
  // mas sem PricePoints — reconstrói uma linha com 2 pontos
  if (
    points.length <= 1 &&
    listing.previousPrice != null &&
    listing.price != null &&
    listing.previousPrice !== listing.price
  ) {
    const pts = [
      { price: listing.previousPrice, date: listing.firstSeenAt },
      {
        price: listing.price,
        date: listing.priceChangedAt ?? new Date(),
      },
    ];
    points = pts.map((p, i) => ({
      ...p,
      delta: i > 0 ? p.price - pts[i - 1].price : null,
    }));
  }

  return {
    daysOnMarket: Math.max(
      0,
      Math.floor((Date.now() - listing.firstSeenAt.getTime()) / dayMs)
    ),
    firstSeenAt: listing.firstSeenAt,
    changes: Math.max(0, points.length - 1),
    points,
    republished: republishedCount > 0,
  };
}

/** Histórico de um carro do site. */
export async function carHistory(car: {
  id: string;
  createdAt: Date;
  price: number | null;
}): Promise<ListingHistory> {
  const rows = await prisma.pricePoint.findMany({
    where: { carId: car.id },
    orderBy: { createdAt: "asc" },
    select: { price: true, createdAt: true },
  });
  const points = toViews(rows, { price: car.price, date: car.createdAt });
  return {
    daysOnMarket: Math.max(
      0,
      Math.floor((Date.now() - car.createdAt.getTime()) / dayMs)
    ),
    firstSeenAt: car.createdAt,
    changes: Math.max(0, points.length - 1),
    points,
    republished: false,
  };
}
