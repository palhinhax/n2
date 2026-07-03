import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureListingDetail } from "@/lib/scraped-detail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Força a re-recolha dos detalhes de um anúncio externo (ignora o cache). */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );
  }

  const listing = await prisma.scrapedListing.findUnique({
    where: { id: params.id },
  });
  if (!listing) {
    return NextResponse.json(
      { error: "Anúncio não encontrado." },
      { status: 404 }
    );
  }

  // limpa o timestamp para o enriquecimento correr de novo
  await prisma.scrapedListing.update({
    where: { id: listing.id },
    data: { detailsFetchedAt: null },
  });

  try {
    const updated = await ensureListingDetail({
      ...listing,
      detailsFetchedAt: null,
    });
    return NextResponse.json({
      ok: true,
      photos: updated ? JSON.parse(updated.imageUrls || "[]").length : 0,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
