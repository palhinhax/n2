import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSetVisitorId } from "@/lib/visitor";
import { recordEvent } from "@/lib/recommendations";

// Regista uma pesquisa com filtros (marca, preço, ano…) para o perfil de
// gosto. A mesma pesquisa do mesmo visitante em 30 min conta 1x.
const DEDUPE_MS = 30 * 60 * 1000;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const str = (k: string) => {
    const v = body[k];
    return typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : null;
  };
  const num = (k: string) => {
    const v = Number(body[k]);
    return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  };

  const marca = str("marca");
  const modelo = str("modelo");
  const fuel = str("fuel");
  const caixa = str("caixa");
  const precoMax = num("precoMax");
  const anoMin = num("anoMin");

  // pesquisa sem nenhum filtro útil não diz nada sobre o gosto
  if (!marca && !modelo && !fuel && !caixa && !precoMax && !anoMin) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const session = await auth();
  const visitor = getOrSetVisitorId();

  const signature = JSON.stringify({
    marca,
    modelo,
    fuel,
    caixa,
    precoMax,
    anoMin,
  });

  const recent = await prisma.browseEvent.findFirst({
    where: {
      visitorId: visitor,
      kind: "SEARCH",
      query: signature,
      createdAt: { gte: new Date(Date.now() - DEDUPE_MS) },
    },
    select: { id: true },
  });
  if (recent) return NextResponse.json({ ok: true, counted: false });

  await recordEvent({
    visitorId: visitor,
    userId: session?.user?.id ?? null,
    kind: "SEARCH",
    brand: marca,
    model: modelo,
    fuel,
    gearbox: caixa,
    price: precoMax,
    year: anoMin,
    query: signature,
  });
  return NextResponse.json({ ok: true, counted: true });
}
