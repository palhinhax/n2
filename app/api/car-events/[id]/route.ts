import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Apaga um registo do historial (só o dono do carro).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });

  const event = await prisma.carEvent.findUnique({
    where: { id: params.id },
    include: { car: { select: { ownerId: true } } },
  });
  if (!event)
    return NextResponse.json(
      { error: "Registo não encontrado." },
      { status: 404 }
    );
  if (event.car.ownerId !== session.user.id)
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  await prisma.carEvent.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
