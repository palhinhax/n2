import { NextResponse } from "next/server";
import { marketStats } from "@/lib/price-intel";

export const dynamic = "force-dynamic";

// Estimativa de valor de mercado para um carro (a partir do inventário agregado).
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const brand = p.get("marca") ?? undefined;
  const model = p.get("modelo") ?? undefined;
  const year = p.get("ano") ? Number(p.get("ano")) : undefined;

  const stats = await marketStats({ brand, model, year });
  return NextResponse.json({ stats });
}
