import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CAR_EVENT_TYPES } from "@/lib/constants";

// Cria um registo no historial documentado de um carro (só o dono).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });

  const b = await req.json();
  if (!b.carId || !b.date || !CAR_EVENT_TYPES.includes(b.type)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const date = new Date(b.date);
  if (isNaN(date.getTime()))
    return NextResponse.json({ error: "Data inválida." }, { status: 400 });

  const car = await prisma.car.findUnique({ where: { id: b.carId } });
  if (!car || car.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const event = await prisma.carEvent.create({
    data: {
      carId: b.carId,
      type: b.type,
      date,
      km: b.km ? +b.km : null,
      cost: b.cost ? Math.round(+b.cost) : null,
      note: b.note?.slice(0, 500) || null,
    },
  });
  return NextResponse.json({ ok: true, id: event.id });
}
