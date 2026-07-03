import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSetVisitorId } from "@/lib/visitor";
import { recordEvent } from "@/lib/recommendations";

// Regista uma visita a um anúncio externo — só para o perfil de gosto
// (as recomendações da homepage). Deduplica 6h como as views de carros.
const DEDUPE_MS = 6 * 60 * 60 * 1000;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const listing = await prisma.scrapedListing.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      brand: true,
      model: true,
      fuel: true,
      gearbox: true,
      price: true,
      year: true,
    },
  });
  if (!listing)
    return NextResponse.json(
      { error: "Anúncio não encontrado." },
      { status: 404 }
    );

  const session = await auth();
  const visitor = getOrSetVisitorId();

  const recent = await prisma.browseEvent.findFirst({
    where: {
      visitorId: visitor,
      listingId: listing.id,
      kind: "VIEW",
      createdAt: { gte: new Date(Date.now() - DEDUPE_MS) },
    },
    select: { id: true },
  });
  if (recent) return NextResponse.json({ ok: true, counted: false });

  await recordEvent({
    visitorId: visitor,
    userId: session?.user?.id ?? null,
    kind: "VIEW",
    listingId: listing.id,
    brand: listing.brand,
    model: listing.model,
    fuel: listing.fuel,
    gearbox: listing.gearbox,
    price: listing.price,
    year: listing.year,
  });
  return NextResponse.json({ ok: true, counted: true });
}
