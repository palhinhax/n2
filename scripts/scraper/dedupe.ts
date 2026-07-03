import { prisma } from "../../lib/prisma";
import type { Listing } from "./types";

/** Chave de deduplicação: mesmo carro em fontes diferentes tende a ter
 * marca+modelo+ano+km idênticos. Devolve null se faltar informação-chave. */
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
  // arredonda km ao milhar para tolerar pequenas diferenças entre portais
  const kmBucket = Math.round((l.km ?? 0) / 1000);
  return `${brand}|${model}|${l.year}|${kmBucket}`;
}

const CHUNK = 4000;

/** Marca como duplicados todos menos um anúncio por dedupeKey (entre os ativos).
 * Mantém o de preço mais baixo (tie-break: mais imagens). */
export async function dedupeListings(): Promise<{
  groups: number;
  duplicates: number;
}> {
  const rows = await prisma.scrapedListing.findMany({
    where: { active: true, dedupeKey: { not: null } },
    select: { id: true, dedupeKey: true, price: true, imageUrls: true },
  });

  const groups = new Map<
    string,
    { id: string; price: number | null; imgs: number }[]
  >();
  for (const r of rows) {
    const key = r.dedupeKey as string;
    let imgs = 0;
    try {
      imgs = JSON.parse(r.imageUrls || "[]").length;
    } catch {
      imgs = 0;
    }
    const arr = groups.get(key) ?? [];
    arr.push({ id: r.id, price: r.price, imgs });
    groups.set(key, arr);
  }

  const dupIds: string[] = [];
  let dupGroups = 0;
  for (const arr of Array.from(groups.values())) {
    if (arr.length < 2) continue;
    dupGroups++;
    arr.sort((a, b) => {
      const pa = a.price ?? Number.MAX_SAFE_INTEGER;
      const pb = b.price ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb; // mantém o mais barato
      return b.imgs - a.imgs; // depois o com mais fotos
    });
    for (let i = 1; i < arr.length; i++) dupIds.push(arr[i].id);
  }

  // repõe tudo a "não-duplicado" e volta a marcar só os duplicados atuais
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
