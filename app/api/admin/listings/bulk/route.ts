import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseSuspiciousReasons,
  SUSPICION_REASONS,
} from "@/lib/listing-quality";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IDS = 200;

/** Ações em massa sobre anúncios externos (seleção no /admin/suspeitos):
 *  - "exempt": marca todos como "é mesmo um carro" (remove a razão
 *    palavra_suspeita e isenta das palavras futuras)
 *  - "hide": remove todos do site (hiddenByAdmin, o scraper não os reativa) */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );

  let ids: string[] = [];
  let action = "";
  try {
    const body = await req.json();
    ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
    action = String(body?.action ?? "");
  } catch {
    // body inválido → cai na validação abaixo
  }
  if (
    !ids.length ||
    ids.length > MAX_IDS ||
    !["exempt", "hide"].includes(action)
  )
    return NextResponse.json(
      { error: `Pedido inválido (1–${MAX_IDS} ids, action exempt|hide).` },
      { status: 400 }
    );

  if (action === "hide") {
    const res = await prisma.scrapedListing.updateMany({
      where: { id: { in: ids } },
      data: { hiddenByAdmin: true, active: false },
    });
    return NextResponse.json({ ok: true, count: res.count });
  }

  // exempt: as razões variam por anúncio — recalcula uma a uma
  const rows = await prisma.scrapedListing.findMany({
    where: { id: { in: ids } },
    select: { id: true, suspiciousReasons: true },
  });
  // $transaction em vez de Promise.all — 200 updates paralelos esgotariam a
  // pool de ligações do Neon
  await prisma.$transaction(
    rows.map((r) => {
      const reasons = parseSuspiciousReasons(r.suspiciousReasons).filter(
        (reason) => reason !== SUSPICION_REASONS.keyword
      );
      return prisma.scrapedListing.update({
        where: { id: r.id },
        data: {
          keywordExempt: true,
          suspicious: reasons.length > 0,
          suspiciousReasons: JSON.stringify(reasons),
        },
      });
    })
  );
  return NextResponse.json({ ok: true, count: rows.length });
}
