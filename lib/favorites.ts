import { prisma } from "@/lib/prisma";
import { countListings, type ListingQuery } from "@/lib/car-listing";

/** Nº de favoritos (carros do site + externos) com mudança de preço não vista. */
export async function priceAlertCount(userId: string): Promise<number> {
  const favs = await prisma.favorite.findMany({
    where: { userId },
    select: {
      seenPrice: true,
      car: { select: { price: true } },
      listing: { select: { price: true } },
    },
  });
  return favs.filter((f) => {
    const cur = f.car?.price ?? f.listing?.price ?? null;
    return cur != null && f.seenPrice != null && cur !== f.seenPrice;
  }).length;
}

/** Nº de pesquisas guardadas com carros novos desde a última visita. */
export async function savedSearchAlertCount(userId: string): Promise<number> {
  const searches = await prisma.savedSearch.findMany({
    where: { userId },
    select: { query: true, lastCount: true },
  });
  let n = 0;
  for (const s of searches) {
    let q: ListingQuery = {};
    try {
      q = JSON.parse(s.query);
    } catch {
      continue;
    }
    const count = await countListings(q);
    if (count > s.lastCount) n++;
  }
  return n;
}
