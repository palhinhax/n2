import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const { status } = await req.json();
  if (!["ACCEPTED", "REJECTED", "WITHDRAWN"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  const offer = await prisma.offer.findUnique({
    where: { id: params.id },
    include: { car: true },
  });
  if (!offer)
    return NextResponse.json(
      { error: "Oferta não encontrada." },
      { status: 404 }
    );
  const isOwner = offer.car.ownerId === session.user.id;
  const isBuyer = offer.buyerId === session.user.id;
  const isAdmin = (session.user as any).role === "ADMIN";
  if (status === "WITHDRAWN" ? !isBuyer : !isOwner && !isAdmin) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  await prisma.offer.update({ where: { id: params.id }, data: { status } });
  return NextResponse.json({ ok: true });
}
