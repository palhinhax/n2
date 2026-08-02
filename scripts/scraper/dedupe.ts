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

/** Tolerância de km para afirmar "é o mesmo carro" — igual à usada no cartão
 * "O mesmo carro noutros portais" em app/carros/externo/[id]/page.tsx. */
const KM_TOLERANCE = 1500;

type DedupeItem = {
  id: string;
  price: number | null;
  imgs: number;
  source: string;
  origin: string; // scraper (nosso) | api (backup)
  fuel: string | null;
  gearbox: string | null;
  power: number | null;
  km: number | null;
};

const sameStr = (a?: string | null, b?: string | null) =>
  !a || !b || a.trim().toLowerCase() === b.trim().toLowerCase();

/** A dedupeKey é propositadamente tolerante; para AFIRMAR "é o mesmo carro"
 * exigimos também combustível/caixa/potência/km compatíveis (critérios
 * idênticos aos do cartão "O mesmo carro noutros portais"). */
function isSameCar(a: DedupeItem, b: DedupeItem): boolean {
  return (
    sameStr(a.fuel, b.fuel) &&
    sameStr(a.gearbox, b.gearbox) &&
    (a.power == null || b.power == null || a.power === b.power) &&
    (a.km == null || b.km == null || Math.abs(a.km - b.km) <= KM_TOLERANCE)
  );
}

/** Marca como duplicados os anúncios que, além de partilharem a dedupeKey,
 * têm combustível/caixa/potência/km compatíveis com um anúncio mantido de
 * OUTRA fonte. Dentro do mesmo portal nunca escondemos nada — dois carros
 * distintos colidem facilmente na dedupeKey e a republicação no mesmo portal
 * já é tratada pelo histórico do anúncio (lib/listing-history.ts). Exceção:
 * um par scraper/API do mesmo portal É escondido (a cópia da API), porque a
 * API de backup traz os mesmos anúncios com outro id.
 * Preferência: anúncios do nosso scraper primeiro; depois o de preço mais
 * baixo (tie-break: mais imagens). */
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
      // os nossos anúncios ganham sempre às cópias da API de backup
      if (a.origin !== b.origin) return a.origin === "api" ? 1 : -1;
      const pa = a.price ?? Number.MAX_SAFE_INTEGER;
      const pb = b.price ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb; // mantém o mais barato
      return b.imgs - a.imgs; // depois o com mais fotos
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
