import { prisma } from "../../lib/prisma";
import type { Listing } from "./types";
import { ensureBrandModel } from "./brands";
import { dedupeKeyFor } from "./dedupe";

export async function upsertListing(
  l: Listing
): Promise<"created" | "updated"> {
  const now = new Date();

  // regista marca/modelo novos na tabela oficial (com normalização)
  try {
    await ensureBrandModel(l.brand, l.model);
  } catch {
    // não bloqueia o scraping se falhar o registo da marca
  }

  const data = {
    url: l.url,
    title: l.title,
    brand: l.brand ?? null,
    model: l.model ?? null,
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
    lastSeenAt: now,
  };

  const existing = await prisma.scrapedListing.findUnique({
    where: {
      source_externalId: { source: l.source, externalId: l.externalId },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.scrapedListing.update({ where: { id: existing.id }, data });
    return "updated";
  }
  await prisma.scrapedListing.create({
    data: { source: l.source, externalId: l.externalId, ...data },
  });
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
  const json = JSON.stringify(data ?? {});
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
