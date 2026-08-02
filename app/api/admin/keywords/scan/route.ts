import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { scanKeywordFlags } from "@/lib/suspicious-keywords";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Reavalia todos os anúncios ativos contra a lista de palavras suspeitas.
 *  Marca os que fizeram match e limpa os que deixaram de fazer. */
export async function POST() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );

  const result = await scanKeywordFlags();
  return NextResponse.json(result);
}
