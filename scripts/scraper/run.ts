/**
 * CLI do scraper.
 *
 *   npm run scrape                        # ciclo completo (todas as fontes)
 *   npm run scrape -- --site OLX          # só uma fonte (OLX | STANDVIRTUAL | PISCAPISCA)
 *   npm run scrape -- --max-pages 5       # teste rápido: 5 páginas
 *   npm run scrape -- --reset             # recomeça o ciclo do zero
 */
import { runScrape } from "./engine";
import type { Source } from "./types";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const site = arg("site")?.toUpperCase() as Source | undefined;
  const maxPages = arg("max-pages") ? Number(arg("max-pages")) : undefined;
  const reset = process.argv.includes("--reset");

  console.log("A iniciar scraping…", {
    site: site ?? "todas",
    maxPages: maxPages ?? "∞",
    reset,
  });
  const summary = await runScrape({
    sources: site ? [site] : undefined,
    maxPages,
    reset,
  });

  if (summary.skipped) {
    console.log(
      "Ciclo recente já completo — nada a fazer (usa --reset para forçar)."
    );
    return;
  }
  console.log("\nResumo:");
  console.table(summary.perSource);
  console.log(
    `páginas: ${summary.pages} | novos: ${summary.created} | atualizados: ${summary.updated}` +
      (summary.cycleFinished
        ? ` | desativados: ${summary.deactivated} | CICLO COMPLETO`
        : "")
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
