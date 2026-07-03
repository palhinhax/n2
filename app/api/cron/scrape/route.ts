import { NextResponse } from "next/server";
import { runScrape } from "../../../../scripts/scraper/engine";
import { purgeOldEvents } from "@/lib/recommendations";

/**
 * Endpoint chamado pelo Vercel Cron (ver vercel.json).
 *
 * Como uma função serverless não pode correr horas, cada invocação processa
 * um lote de páginas e guarda o cursor na BD (ScrapeState). O cron corre com
 * frequência (ex. de 2 em 2 horas) e:
 *  - se o último ciclo completo tem menos de SCRAPE_INTERVAL_DAYS (3), sai logo;
 *  - caso contrário, continua o ciclo de onde ficou.
 *
 * Env vars necessárias na Vercel: CRON_SECRET, DATABASE_URL (Postgres!).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Fluid compute; ajusta ao teu plano

const BATCH_PAGES = Number(process.env.SCRAPE_BATCH_PAGES ?? 120);
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
    // manutenção: eventos de navegação antigos já não influenciam o perfil
    const purged = await purgeOldEvents().catch(() => 0);

    const summary = await runScrape({
      maxPages: BATCH_PAGES,
      deadline: Date.now() + TIME_BUDGET_MS,
    });
    return NextResponse.json({ ...summary, purgedBrowseEvents: purged });
  } catch (err) {
    console.error("[cron/scrape]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
