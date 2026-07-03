import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json(
      { error: "Inicia sessão para fazer uma oferta." },
      { status: 401 }
    );
  const { carId, amount, message } = await req.json();
  if (!carId || !(amount > 0))
    return NextResponse.json({ error: "Oferta inválida." }, { status: 400 });
  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car || !car.forSale || car.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Este carro não está disponível para ofertas." },
      { status: 400 }
    );
  }
  if (car.ownerId === session.user.id) {
    return NextResponse.json(
      { error: "Não podes fazer ofertas ao teu próprio carro." },
      { status: 400 }
    );
  }
  const offer = await prisma.offer.create({
    data: {
      carId,
      buyerId: session.user.id,
      amount: +amount,
      message: message || null,
    },
  });
  return NextResponse.json({ ok: true, id: offer.id });
}
