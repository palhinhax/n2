import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const { carId, type, title, dueDate, notes } = await req.json();
  if (!carId || !type || !title || !dueDate)
    return NextResponse.json({ error: "Campos em falta." }, { status: 400 });
  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car || car.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const r = await prisma.reminder.create({
    data: {
      carId,
      type,
      title,
      dueDate: new Date(dueDate),
      notes: notes || null,
    },
  });
  return NextResponse.json({ ok: true, id: r.id });
}
