/**
 * CLI do scraping de fontes estrangeiras (Importar carros da Europa).
 *
 * Uso:
 *   pnpm scrape:foreign                          # todas as fontes ativas
 *   pnpm scrape:foreign -- --source demo-eu      # uma fonte (mesmo desativada)
 *   pnpm scrape:foreign -- --max-pages 5         # limitar páginas
 *   pnpm scrape:foreign -- --reset               # recomeçar o ciclo
 *
 * As fontes gerem-se no painel de admin (/admin/importacao) ou via seed
 * automático (ensureDefaultImportSources) — as reais nascem desativadas.
 */

import { runForeignScrape } from "./engine";
import { prisma } from "../../../lib/prisma";

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const source = argValue("--source");
  const maxPages = argValue("--max-pages");
  const reset = process.argv.includes("--reset");

  const summary = await runForeignScrape({
    sources: source ? [source] : undefined,
    maxPages: maxPages ? Number(maxPages) : undefined,
    reset,
  });

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
