import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BASE =
  process.env.CARROS_API_BASE_URL ??
  "https://n2-py-scraper-production.up.railway.app";

const SOURCE_MAP: Record<string, string> = {
  STANDVIRTUAL: "standvirtual",
  OLX: "olx",
  PISCAPISCA: "piscapisca",
  AUTOSAPO: "autosapo",
};

type RemoteScrapeResponse = {
  message?: string;
  sources?: string[];
  detail?: string;
  error?: string;
  [key: string]: unknown;
};

function parseRemoteResponse(text: string): RemoteScrapeResponse {
  if (!text) return {};
  try {
    return JSON.parse(text) as RemoteScrapeResponse;
  } catch {
    return { message: text };
  }
}

/**
 * Dispara uma corrida de scraping dentro da API Carros PT.
 * body: { site?: "OLX"|"STANDVIRTUAL"|"PISCAPISCA"|"AUTOSAPO" }
 */
export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );
  }

  const apiKey = process.env.CARROS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "CARROS_API_KEY não está configurada." },
      { status: 500 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { site?: string };
  const source = body.site ? SOURCE_MAP[body.site.toUpperCase()] : undefined;
  const payload = source ? { sources: [source] } : undefined;

  try {
    const res = await fetch(new URL("/scrape/run", BASE), {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        ...(payload ? { "Content-Type": "application/json" } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    const data = parseRemoteResponse(text);

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail ?? data?.error ?? `HTTP ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[admin/carros-api/scrape]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
