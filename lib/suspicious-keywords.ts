// Palavras suspeitas geridas pelo admin (/admin/suspeitos).
//
// O admin vai adicionando palavras/frases (mota, cama, brinquedo, …) que
// denunciam anúncios não automóveis. Qualquer anúncio externo cujo título OU
// descrição contenha uma delas é marcado suspeito (razão "palavra_suspeita")
// e sai das listagens/estatísticas/sitemaps — ver lib/listing-quality.ts.
//
// Import relativo (sem "@/") de propósito: este módulo também corre nos
// scripts tsx (scraper, backfills), que não resolvem o alias.
import { prisma } from "./prisma";
import {
  matchSuspiciousKeywords,
  parseSuspiciousReasons,
  SUSPICION_REASONS,
} from "./listing-quality";

/** minúsculas, sem acentos, espaços colapsados — forma canónica guardada na BD */
export function normalizeKeyword(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// cache por processo — o scraper chama upsertListing centenas de vezes por
// invocação e não queremos uma query por anúncio
let cache: { words: string[]; at: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getSuspiciousKeywords(): Promise<string[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.words;
  const rows = await prisma.suspiciousKeyword.findMany({
    select: { word: true },
  });
  cache = { words: rows.map((r) => r.word), at: Date.now() };
  return cache.words;
}

export function invalidateKeywordCache(): void {
  cache = null;
}

export interface KeywordScanResult {
  scanned: number;
  flagged: number; // passaram a suspeitos por palavra
  unflagged: number; // deixaram de ter a razão palavra_suspeita
  perKeyword: Record<string, number>;
}

/**
 * Reavalia TODOS os anúncios externos ativos contra a lista atual de palavras.
 * Só mexe na razão "palavra_suspeita" — as restantes (km/ano/preço/peças/…)
 * ficam como estão. Idempotente; também limpa anúncios que deixaram de ter
 * match (ex.: palavra removida da lista). Atualiza o contador `matches` de
 * cada palavra para feedback no admin.
 */
export async function scanKeywordFlags(): Promise<KeywordScanResult> {
  const keywords = await prisma.suspiciousKeyword.findMany({
    select: { id: true, word: true },
  });
  const words = keywords.map((k) => k.word);
  const perKeyword: Record<string, number> = {};
  for (const w of words) perKeyword[w] = 0;

  const BATCH = 500;
  let cursor: string | undefined;
  let scanned = 0;
  let flagged = 0;
  let unflagged = 0;

  for (;;) {
    const rows = await prisma.scrapedListing.findMany({
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      where: { active: true },
      select: {
        id: true,
        title: true,
        rawTitle: true,
        description: true,
        suspicious: true,
        suspiciousReasons: true,
        keywordExempt: true,
      },
    });
    if (!rows.length) break;
    cursor = rows[rows.length - 1].id;
    scanned += rows.length;

    for (const r of rows) {
      const matched = r.keywordExempt
        ? []
        : matchSuspiciousKeywords(words, r.rawTitle ?? r.title, r.description);
      for (const w of matched) perKeyword[w]++;

      const others = parseSuspiciousReasons(r.suspiciousReasons).filter(
        (reason) => reason !== SUSPICION_REASONS.keyword
      );
      const reasons = matched.length
        ? [...others, SUSPICION_REASONS.keyword]
        : others;
      const reasonsJson = JSON.stringify(reasons);
      const suspicious = reasons.length > 0;
      if (suspicious === r.suspicious && reasonsJson === r.suspiciousReasons)
        continue;

      const hadKeyword = r.suspiciousReasons.includes(
        SUSPICION_REASONS.keyword
      );
      if (matched.length && !hadKeyword) flagged++;
      else if (!matched.length && hadKeyword) unflagged++;

      await prisma.scrapedListing.update({
        where: { id: r.id },
        data: { suspicious, suspiciousReasons: reasonsJson },
      });
    }
  }

  for (const k of keywords) {
    await prisma.suspiciousKeyword.update({
      where: { id: k.id },
      data: { matches: perKeyword[k.word] ?? 0 },
    });
  }

  return { scanned, flagged, unflagged, perKeyword };
}
