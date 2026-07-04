import { NextResponse } from "next/server";
import { getModelReport } from "@/lib/purchase-report";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Problemas conhecidos de um modelo (IA, cacheado por marca+modelo+fuel).
 * Público (sem sessão): o resultado é partilhado e cacheado na BD, por isso
 * o custo de IA é ~1 chamada por modelo/semestre, não por utilizador.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const brand = url.searchParams.get("marca") ?? "";
  const model = url.searchParams.get("modelo") ?? "";
  const fuel = url.searchParams.get("fuel");

  if (!brand.trim() || !model.trim())
    return NextResponse.json(
      { error: "marca e modelo obrigatórios" },
      { status: 400 }
    );

  const report = await getModelReport(brand, model, fuel);
  return NextResponse.json({ report });
}
