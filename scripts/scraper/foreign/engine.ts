// Motor do scraping de fontes estrangeiras (Importar carros da Europa).
//
// Igual em espírito ao motor nacional (scripts/scraper/engine.ts): cada
// invocação processa um lote de páginas e guarda o cursor na BD (ScrapeState),
// para caber nos timeouts de serverless. As fontes vêm da tabela ImportSource
// (geridas no admin) e cada uma aponta para um adaptador registado em sites/.
//
// Quando TODAS as fontes ativas terminam o ciclo:
//   - anúncios não vistos são desativados (EXPIRED);
//   - duplicados entre fontes são escondidos;
//   - custo de importação + comparação com o mercado PT são recalculados;
//   - logs antigos são limpos.

import { prisma } from "../../../lib/prisma";
import { refreshImportComparisons } from "../../../lib/import-listing";
import { IMPORT_COUNTRIES } from "../../../lib/import-countries";
import { politeDelay } from "../http";
import { getState, setState } from "../store";
import { FOREIGN_ADAPTERS } from "./sites";
import {
  deactivateStaleForeign,
  dedupeForeignListings,
  logImport,
  purgeOldImportLogs,
  upsertForeignListing,
} from "./store";
import { RobotsDisallowedError } from "./robots";
import type { ForeignSourceConfig } from "./types";

export const IMPORT_SCRAPE_INTERVAL_DAYS = Number(
  process.env.IMPORT_SCRAPE_INTERVAL_DAYS ?? 3
);

const CYCLE_KEY = "import:cycle";
const sourceKey = (slug: string) => `import:source:${slug}`;
const MAX_FAIL_STREAK = 3;

interface CycleState {
  startedAt: string | null;
  finishedAt: string | null;
}

interface SourceState {
  cursor: unknown;
  finished: boolean;
  pagesDone: number;
  created: number;
  updated: number;
  failStreak: number;
}

export interface ForeignRunOptions {
  sources?: string[]; // slugs; default: todas as ativas
  maxPages?: number;
  deadline?: number;
  reset?: boolean;
}

export interface ForeignRunSummary {
  skipped: boolean;
  cycleFinished: boolean;
  pages: number;
  created: number;
  updated: number;
  deactivated: number;
  comparisonsRefreshed: number;
  perSource: Record<
    string,
    { pagesDone: number; created: number; updated: number; finished: boolean }
  >;
}

/**
 * Garante que as fontes por omissão existem (idempotente). As fontes reais
 * nascem DESATIVADAS: o admin deve rever os termos de serviço e o robots.txt
 * de cada site antes de ligar — o motor também valida o robots.txt em runtime.
 */
export async function ensureDefaultImportSources(): Promise<void> {
  const AS24_HOSTS: Record<string, string> = {
    DE: "https://www.autoscout24.de",
    FR: "https://www.autoscout24.fr",
    BE: "https://www.autoscout24.be",
    NL: "https://www.autoscout24.nl",
    ES: "https://www.autoscout24.es",
    IT: "https://www.autoscout24.it",
    LU: "https://www.autoscout24.lu",
    AT: "https://www.autoscout24.at",
  };
  for (const c of IMPORT_COUNTRIES) {
    const baseUrl = AS24_HOSTS[c.code];
    if (!baseUrl) continue;
    const slug = `autoscout24-${c.code.toLowerCase()}`;
    await prisma.importSource.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: `AutoScout24 ${c.name}`,
        adapter: "autoscout24",
        country: c.code,
        baseUrl,
        enabled: false,
        notes:
          "Rever robots.txt e termos de serviço antes de ativar. O motor valida o robots.txt em runtime e aborta se o caminho for proibido.",
      },
    });
  }
  // fonte de demonstração (dados sintéticos) para desenvolvimento/demos
  await prisma.importSource.upsert({
    where: { slug: "demo-eu" },
    update: {},
    create: {
      slug: "demo-eu",
      name: "Demo (dados sintéticos)",
      adapter: "demo",
      country: "DE",
      baseUrl: "https://example.org",
      enabled: false,
      notes:
        "Gera anúncios sintéticos para desenvolvimento — não toca em sites reais.",
    },
  });
}

