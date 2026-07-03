import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );
  }
  const { status } = await req.json();
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  await prisma.car.update({
    where: { id: params.id },
    data: { status, forSale: status === "APPROVED" },
  });
  return NextResponse.json({ ok: true });
}
