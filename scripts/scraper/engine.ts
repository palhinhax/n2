import { politeDelay } from "./http";
import { olx } from "./sites/olx";
import { piscapisca } from "./sites/piscapisca";
import { standvirtual } from "./sites/standvirtual";
import { deactivateStale, getState, setState, upsertListing } from "./store";
import type { SiteAdapter, Source } from "./types";

export const ADAPTERS: SiteAdapter[] = [standvirtual, piscapisca, olx];

export const SCRAPE_INTERVAL_DAYS = Number(
  process.env.SCRAPE_INTERVAL_DAYS ?? 3
);

interface CycleState {
  startedAt: string | null; // ciclo em curso
  finishedAt: string | null; // último ciclo completo
}

interface SourceState {
  cursor: unknown;
  finished: boolean;
  pagesDone: number;
  created: number;
  updated: number;
}

export interface RunOptions {
  sources?: Source[]; // default: todas
  maxPages?: number; // nº máx. de páginas nesta invocação (todas as fontes somadas)
  deadline?: number; // Date.now() limite (para serverless)
  reset?: boolean; // recomeça o ciclo do zero
}

export interface RunSummary {
  skipped: boolean;
  cycleFinished: boolean;
  pages: number;
  created: number;
  updated: number;
  deactivated: number;
  perSource: Record<
    string,
    { pagesDone: number; created: number; updated: number; finished: boolean }
  >;
}

const CYCLE_KEY = "cycle";
const sourceKey = (s: Source) => `source:${s}`;

export async function runScrape(opts: RunOptions = {}): Promise<RunSummary> {
  const deadline = opts.deadline ?? Number.POSITIVE_INFINITY;
  const maxPages = opts.maxPages ?? Number.POSITIVE_INFINITY;
  const adapters = opts.sources?.length
    ? ADAPTERS.filter((a) => opts.sources!.includes(a.name))
    : ADAPTERS;

  const summary: RunSummary = {
    skipped: false,
    cycleFinished: false,
    pages: 0,
    created: 0,
    updated: 0,
    deactivated: 0,
    perSource: {},
  };

  let cycle = (await getState<CycleState>(CYCLE_KEY)) ?? {
    startedAt: null,
    finishedAt: null,
  };

  if (opts.reset) {
    cycle = { startedAt: null, finishedAt: null };
    for (const a of ADAPTERS) await setState(sourceKey(a.name), null);
  }

  // ciclo anterior terminou há menos de SCRAPE_INTERVAL_DAYS? então não faz nada
  if (!cycle.startedAt && cycle.finishedAt) {
    const ageMs = Date.now() - new Date(cycle.finishedAt).getTime();
    if (ageMs < SCRAPE_INTERVAL_DAYS * 24 * 60 * 60 * 1000 && !opts.reset) {
      summary.skipped = true;
      return summary;
    }
  }

  // inicia novo ciclo se necessário
  if (!cycle.startedAt) {
    cycle = {
      startedAt: new Date().toISOString(),
      finishedAt: cycle.finishedAt,
    };
    await setState(CYCLE_KEY, cycle);
    for (const a of adapters) await setState(sourceKey(a.name), null);
    console.log(`[ciclo] novo ciclo iniciado em ${cycle.startedAt}`);
  }

  for (const adapter of adapters) {
    const key = sourceKey(adapter.name);
    const state: SourceState = (await getState<SourceState>(key)) ?? {
      cursor: undefined,
      finished: false,
      pagesDone: 0,
      created: 0,
      updated: 0,
    };

    while (
      !state.finished &&
      summary.pages < maxPages &&
      Date.now() < deadline
    ) {
      try {
        const result = await adapter.scrapePage(state.cursor ?? undefined);
        for (const item of result.items) {
          const outcome = await upsertListing(item);
          if (outcome === "created") state.created++;
          else state.updated++;
        }
        state.cursor = result.nextCursor;
        state.pagesDone++;
        summary.pages++;
        if (result.nextCursor === null) {
          state.finished = true;
          console.log(
            `[${adapter.name}] terminado (${state.pagesDone} páginas)`
          );
        }
        await setState(key, state);
        if (!state.finished) await politeDelay();
      } catch (err) {
        console.error(
          `[${adapter.name}] erro na página ${state.pagesDone + 1}:`,
          err
        );
        await setState(key, state);
        break; // passa à fonte seguinte; retoma na próxima invocação
      }
    }

    summary.perSource[adapter.name] = {
      pagesDone: state.pagesDone,
      created: state.created,
      updated: state.updated,
      finished: state.finished,
    };
    summary.created += state.created;
    summary.updated += state.updated;
  }

  // todas as fontes (do universo completo, não só as selecionadas) terminaram?
  const allStates = await Promise.all(
    ADAPTERS.map((a) => getState<SourceState>(sourceKey(a.name)))
  );
  const allFinished = allStates.every((s) => s?.finished);

  if (allFinished && cycle.startedAt) {
    summary.deactivated = await deactivateStale(new Date(cycle.startedAt));
    await setState(CYCLE_KEY, {
      startedAt: null,
      finishedAt: new Date().toISOString(),
    });
    summary.cycleFinished = true;
    console.log(
      `[ciclo] completo — ${summary.deactivated} anúncios desativados`
    );
  }

  return summary;
}
