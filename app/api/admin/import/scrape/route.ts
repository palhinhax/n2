import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { runForeignScrape } from "../../../../../scripts/scraper/foreign/engine";
import { refreshImportComparisons } from "@/lib/import-listing";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Dispara um lote de scraping estrangeiro a partir do painel de admin.
 * body: { source?: string (slug), maxPages?: number, reset?: boolean,
 *         refreshOnly?: boolean (só recalcular comparações com PT) }
 */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const b = (await req.json().catch(() => ({}))) as {
    source?: string;
    maxPages?: number;
    reset?: boolean;
    refreshOnly?: boolean;
  };

  try {
    if (b.refreshOnly) {
      const r = await refreshImportComparisons({ maxListings: 5000 });
      return NextResponse.json({ ok: true, comparisonsRefreshed: r.processed });
    }
    const summary = await runForeignScrape({
      sources: b.source ? [b.source] : undefined,
      maxPages: b.maxPages ?? 30,
      reset: b.reset === true,
      deadline: Date.now() + 260_000,
    });
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[admin/import/scrape]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
