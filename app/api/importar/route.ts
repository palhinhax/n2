import { NextResponse } from "next/server";
import {
  fetchImportPage,
  IMPORT_QUERY_KEYS,
  type ImportQuery,
} from "@/lib/import-listing";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const q: ImportQuery = {};
  for (const k of IMPORT_QUERY_KEYS) {
    const v = p.get(k);
    if (v) q[k] = v;
  }
  const offset = Math.max(0, Number(p.get("offset") ?? 0) || 0);
  const limit = Math.min(48, Number(p.get("limit") ?? PAGE_SIZE) || PAGE_SIZE);

  const page = await fetchImportPage(q, offset, limit);
  return NextResponse.json(page);
}
