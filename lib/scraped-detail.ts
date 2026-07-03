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
  gearbox?: string | null;
  power?: number | null;
  displacement?: number | null;
  km?: number | null;
  fuel?: string | null;
  year?: number | null;
  location?: string | null;
  sellerType?: string | null;
  sellerName?: string | null;
}) {
  const fresh =
    listing.detailsFetchedAt &&
    Date.now() - listing.detailsFetchedAt.getTime() <
      STALE_DAYS * 24 * 60 * 60 * 1000;
  if (fresh) return null;

  const detail = await fetchListingDetail(listing.source as any, listing.url);

  // fetch falhou ou página vazia/bloqueada → não escrevas nada por cima dos
  // dados que já temos; sem detailsFetchedAt, a próxima visita tenta de novo.
  const gotSomething =
    detail.description != null ||
    detail.imageUrls.length > 0 ||
    detail.km != null ||
    detail.year != null ||
    detail.gearbox != null ||
    detail.fuel != null;
  if (!gotSomething) return null;

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
      // preenche specs em falta (sobretudo anúncios OLX que chegam pobres)
      gearbox: listing.gearbox ?? detail.gearbox ?? undefined,
      power: listing.power ?? detail.power ?? undefined,
      displacement: listing.displacement ?? detail.displacement ?? undefined,
      km: listing.km ?? detail.km ?? undefined,
      fuel: listing.fuel ?? detail.fuel ?? undefined,
      year: listing.year ?? detail.year ?? undefined,
      location: listing.location ?? detail.location ?? undefined,
      sellerType: listing.sellerType ?? detail.sellerType ?? undefined,
      sellerName: listing.sellerName ?? detail.sellerName ?? undefined,
      imageUrls: mergedImgs.length
        ? JSON.stringify(mergedImgs)
        : listing.imageUrls,
      detailsFetchedAt: new Date(),
    },
  });
}
