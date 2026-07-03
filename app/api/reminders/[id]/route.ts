import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function owned(id: string) {
  const session = await auth();
  if (!session?.user)
    return {
      err: NextResponse.json({ error: "Sessão necessária." }, { status: 401 }),
    };
  const r = await prisma.reminder.findUnique({
    where: { id },
    include: { car: true },
  });
  if (!r)
    return {
      err: NextResponse.json({ error: "Não encontrado." }, { status: 404 }),
    };
  if (r.car.ownerId !== session.user.id)
    return {
      err: NextResponse.json({ error: "Sem permissão." }, { status: 403 }),
    };
  return { r };
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { r, err } = await owned(params.id);
  if (err) return err;
  const b = await req.json();
  await prisma.reminder.update({
    where: { id: r!.id },
    data: { done: b.done ?? r!.done },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { r, err } = await owned(params.id);
  if (err) return err;
  await prisma.reminder.delete({ where: { id: r!.id } });
  return NextResponse.json({ ok: true });
}