export async function runForeignScrape(
  opts: ForeignRunOptions = {}
): Promise<ForeignRunSummary> {
  const deadline = opts.deadline ?? Number.POSITIVE_INFINITY;
  const maxPages = opts.maxPages ?? Number.POSITIVE_INFINITY;

  await ensureDefaultImportSources();

  const all = await prisma.importSource.findMany({
    where: opts.sources?.length
      ? { slug: { in: opts.sources } }
      : { enabled: true },
    orderBy: { slug: "asc" },
  });

  const summary: ForeignRunSummary = {
    skipped: false,
    cycleFinished: false,
    pages: 0,
    created: 0,
    updated: 0,
    deactivated: 0,
    comparisonsRefreshed: 0,
    perSource: {},
  };
  if (all.length === 0) {
    summary.skipped = true;
    return summary;
  }

  let cycle = (await getState<CycleState>(CYCLE_KEY)) ?? {
    startedAt: null,
    finishedAt: null,
  };

  if (opts.reset) {
    cycle = { startedAt: null, finishedAt: null };
    for (const s of all) await setState(sourceKey(s.slug), null);
  }

  if (!cycle.startedAt && cycle.finishedAt && !opts.reset) {
    const ageMs = Date.now() - new Date(cycle.finishedAt).getTime();
    if (ageMs < IMPORT_SCRAPE_INTERVAL_DAYS * 24 * 60 * 60 * 1000) {
      summary.skipped = true;
      return summary;
    }
  }

  if (!cycle.startedAt) {
    cycle = {
      startedAt: new Date().toISOString(),
      finishedAt: cycle.finishedAt,
    };
    await setState(CYCLE_KEY, cycle);
    for (const s of all) await setState(sourceKey(s.slug), null);
    console.log(`[import:ciclo] novo ciclo iniciado em ${cycle.startedAt}`);
  }

  for (const src of all) {
    const adapter = FOREIGN_ADAPTERS[src.adapter];
    const cfg: ForeignSourceConfig = {
      slug: src.slug,
      name: src.name,
      adapter: src.adapter,
      country: src.country,
      baseUrl: src.baseUrl,
    };
    const key = sourceKey(src.slug);
    const loaded = (await getState<Partial<SourceState>>(key)) ?? {};
    const state: SourceState = {
      cursor: loaded.cursor,
      finished: loaded.finished ?? false,
      pagesDone: loaded.pagesDone ?? 0,
      created: loaded.created ?? 0,
      updated: loaded.updated ?? 0,
      failStreak: loaded.failStreak ?? 0,
    };

    if (!adapter && !state.finished) {
      await logImport(
        src.slug,
        "ERROR",
        `Adaptador "${src.adapter}" não existe — fonte ignorada.`
      );
      state.finished = true;
      await setState(key, state);
    }

    while (
      !state.finished &&
      summary.pages < maxPages &&
      Date.now() < deadline
    ) {
      try {
        const result = await adapter!.scrapePage(
          cfg,
          state.cursor ?? undefined
        );
        for (const item of result.items) {
          const outcome = await upsertForeignListing(cfg, item);
          if (outcome === "created") state.created++;
          else state.updated++;
        }
        state.cursor = result.nextCursor;
        state.pagesDone++;
        state.failStreak = 0;
        summary.pages++;
        await logImport(
          src.slug,
          "INFO",
          `página ${state.pagesDone} — ${result.items.length} anúncios (total: ${state.created} novos, ${state.updated} atualizados)`
        );
        if (result.nextCursor === null) {
          state.finished = true;
          await logImport(
            src.slug,
            "INFO",
            `fonte terminada (${state.pagesDone} páginas)`
          );
        }
        await setState(key, state);
        await prisma.importSource
          .update({
            where: { id: src.id },
            data: { lastRunAt: new Date(), lastError: null },
          })
          .catch(() => {});
        if (!state.finished) await politeDelay();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await logImport(src.slug, "ERROR", msg);
        await prisma.importSource
          .update({
            where: { id: src.id },
            data: { lastRunAt: new Date(), lastError: msg.slice(0, 500) },
          })
          .catch(() => {});
        // robots.txt proibiu — não insistir neste ciclo
        if (err instanceof RobotsDisallowedError) {
          state.finished = true;
          await setState(key, state);
          break;
        }
        state.failStreak++;
        if (state.failStreak >= MAX_FAIL_STREAK) {
          state.finished = true;
          await logImport(
            src.slug,
            "ERROR",
            `${state.failStreak} falhas seguidas — desisto desta fonte até ao próximo ciclo`
          );
        }
        await setState(key, state);
        break;
      }
    }

    summary.perSource[src.slug] = {
      pagesDone: state.pagesDone,
      created: state.created,
      updated: state.updated,
      finished: state.finished,
    };
    summary.created += state.created;
    summary.updated += state.updated;
  }

  // ciclo completo? considera o universo das fontes ATIVAS
  const active = await prisma.importSource.findMany({
    where: { enabled: true },
    select: { slug: true },
  });
  const states = await Promise.all(
    active.map((s) => getState<SourceState>(sourceKey(s.slug)))
  );
  const allFinished =
    active.length > 0 && states.every((s) => s?.finished === true);

  if (allFinished && cycle.startedAt) {
    summary.deactivated = await deactivateStaleForeign(
      new Date(cycle.startedAt)
    );
    const dd = await dedupeForeignListings();
    const refreshed = await refreshImportComparisons({});
    summary.comparisonsRefreshed = refreshed.processed;
    const purged = await purgeOldImportLogs();
    await setState(CYCLE_KEY, {
      startedAt: null,
      finishedAt: new Date().toISOString(),
    });
    summary.cycleFinished = true;
    console.log(
      `[import:ciclo] completo — ${summary.deactivated} expirados · ` +
        `${dd.duplicates} duplicados escondidos · ` +
        `${refreshed.processed} comparações recalculadas · ${purged} logs limpos`
    );
  }

  return summary;
}
