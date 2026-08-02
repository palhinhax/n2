import { prisma } from "../../lib/prisma";
import type { Listing } from "./types";
import { isBackupListingSource } from "./types";

export function dedupeKeyFor(
  l:
    | Listing
    | {
        brand?: string | null;
        model?: string | null;
        year?: number | null;
        km?: number | null;
      }
): string | null {
  const brand = (l.brand ?? "").trim().toLowerCase();
  const model = (l.model ?? "").trim().toLowerCase();
  if (!brand || !model || l.year == null || l.km == null) return null;
  const kmBucket = Math.round((l.km ?? 0) / 1000);
  return `${brand}|${model}|${l.year}|${kmBucket}`;
}

const CHUNK = 4000;
const KM_TOLERANCE = 1500;

type DedupeItem = {
  id: string;
  price: number | null;
  imgs: number;
  source: string;
  origin: string;
  fuel: string | null;
  gearbox: string | null;
  power: number | null;
  km: number | null;
};

const sameStr = (a?: string | null, b?: string | null) =>
  !a || !b || a.trim().toLowerCase() === b.trim().toLowerCase();

function isSameCar(a: DedupeItem, b: DedupeItem): boolean {
  return (
    sameStr(a.fuel, b.fuel) &&
    sameStr(a.gearbox, b.gearbox) &&
    (a.power == null || b.power == null || a.power === b.power) &&
    (a.km == null || b.km == null || Math.abs(a.km - b.km) <= KM_TOLERANCE)
  );
}

function isBackup(item: DedupeItem): boolean {
  return item.origin === "api" || isBackupListingSource(item.source);
}

export async function dedupeListings(): Promise<{
  groups: number;
  duplicates: number;
}> {
  const rows = await prisma.scrapedListing.findMany({
    where: { active: true, dedupeKey: { not: null } },
    select: {
      id: true,
      dedupeKey: true,
      price: true,
      imageUrls: true,
      source: true,
      origin: true,
      fuel: true,
      gearbox: true,
      power: true,
      km: true,
    },
  });

  const groups = new Map<string, DedupeItem[]>();
  for (const r of rows) {
    const key = r.dedupeKey as string;
    let imgs = 0;
    try {
      imgs = JSON.parse(r.imageUrls || "[]").length;
    } catch {
      imgs = 0;
    }
    const arr = groups.get(key) ?? [];
    arr.push({
      id: r.id,
      price: r.price,
      imgs,
      source: r.source,
      origin: r.origin,
      fuel: r.fuel,
      gearbox: r.gearbox,
      power: r.power,
      km: r.km,
    });
    groups.set(key, arr);
  }

  const dupIds: string[] = [];
  let dupGroups = 0;
  for (const arr of Array.from(groups.values())) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => {
      const backupA = isBackup(a) ? 1 : 0;
      const backupB = isBackup(b) ? 1 : 0;
      if (backupA !== backupB) return backupA - backupB;
      const pa = a.price ?? Number.MAX_SAFE_INTEGER;
      const pb = b.price ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
      return b.imgs - a.imgs;
    });

    const kept: DedupeItem[] = [];
    let groupDups = 0;
    for (const item of arr) {
      const dupOfKept = kept.some(
        (k) =>
          (k.source !== item.source || k.origin !== item.origin) &&
          isSameCar(k, item)
      );
      if (dupOfKept) {
        dupIds.push(item.id);
        groupDups++;
      } else {
        kept.push(item);
      }
    }
    if (groupDups > 0) dupGroups++;
  }

  await prisma.scrapedListing.updateMany({
    where: { active: true, isDuplicate: true },
    data: { isDuplicate: false },
  });
  for (let i = 0; i < dupIds.length; i += CHUNK) {
    const chunk = dupIds.slice(i, i + CHUNK);
    await prisma.scrapedListing.updateMany({
      where: { id: { in: chunk } },
      data: { isDuplicate: true },
    });
  }

  return { groups: dupGroups, duplicates: dupIds.length };
}
