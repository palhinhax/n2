// Persistência do scraping de anúncios estrangeiros: upsert normalizado,
// logging, desativação de anúncios expirados e deduplicação entre fontes.

import { prisma } from "../../../lib/prisma";
import { assessListingQuality } from "../../../lib/listing-quality";
import {
  estimateImportCost,
  getImportAssumptions,
  toEur,
} from "../../../lib/import-cost";
import { normalizeForeignListing } from "./normalize";
import type { ForeignRawListing, ForeignSourceConfig } from "./types";

export async function logImport(
  sourceSlug: string,
  level: "INFO" | "ERROR",
  message: string
): Promise<void> {
  const line = message.slice(0, 2000);
  console[level === "ERROR" ? "error" : "log"](`[${sourceSlug}] ${line}`);
  await prisma.importScrapeLog
    .create({ data: { sourceSlug, level, message: line } })
    .catch(() => {});
}

/** Chave de deduplicação entre fontes: mesmo carro anunciado em vários sites. */
export function foreignDedupeKey(l: {
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  km?: number | null;
  country?: string | null;
}): string | null {
  if (!l.brand || !l.model || !l.year || l.km == null) return null;
  const kmBucket = Math.round(l.km / 2500) * 2500;
  return [
    l.brand.toLowerCase().trim(),
    l.model.toLowerCase().trim(),
    l.year,
    kmBucket,
    (l.country ?? "").toUpperCase(),
  ].join("|");
}

export async function upsertForeignListing(
  source: ForeignSourceConfig,
  raw: ForeignRawListing
): Promise<"created" | "updated"> {
  const now = new Date();
  const l = normalizeForeignListing(raw);
  const assumptions = await getImportAssumptions();

  const currency = (l.currency ?? "EUR").toUpperCase();
  const priceEur =
    l.price != null ? toEur(l.price, currency, assumptions) : null;

  // qualidade de dados (mesmas regras do scraping nacional)
  const quality = assessListingQuality({
    km: l.km ?? null,
    year: l.year ?? null,
    price: priceEur,
    title: raw.title,
  });

  // custo de importação pré-calculado (a comparação com PT é feita em lote
  // no fim do ciclo — ver lib/import-listing.refreshImportComparisons)
  let importCostJson: string | null = null;
  let importTotalEur: number | null = null;
  if (priceEur != null) {
    const breakdown = estimateImportCost(
      {
        price: priceEur,
        currency: "EUR",
        country: source.country,
        fuel: l.fuel,
        year: l.year,
        firstRegistration: l.firstRegistration,
        displacement: l.displacement,
        power: l.power,
        co2: l.co2,
      },
      assumptions
    );
    importCostJson = JSON.stringify(breakdown);
    importTotalEur = breakdown.totalEur;
  }

  const data: Record<string, unknown> = {
    url: l.url,
    country: source.country.toUpperCase(),
    region: l.region ?? null,
    title: l.title,
    rawTitle: raw.title,
    brand: l.brand,
    model: l.model,
    version: l.version,
    year: l.year,
    firstRegistration: l.firstRegistration ?? null,
    km: l.km ?? null,
    price: l.price ?? null,
    currency,
    priceEur,
    fuel: l.fuel ?? null,
    gearbox: l.gearbox ?? null,
    displacement: l.displacement ?? null,
    power: l.power ?? null,
    co2: l.co2 ?? null,
    emissionStandard: l.emissionStandard ?? null,
    bodyType: l.bodyType ?? null,
    doors: l.doors ?? null,
    seats: l.seats ?? null,
    sellerType: l.sellerType ?? null,
    sellerName: l.sellerName ?? null,
    sellerPhone: l.sellerPhone ?? null,
    sellerEmail: l.sellerEmail ?? null,
    imageUrls: JSON.stringify(l.imageUrls ?? []),
    description: l.description ?? null,
    dedupeKey: foreignDedupeKey({ ...l, country: source.country }),
    suspicious: quality.suspicious,
    suspiciousReasons: JSON.stringify(quality.reasons),
    importCostJson,
    importTotalEur,
    active: true,
    lastSeenAt: now,
    lastCheckedAt: now,
  };

  const existing = await prisma.foreignListing.findUnique({
    where: {
      sourceSlug_externalId: {
        sourceSlug: source.slug,
        externalId: l.externalId,
      },
    },
    select: { id: true, status: true },
  });

  if (existing) {
    // não ressuscitar anúncios rejeitados pelo admin
    if (existing.status === "REJECTED") {
      await prisma.foreignListing.update({
        where: { id: existing.id },
        data: { lastSeenAt: now, lastCheckedAt: now },
      });
      return "updated";
    }
    await prisma.foreignListing.update({
      where: { id: existing.id },
      data: { ...data, status: "APPROVED" },
    });
    return "updated";
  }

  await prisma.foreignListing.create({
    data: {
      sourceSlug: source.slug,
      externalId: l.externalId,
      ...(data as any),
    },
  });
  return "created";
}

/** Desativa anúncios que não foram vistos neste ciclo (saíram do site). */
export async function deactivateStaleForeign(
  cycleStartedAt: Date
): Promise<number> {
  const res = await prisma.foreignListing.updateMany({
    where: { active: true, lastSeenAt: { lt: cycleStartedAt } },
    data: { active: false, status: "EXPIRED" },
  });
  return res.count;
}

/** Esconde duplicados entre fontes (fica visível o mais barato). */
export async function dedupeForeignListings(): Promise<{
  groups: number;
  duplicates: number;
}> {
  const rows = await prisma.foreignListing.findMany({
    where: { active: true, dedupeKey: { not: null } },
    select: { id: true, dedupeKey: true, priceEur: true },
    orderBy: { priceEur: "asc" },
  });
  const byKey = new Map<string, string[]>();
  for (const r of rows) {
    const k = r.dedupeKey as string;
    const arr = byKey.get(k) ?? [];
    arr.push(r.id);
    byKey.set(k, arr);
  }
  let groups = 0;
  const dupIds: string[] = [];
  const keepIds: string[] = [];
  for (const ids of Array.from(byKey.values())) {
    if (ids.length < 2) {
      keepIds.push(ids[0]);
      continue;
    }
    groups++;
    keepIds.push(ids[0]); // o mais barato fica visível
    dupIds.push(...ids.slice(1));
  }
  if (dupIds.length) {
    await prisma.foreignListing.updateMany({
      where: { id: { in: dupIds } },
      data: { isDuplicate: true },
    });
  }
  if (keepIds.length) {
    await prisma.foreignListing.updateMany({
      where: { id: { in: keepIds }, isDuplicate: true },
      data: { isDuplicate: false },
    });
  }
  return { groups, duplicates: dupIds.length };
}

/** Limpa logs antigos (mantém 14 dias). */
export async function purgeOldImportLogs(): Promise<number> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const res = await prisma.importScrapeLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return res.count;
}
