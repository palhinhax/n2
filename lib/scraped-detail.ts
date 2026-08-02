import { prisma } from "@/lib/prisma";
import { fetchListingDetail } from "../scripts/scraper/detail";
import type { ListingDetail } from "../scripts/scraper/detail";
import { fetchDetailFromCarrosApi } from "../scripts/scraper/sites/carros-api";
import { isBackupListingSource } from "../scripts/scraper/types";
import { assessListingQuality } from "@/lib/listing-quality";

// re-enriquecer se os detalhes tiverem mais de N dias
const STALE_DAYS = 7;

/**
 * Garante que um anúncio externo tem os detalhes (descrição, equipamento, etc.)
 * preenchidos. Corre apenas na primeira visita (ou se ficarem velhos),
 * guardando em cache na BD. Anúncios do nosso scraper: fetch direto à origem,
 * com a Carros API como fallback (ex.: bloqueio anti-bot). Anúncios vindos da
 * Carros API (fonte API_*): pede-lhe o scrape on-demand primeiro, origem como
 * fallback. Devolve o registo atualizado.
 */
export async function ensureListingDetail(listing: {
  id: string;
  source: string;
  externalId: string;
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
  title?: string;
  rawTitle?: string | null;
  brand?: string | null;
  price?: number | null;
}) {
  const fresh =
    listing.detailsFetchedAt &&
    Date.now() - listing.detailsFetchedAt.getTime() <
      STALE_DAYS * 24 * 60 * 60 * 1000;
  if (fresh) return null;

  // fetch falhou ou página vazia/bloqueada → não escrevas nada por cima dos
  // dados que já temos; sem detailsFetchedAt, a próxima visita tenta de novo.
  const hasContent = (d: ListingDetail) =>
    d.description != null ||
    d.imageUrls.length > 0 ||
    d.km != null ||
    d.year != null ||
    d.gearbox != null ||
    d.fuel != null;

  const fromOrigin = () => fetchListingDetail(listing.source, listing.url);
  const fromApi = () =>
    fetchDetailFromCarrosApi(listing.source, {
      url: listing.url,
      externalId: listing.externalId,
    });

  // Anúncios que vieram da Carros API (fonte API_*) chegam sem detalhe — é a
  // ela que pedimos o scrape on-demand (tem o id interno do OLX e acesso
  // garantido às origens); o fetch direto fica como fallback. Para anúncios do
  // nosso scraper é ao contrário: origem primeiro, API só se ela falhar
  // (ex.: bloqueio Cloudflare).
  const fetchers = isBackupListingSource(listing.source)
    ? [fromApi, fromOrigin]
    : [fromOrigin, fromApi];

  let detail: ListingDetail | null = null;
  for (const fetcher of fetchers) {
    const d = await fetcher();
    if (d && hasContent(d)) {
      detail = d;
      break;
    }
  }
  if (!detail) return null;

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

  // com os detalhes completos, reavalia a qualidade: um falso positivo de
  // "não veículo" (carro com dados escassos no cartão) limpa-se sozinho; um
  // iPhone/bicicleta continua sem sinais mecânicos e fica marcado.
  const quality = assessListingQuality({
    km: listing.km ?? detail.km ?? null,
    year: listing.year ?? detail.year ?? null,
    price: listing.price ?? null,
    title: listing.rawTitle ?? listing.title ?? null,
    brand: listing.brand ?? null,
    fuel: listing.fuel ?? detail.fuel ?? null,
    gearbox: listing.gearbox ?? detail.gearbox ?? null,
    power: listing.power ?? detail.power ?? null,
    displacement: listing.displacement ?? detail.displacement ?? null,
  });

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
      suspicious: quality.suspicious,
      suspiciousReasons: JSON.stringify(quality.reasons),
      detailsFetchedAt: new Date(),
    },
  });
}
