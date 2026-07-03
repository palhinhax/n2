import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Guarda o carro nos favoritos (também conta como "like").
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });

  const car = await prisma.car.findUnique({
    where: { id: params.id },
    select: { price: true },
  });
  if (!car)
    return NextResponse.json(
      { error: "Carro não encontrado." },
      { status: 404 }
    );

  await prisma.favorite.upsert({
    where: { userId_carId: { userId: session.user.id, carId: params.id } },
    update: {},
    create: {
      userId: session.user.id,
      carId: params.id,
      priceWhenSaved: car.price ?? null,
      seenPrice: car.price ?? null,
    },
  });
  return NextResponse.json({ ok: true, favorited: true });
}

// Remove dos favoritos.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });

  await prisma.favorite.deleteMany({
    where: { userId: session.user.id, carId: params.id },
  });
  return NextResponse.json({ ok: true, favorited: false });
}
