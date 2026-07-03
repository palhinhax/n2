import { NextResponse } from "next/server";
import { fetchListingPage, type ListingQuery } from "@/lib/car-listing";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = url.searchParams;
  const q: ListingQuery = {
    marca: p.get("marca") ?? undefined,
    modelo: p.get("modelo") ?? undefined,
    precoMax: p.get("precoMax") ?? undefined,
    fuel: p.get("fuel") ?? undefined,
    caixa: p.get("caixa") ?? undefined,
    anoMin: p.get("anoMin") ?? undefined,
    kmMax: p.get("kmMax") ?? undefined,
    ordenar: p.get("ordenar") ?? undefined,
  };
  const offset = Math.max(0, Number(p.get("offset") ?? 0) || 0);
  const limit = Math.min(48, Number(p.get("limit") ?? PAGE_SIZE) || PAGE_SIZE);

  const page = await fetchListingPage(q, offset, limit);
  return NextResponse.json(page);
}
