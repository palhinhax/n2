import { NextResponse } from "next/server";
import { searchSite } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    const data = await searchSite(q);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json(
      { brand: null, model: null, brandHref: null, results: [] },
      { status: 200 }
    );
  }
}
