import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSetVisitorId } from "@/lib/visitor";
import { recordEvent } from "@/lib/recommendations";

export const dynamic = "force-dynamic";

// IDs guardados pelo utilizador (carros do site + anúncios externos).
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ cars: [], listings: [] });

  const favs = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    select: { carId: true, listingId: true },
  });
  return NextResponse.json({
    cars: favs.filter((f) => f.carId).map((f) => f.carId),
    listings: favs.filter((f) => f.listingId).map((f) => f.listingId),
  });
}

// Alterna (guarda/remove) um favorito. body: { kind: "car"|"listing", id }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });

  const { kind, id } = await req.json();
  if (!id || (kind !== "car" && kind !== "listing")) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const userId = session.user.id;

  if (kind === "car") {
    const existing = await prisma.favorite.findUnique({
      where: { userId_carId: { userId, carId: id } },
      select: { id: true },
    });
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ favorited: false });
    }
    const car = await prisma.car.findUnique({
      where: { id },
      select: {
        price: true,
        fuel: true,
        gearbox: true,
        year: true,
        brand: { select: { name: true } },
        model: { select: { name: true } },
      },
    });
    if (!car)
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    await prisma.favorite.create({
      data: {
        userId,
        carId: id,
        priceWhenSaved: car.price,
        seenPrice: car.price,
      },
    });
    // sinal forte para o perfil de gosto (recomendações da homepage)
    await recordEvent({
      visitorId: getOrSetVisitorId(),
      userId,
      kind: "FAVORITE",
      carId: id,
      brand: car.brand?.name,
      model: car.model?.name,
      fuel: car.fuel,
      gearbox: car.gearbox,
      price: car.price,
      year: car.year,
    });
    return NextResponse.json({ favorited: true });
  }

  // kind === "listing"
  const existing = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId, listingId: id } },
    select: { id: true },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }
  const listing = await prisma.scrapedListing.findUnique({
    where: { id },
    select: {
      price: true,
      brand: true,
      model: true,
      fuel: true,
      gearbox: true,
      year: true,
    },
  });
  if (!listing)
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  await prisma.favorite.create({
    data: {
      userId,
      listingId: id,
      priceWhenSaved: listing.price,
      seenPrice: listing.price,
    },
  });
  await recordEvent({
    visitorId: getOrSetVisitorId(),
    userId,
    kind: "FAVORITE",
    listingId: id,
    brand: listing.brand,
    model: listing.model,
    fuel: listing.fuel,
    gearbox: listing.gearbox,
    price: listing.price,
    year: listing.year,
  });
  return NextResponse.json({ favorited: true });
}
