import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrSetVisitorId } from "@/lib/visitor";
import { recordEvent } from "@/lib/recommendations";

// Regista uma visita ao anúncio. Não conta o dono e deduplica a mesma
// pessoa (cookie) durante 6h, para "quantas pessoas viram" ser realista.
// Alimenta também o perfil de gosto usado nas recomendações da homepage.
const DEDUPE_MS = 6 * 60 * 60 * 1000; // 6 horas

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const car = await prisma.car.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      ownerId: true,
      forSale: true,
      status: true,
      fuel: true,
      gearbox: true,
      price: true,
      year: true,
      brand: { select: { name: true } },
      model: { select: { name: true } },
    },
  });
  if (!car)
    return NextResponse.json(
      { error: "Carro não encontrado." },
      { status: 404 }
    );

  // Só contam anúncios públicos.
  if (!(car.forSale && car.status === "APPROVED")) {
    return NextResponse.json({ ok: true, counted: false });
  }

  // Não contar o próprio dono a ver o seu anúncio.
  const session = await auth();
  if (session?.user?.id === car.ownerId) {
    return NextResponse.json({ ok: true, counted: false });
  }

  // Identificador de visitante (cookie de 1ª parte).
  const visitor = getOrSetVisitorId();

  // Deduplica: mesma pessoa + mesmo carro nas últimas 6h conta 1x.
  const recent = await prisma.carView.findFirst({
    where: {
      carId: car.id,
      visitorHash: visitor,
      createdAt: { gte: new Date(Date.now() - DEDUPE_MS) },
    },
    select: { id: true },
  });
  if (recent) return NextResponse.json({ ok: true, counted: false });

  await prisma.carView.create({
    data: { carId: car.id, visitorHash: visitor },
  });
  await recordEvent({
    visitorId: visitor,
    userId: session?.user?.id ?? null,
    kind: "VIEW",
    carId: car.id,
    brand: car.brand?.name,
    model: car.model?.name,
    fuel: car.fuel,
    gearbox: car.gearbox,
    price: car.price,
    year: car.year,
  });
  return NextResponse.json({ ok: true, counted: true });
}
