import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return null;
  return session;
}

/** Remove um anúncio externo do site. Fica na BD (histórico de preços,
 *  índice de mercado) mas sai de todas as listagens e a página passa a 404;
 *  o scraper nunca o reativa. */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdmin()))
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );

  const listing = await prisma.scrapedListing.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!listing)
    return NextResponse.json(
      { error: "Anúncio não encontrado." },
      { status: 404 }
    );

  await prisma.scrapedListing.update({
    where: { id: listing.id },
    data: { hiddenByAdmin: true, active: false },
  });
  return NextResponse.json({ ok: true });
}

/** Repõe um anúncio removido por engano (volta se ainda existir na origem). */
export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdmin()))
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );

  const listing = await prisma.scrapedListing.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!listing)
    return NextResponse.json(
      { error: "Anúncio não encontrado." },
      { status: 404 }
    );

  // active fica false — o próximo ciclo do scraper reativa-o se ainda existir
  await prisma.scrapedListing.update({
    where: { id: listing.id },
    data: { hiddenByAdmin: false },
  });
  return NextResponse.json({ ok: true });
}
