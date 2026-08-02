import { politeDelay } from "./http";
import { olx } from "./sites/olx";
import { piscapisca } from "./sites/piscapisca";
import { standvirtual } from "./sites/standvirtual";
import { autosapo } from "./sites/autosapo";
import { carrosApi } from "./sites/carros-api";
import { deactivateStale, getState, setState, upsertListing } from "./store";
import { dedupeListings } from "./dedupe";
import type { AdapterSource, SiteAdapter } from "./types";

export const ADAPTERS: SiteAdapter[] = [
  standvirtual,
  piscapisca,
  olx,
  autosapo,
  carrosApi,
];

/** Pausa entre ciclos completos, em horas. `SCRAPE_INTERVAL_DAYS` continua a
 * ser aceite (em dias) para nao partir configs antigas. */
export const SCRAPE_INTERVAL_HOURS = (() => {
  if (process.env.SCRAPE_INTERVAL_HOURS != null)
    return Number(process.env.SCRAPE_INTERVAL_HOURS);
  if (process.env.SCRAPE_INTERVAL_DAYS != null)
    return Number(process.env.SCRAPE_INTERVAL_DAYS) * 24;
  return 2;
})();

interface CycleState {
  startedAt: string | null; // ciclo em curso
  finishedAt: string | null; // ultimo ciclo completo
}

interface SourceState {
  cursor: unknown;
  finished: boolean;
  pagesDone: number;
  created: number;
  updated: number;
  failStreak: number; // invocacoes seguidas a falhar nesta fonte
}

/** Falhas consecutivas a partir das quais a fonte desiste do ciclo atual. */
const MAX_FAIL_STREAK = 3;

export interface RunOptions {
  sources?: AdapterSource[]; // default: todas
  maxPages?: number; // numero maximo de paginas nesta invocacao
  deadline?: number; // Date.now() limite (para serverless)
  reset?: boolean; // recomeca o ciclo do zero
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
const sourceKey = (s: AdapterSource) => `source:${s}`;

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

  if (!cycle.startedAt && cycle.finishedAt) {
    const ageMs = Date.now() - new Date(cycle.finishedAt).getTime();
    if (ageMs < SCRAPE_INTERVAL_HOURS * 60 * 60 * 1000 && !opts.reset) {
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
    for (const a of adapters) await setState(sourceKey(a.name), null);
    console.log(`[ciclo] novo ciclo iniciado em ${cycle.startedAt}`);
  }

  const runAdapter = async (adapter: SiteAdapter): Promise<SourceState> => {
    const key = sourceKey(adapter.name);
    const loaded = (await getState<Partial<SourceState>>(key)) ?? {};
    const state: SourceState = {
      cursor: loaded.cursor,
      finished: loaded.finished ?? false,
      pagesDone: loaded.pagesDone ?? 0,
      created: loaded.created ?? 0,
      updated: loaded.updated ?? 0,
      failStreak: loaded.failStreak ?? 0,
    };

    while (
      !state.finished &&
      summary.pages < maxPages &&
      Date.now() < deadline
    ) {
      summary.pages++;
      try {
        const result = await adapter.scrapePage(state.cursor ?? undefined);
        for (const item of result.items) {
          const outcome = await upsertListing(item);
          if (outcome === "created") state.created++;
          else state.updated++;
        }
        state.cursor = result.nextCursor;
        state.pagesDone++;
        state.failStreak = 0;
        console.log(
          `[${adapter.name}] pagina ${state.pagesDone} - ${result.items.length} anuncios ` +
            `(total: ${state.created} novos, ${state.updated} atualizados)`
        );
        if (result.nextCursor === null) {
          state.finished = true;
          console.log(
            `[${adapter.name}] terminado (${state.pagesDone} paginas)`
          );
        }
        await setState(key, state);
        if (!state.finished) await politeDelay();
      } catch (err) {
        console.error(
          `[${adapter.name}] erro na pagina ${state.pagesDone + 1}:`,
          err
        );
        state.failStreak++;
        if (state.failStreak >= MAX_FAIL_STREAK) {
          state.finished = true;
          console.error(
            `[${adapter.name}] ${state.failStreak} invocacoes seguidas a falhar - desisto desta fonte ate ao proximo ciclo`
          );
        }
        await setState(key, state);
        break;
      }
    }
    return state;
  };

  const states = await Promise.all(adapters.map(runAdapter));
  adapters.forEach((adapter, i) => {
    const state = states[i];
    summary.perSource[adapter.name] = {
      pagesDone: state.pagesDone,
      created: state.created,
      updated: state.updated,
      finished: state.finished,
    };
    summary.created += state.created;
    summary.updated += state.updated;
  });

  const allStates = await Promise.all(
    ADAPTERS.map((a) => getState<SourceState>(sourceKey(a.name)))
  );
  const allFinished = allStates.every((s) => s?.finished);

  if (allFinished && cycle.startedAt) {
    summary.deactivated = await deactivateStale(new Date(cycle.startedAt));
    const dedupe = await dedupeListings();
    await setState(CYCLE_KEY, {
      startedAt: null,
      finishedAt: new Date().toISOString(),
    });
    summary.cycleFinished = true;
    console.log(
      `[ciclo] completo - ${summary.deactivated} desativados · ` +
        `${dedupe.duplicates} duplicados escondidos (${dedupe.groups} grupos)`
    );
  }

  return summary;
}
