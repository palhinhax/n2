import { prisma } from "../../lib/prisma";
import type { Listing } from "./types";
import { ensureBrandModel } from "./brands";
import { dedupeKeyFor } from "./dedupe";
import { normalizeVehicle } from "../../lib/vehicle-normalize";
import { assessListingQuality } from "../../lib/listing-quality";
import { getSuspiciousKeywords } from "../../lib/suspicious-keywords";
import { isBackupListingSource, primarySourceForBackup } from "./types";

export async function upsertListing(
  l: Listing
): Promise<"created" | "updated"> {
  const now = new Date();
  const origin =
    l.origin ?? (isBackupListingSource(l.source) ? "api" : "scraper");

  const nv = normalizeVehicle({
    brand: l.brand,
    model: l.model,
    title: l.title,
  });

  try {
    await ensureBrandModel(nv.brand ?? l.brand, l.model ?? l.title);
  } catch {
    // Nao bloqueia o scraping se falhar o registo da marca.
  }

  const dedupeKey = dedupeKeyFor(l);
  // Campos que o cartão da listagem pode trazer vazios mas o enriquecimento
  // on-demand preenche (sobretudo OLX): null aqui significa "desconhecido",
  // nunca "apagar" — undefined faz o update do Prisma ignorar o campo, para
  // não regredir dados já enriquecidos a cada ciclo do scraper.
  const incomingImgs = l.imageUrls ?? [];
  const data: Record<string, unknown> = {
    url: l.url,
    title: nv.title,
    rawTitle: l.title,
    brand: nv.brand ?? l.brand ?? null,
    model: nv.model ?? l.model ?? null,
    version: nv.version,
    year: l.year ?? undefined,
    km: l.km ?? undefined,
    fuel: l.fuel ?? undefined,
    gearbox: l.gearbox ?? undefined,
    power: l.power ?? undefined,
    displacement: l.displacement ?? undefined,
    price: l.price ?? undefined,
    location: l.location ?? undefined,
    sellerType: l.sellerType ?? undefined,
    sellerName: l.sellerName ?? undefined,
    imageUrls: JSON.stringify(incomingImgs),
    dedupeKey,
    active: true,
    origin,
    lastSeenAt: now,
  };

  const backupPrimary = primarySourceForBackup(l.source);
  if (backupPrimary) {
    const primaryDuplicate = await prisma.scrapedListing.findFirst({
      where: {
        active: true,
        suspicious: false,
        OR: [
          { source: backupPrimary, externalId: l.externalId },
          ...(dedupeKey
            ? [
                {
                  dedupeKey,
                  NOT: { source: { startsWith: "API_" } },
                },
              ]
            : []),
        ],
      },
      select: { id: true },
    });
    data.isDuplicate = !!primaryDuplicate;
  }

  const existingSelect = {
    id: true,
    price: true,
    description: true,
    imageUrls: true,
    origin: true,
    hiddenByAdmin: true,
    keywordExempt: true,
  } as const;
  let existing = await prisma.scrapedListing.findUnique({
    where: {
      source_externalId: { source: l.source, externalId: l.externalId },
    },
    select: existingSelect,
  });

  if (!existing) {
    existing = await prisma.scrapedListing.findFirst({
      where: { url: l.url },
      select: existingSelect,
    });
    if (existing && origin === "scraper") {
      data.source = l.source;
      data.externalId = l.externalId;
    }
  }

  // A API de backup nunca rebaixa nem sobrescreve um registo recolhido por nos.
  if (existing && origin === "api" && existing.origin === "scraper") {
    return "updated";
  }

  const quality = assessListingQuality({
    km: l.km ?? null,
    year: l.year ?? null,
    price: l.price ?? null,
    title: l.title,
    brand: nv.brand ?? l.brand ?? null,
    fuel: l.fuel ?? null,
    gearbox: l.gearbox ?? null,
    power: l.power ?? null,
    displacement: l.displacement ?? null,
    description: l.description ?? existing?.description ?? null,
    suspiciousKeywords: existing?.keywordExempt
      ? []
      : await getSuspiciousKeywords(),
  });
  data.suspicious = quality.suspicious;
  data.suspiciousReasons = JSON.stringify(quality.reasons);

  if (existing) {
    // apagado por um admin — atualizamos os dados mas fica fora do site
    if (existing.hiddenByAdmin) data.active = false;

    if (l.description != null && !existing.description) {
      data.description = l.description;
    }

    // nunca substituir uma galeria por menos fotos — o cartão da listagem
    // traz 0–1 fotos e apagava a galeria completa do enriquecimento
    let existingImgCount = 0;
    try {
      existingImgCount = JSON.parse(existing.imageUrls || "[]").length;
    } catch {
      existingImgCount = 0;
    }
    if (incomingImgs.length < existingImgCount) delete data.imageUrls;

    const newPrice = l.price ?? null;
    if (
      existing.price != null &&
      newPrice != null &&
      existing.price !== newPrice
    ) {
      data.previousPrice = existing.price;
      data.priceChangedAt = now;
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
      firstSeenAt: l.firstSeenAt ?? now,
      description: l.description ?? undefined,
      ...(data as any),
    },
  });

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
  const json = JSON.stringify(data === undefined ? {} : data);
  await prisma.scrapeState.upsert({
    where: { id },
    update: { data: json },
    create: { id, data: json },
  });
}

/** Desativa anuncios que nao foram vistos neste ciclo. */
export async function deactivateStale(cycleStartedAt: Date): Promise<number> {
  const res = await prisma.scrapedListing.updateMany({
    where: { active: true, lastSeenAt: { lt: cycleStartedAt } },
    data: { active: false },
  });
  return res.count;
}
