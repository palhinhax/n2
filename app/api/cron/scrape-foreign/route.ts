import { NextResponse } from "next/server";
import { runForeignScrape } from "../../../../scripts/scraper/foreign/engine";

/**
 * Cron do scraping de fontes estrangeiras (ver vercel.json). Mesma mecânica
 * do /api/cron/scrape: cada invocação processa um lote e guarda o cursor;
 * quando o ciclo fecha, expira anúncios desaparecidos, esconde duplicados e
 * recalcula a comparação com o mercado português.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_PAGES = Number(process.env.IMPORT_SCRAPE_BATCH_PAGES ?? 60);
const TIME_BUDGET_MS = (maxDuration - 40) * 1000;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runForeignScrape({
      maxPages: BATCH_PAGES,
      deadline: Date.now() + TIME_BUDGET_MS,
    });
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[cron/scrape-foreign]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
