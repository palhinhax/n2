import { prisma } from "@/lib/prisma";
import { fetchListingDetail } from "../scripts/scraper/detail";

// re-enriquecer se os detalhes tiverem mais de N dias
const STALE_DAYS = 7;

/**
 * Garante que um anúncio externo tem os detalhes (descrição, equipamento, etc.)
 * preenchidos. Vai buscar à origem apenas na primeira visita (ou se ficarem
 * velhos), guardando em cache na BD. Devolve o registo atualizado.
 */
export async function ensureListingDetail(listing: {
  id: string;
  source: string;
  url: string;
  detailsFetchedAt: Date | null;
  imageUrls: string;
}) {
  const fresh =
    listing.detailsFetchedAt &&
    Date.now() - listing.detailsFetchedAt.getTime() <
      STALE_DAYS * 24 * 60 * 60 * 1000;
  if (fresh) return null;

  const detail = await fetchListingDetail(listing.source as any, listing.url);

  // junta as fotos da galeria completa às que já tínhamos, sem duplicar
  let existingImgs: string[] = [];
  try {
    existingImgs = JSON.parse(listing.imageUrls || "[]");
  } catch {
    existingImgs = [];
  }
  const mergedImgs = Array.from(
    new Set([...(detail.imageUrls ?? []), ...existingImgs])
  );

  return prisma.scrapedListing.update({
    where: { id: listing.id },
    data: {
      description: detail.description,
      equipment: JSON.stringify(detail.equipment ?? []),
      color: detail.color,
      doors: detail.doors,
      seats: detail.seats,
      drivetrain: detail.drivetrain,
      bodyType: detail.bodyType,
      condition: detail.condition,
      registrationDate: detail.registrationDate,
      warranty: detail.warranty,
      co2: detail.co2,
      imageUrls: mergedImgs.length
        ? JSON.stringify(mergedImgs)
        : listing.imageUrls,
      detailsFetchedAt: new Date(),
    },
  });
}
