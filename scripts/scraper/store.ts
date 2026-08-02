import { prisma } from "../../lib/prisma";
import type { Listing } from "./types";
import { ensureBrandModel } from "./brands";
import { dedupeKeyFor } from "./dedupe";
import { normalizeVehicle } from "../../lib/vehicle-normalize";
import { assessListingQuality } from "../../lib/listing-quality";

export async function upsertListing(
  l: Listing
): Promise<"created" | "updated"> {
  const now = new Date();

  // normaliza marca/modelo/versão e gera um título limpo
  const nv = normalizeVehicle({
    brand: l.brand,
    model: l.model,
    title: l.title,
  });

  // regista marca/modelo novos na tabela oficial (com normalização)
  try {
    await ensureBrandModel(nv.brand ?? l.brand, l.model ?? l.title);
  } catch {
    // não bloqueia o scraping se falhar o registo da marca
  }

  const origin = l.origin ?? "scraper";

  const data: Record<string, unknown> = {
    url: l.url,
    title: nv.title,
    rawTitle: l.title,
    brand: nv.brand ?? l.brand ?? null,
    model: nv.model ?? l.model ?? null,
    version: nv.version,
    year: l.year ?? null,
    km: l.km ?? null,
    fuel: l.fuel ?? null,
    gearbox: l.gearbox ?? null,
    power: l.power ?? null,
    displacement: l.displacement ?? null,
    price: l.price ?? null,
    location: l.location ?? null,
    sellerType: l.sellerType ?? null,
    sellerName: l.sellerName ?? null,
    imageUrls: JSON.stringify(l.imageUrls ?? []),
    dedupeKey: dedupeKeyFor(l),
    active: true,
    origin,
    lastSeenAt: now,
  };
  // não apagar uma descrição enriquecida com um null vindo da listagem
  if (l.description != null) data.description = l.description;

  // qualidade de dados: km/ano/preço implausíveis ou anúncio de peças → suspeito
  const quality = assessListingQuality({
    km: l.km ?? null,
    year: l.year ?? null,
    price: l.price ?? null,
    title: l.title, // título original: é onde "para peças"/"salvado" aparece
  });
  data.suspicious = quality.suspicious;
  data.suspiciousReasons = JSON.stringify(quality.reasons);

  let existing = await prisma.scrapedListing.findUnique({
    where: {
      source_externalId: { source: l.source, externalId: l.externalId },
    },
    select: { id: true, price: true, origin: true },
  });

  // a API de backup pode usar outro formato de id — tenta casar pelo URL
  // antes de criar um duplicado do mesmo anúncio (nos dois sentidos: API a
  // encontrar um registo nosso, ou o scraper a reclamar um registo da API)
  if (!existing) {
    existing = await prisma.scrapedListing.findFirst({
      where: { url: l.url },
      select: { id: true, price: true, origin: true },
    });
    // ao reclamar um registo da API, o anúncio passa a usar o nosso id
    if (existing && origin === "scraper") data.externalId = l.externalId;
  }

  // um anúncio apanhado pelo nosso scraper nunca é tocado pela API de backup
  if (existing && origin === "api" && existing.origin === "scraper") {
    return "updated";
  }

  if (existing) {
    // deteta descida/subida de preço para o histórico
    const newPrice = l.price ?? null;
    if (
      existing.price != null &&
      newPrice != null &&
      existing.price !== newPrice
    ) {
      data.previousPrice = existing.price;
      data.priceChangedAt = now;
      // ponto no histórico completo de preços
      await prisma.pricePoint
        .create({ data: { listingId: existing.id, price: newPrice } })
        .catch(() => {});
    }
    await prisma.scrapedListing.update({ where: { id: existing.id }, data });
    return "updated";
  }
  const created = await prisma.scrapedListing.create({
    data: {
      source: l.source,
      externalId: l.externalId,
      ...(data as any),
    },
  });
  // primeiro ponto do histórico de preços
  if (l.price != null) {
    await prisma.pricePoint
      .create({ data: { listingId: created.id, price: l.price } })
      .catch(() => {});
  }
  return "created";
}

export async function getState<T>(id: string): Promise<T | null> {
  const row = await prisma.scrapeState.findUnique({ where: { id } });
  if (!row) return null;
  try {
    return JSON.parse(row.data) as T;
  } catch {
    return null;
  }
}

export async function setState(id: string, data: unknown): Promise<void> {
  // preserva null (reset limpa o estado); só undefined vira {}
  const json = JSON.stringify(data === undefined ? {} : data);
  await prisma.scrapeState.upsert({
    where: { id },
    update: { data: json },
    create: { id, data: json },
  });
}

/** Desativa anúncios que não foram vistos neste ciclo (desapareceram do site). */
export async function deactivateStale(cycleStartedAt: Date): Promise<number> {
  const res = await prisma.scrapedListing.updateMany({
    where: { active: true, lastSeenAt: { lt: cycleStartedAt } },
    data: { active: false },
  });
  return res.count;
}
