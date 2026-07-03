import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runScrape } from "../../../../scripts/scraper/engine";
import type { Source } from "../../../../scripts/scraper/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Dispara um lote de scraping a partir do painel de admin.
 * body: { site?: "OLX"|"STANDVIRTUAL"|"PISCAPISCA", maxPages?: number, reset?: boolean }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    site?: string;
    maxPages?: number;
    reset?: boolean;
  };

  const site = body.site?.toUpperCase() as Source | undefined;
  const maxPages = body.maxPages ?? 40; // lote curto para caber no tempo da função

  try {
    const summary = await runScrape({
      sources: site ? [site] : undefined,
      maxPages,
      reset: body.reset === true,
      deadline: Date.now() + 260_000,
    });
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[admin/scrape]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
