import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseSuspiciousReasons,
  SUSPICION_REASONS,
} from "@/lib/listing-quality";

export const dynamic = "force-dynamic";

/** Marca um anúncio como "é mesmo um carro" — remove a razão palavra_suspeita
 *  e as palavras suspeitas deixam de o apanhar (scan e scraper ignoram-no).
 *  Com { exempt: false } volta a ficar sujeito às palavras. */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );

  let exempt = true;
  try {
    const body = await req.json();
    if (typeof body?.exempt === "boolean") exempt = body.exempt;
  } catch {
    // sem body → isentar
  }

  const listing = await prisma.scrapedListing.findUnique({
    where: { id: params.id },
    select: { id: true, suspiciousReasons: true },
  });
  if (!listing)
    return NextResponse.json(
      { error: "Anúncio não encontrado." },
      { status: 404 }
    );

  if (exempt) {
    const reasons = parseSuspiciousReasons(listing.suspiciousReasons).filter(
      (r) => r !== SUSPICION_REASONS.keyword
    );
    await prisma.scrapedListing.update({
      where: { id: listing.id },
      data: {
        keywordExempt: true,
        suspicious: reasons.length > 0,
        suspiciousReasons: JSON.stringify(reasons),
      },
    });
  } else {
    // a próxima análise (ou passagem do scraper) volta a avaliá-lo
    await prisma.scrapedListing.update({
      where: { id: listing.id },
      data: { keywordExempt: false },
    });
  }
  return NextResponse.json({ ok: true, exempt });
}
