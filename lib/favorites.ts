import { prisma } from "@/lib/prisma";

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
