import { NextResponse } from "next/server";
import { marketStats } from "@/lib/price-intel";
import { valuate } from "@/lib/valuation";

export const dynamic = "force-dynamic";

// Estimativa simples (compatibilidade): só estatísticas de mercado.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const brand = p.get("marca") ?? undefined;
  const model = p.get("modelo") ?? undefined;
  const year = p.get("ano") ? Number(p.get("ano")) : undefined;

  const stats = await marketStats({ brand, model, year });
  return NextResponse.json({ stats });
}

const posInt = (v: unknown): number | null => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const str = (v: unknown, max = 100): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

// Avaliação completa: estatísticas + comparáveis + análise por IA.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const marca = str(body.marca, 40);
  const modelo = str(body.modelo, 40);
  if (!marca || !modelo) {
    return NextResponse.json(
      { error: "Indica a marca e o modelo." },
      { status: 400 }
    );
  }

  const ano = posInt(body.ano);
  if (ano != null && (ano < 1950 || ano > new Date().getFullYear() + 1)) {
    return NextResponse.json({ error: "Ano inválido." }, { status: 400 });
  }

  const result = await valuate({
    marca,
    modelo,
    ano,
    km: posInt(body.km),
    fuel: str(body.fuel, 30),
    caixa: str(body.caixa, 30),
    versao: str(body.versao, 60),
    notas: str(body.notas, 500),
  });

  return NextResponse.json(result);
}
