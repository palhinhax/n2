/**
 * CLI do scraper.
 *
 *   npm run scrape                        # ciclo completo (todas as fontes)
 *   npm run scrape -- --site OLX          # so uma fonte (OLX | STANDVIRTUAL | PISCAPISCA | AUTOSAPO | CARROS_API)
 *   npm run scrape -- --max-pages 5       # teste rapido: 5 paginas
 *   npm run scrape -- --reset             # recomeca o ciclo do zero
 */
import { runScrape } from "./engine";
import { dedupeListings } from "./dedupe";
import type { AdapterSource } from "./types";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const site = arg("site")?.toUpperCase() as AdapterSource | undefined;
  const maxPages = arg("max-pages") ? Number(arg("max-pages")) : undefined;
  const reset = process.argv.includes("--reset");

  console.log("A iniciar scraping...", {
    site: site ?? "todas",
    maxPages: maxPages ?? "infinito",
    reset,
  });
  const summary = await runScrape({
    sources: site ? [site] : undefined,
    maxPages,
    reset,
  });

  if (summary.skipped) {
    console.log(
      "Ciclo recente ja completo - nada a fazer (usa --reset para forcar)."
    );
    return;
  }
  console.log("\nResumo:");
  console.table(summary.perSource);
  console.log(
    `paginas: ${summary.pages} | novos: ${summary.created} | atualizados: ${summary.updated}` +
      (summary.cycleFinished
        ? ` | desativados: ${summary.deactivated} | CICLO COMPLETO`
        : "")
  );

  const dedupe = await dedupeListings();
  console.log(
    `dedup: ${dedupe.duplicates} duplicados escondidos (${dedupe.groups} grupos)`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
