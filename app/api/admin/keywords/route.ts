import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeKeyword,
  invalidateKeywordCache,
} from "@/lib/suspicious-keywords";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return null;
  return session;
}

const forbidden = () =>
  NextResponse.json({ error: "Apenas administradores." }, { status: 403 });

/** Lista as palavras suspeitas (mais recentes primeiro). */
export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  const keywords = await prisma.suspiciousKeyword.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ keywords });
}

/** Adiciona uma palavra/frase à lista. */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return forbidden();

  let word = "";
  try {
    const body = await req.json();
    word = normalizeKeyword(String(body?.word ?? ""));
  } catch {
    word = "";
  }
  if (word.length < 3)
    return NextResponse.json(
      { error: "Palavra demasiado curta (mínimo 3 letras)." },
      { status: 400 }
    );

  const keyword = await prisma.suspiciousKeyword.upsert({
    where: { word },
    update: {},
    create: { word },
  });
  invalidateKeywordCache();
  return NextResponse.json({ keyword });
}

/** Remove uma palavra da lista (a próxima análise limpa os anúncios). */
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return forbidden();

  let id = "";
  try {
    const body = await req.json();
    id = String(body?.id ?? "");
  } catch {
    id = "";
  }
  if (!id) return NextResponse.json({ error: "id em falta." }, { status: 400 });

  await prisma.suspiciousKeyword.delete({ where: { id } }).catch(() => {});
  invalidateKeywordCache();
  return NextResponse.json({ ok: true });
}
