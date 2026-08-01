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
  const body = await req.json().catch(() => ({}));
  const data: any = {};

  // moderação
  if (body.status !== undefined) {
    if (!["APPROVED", "REJECTED"].includes(body.status)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }
    data.status = body.status;
    data.forSale = body.status === "APPROVED";
    // um anúncio rejeitado nunca fica em destaque
    if (body.status === "REJECTED") {
      data.featured = false;
      data.featuredAt = null;
    }
  }

  // destaque editorial
  if (body.featured !== undefined) {
    if (typeof body.featured !== "boolean") {
      return NextResponse.json(
        { error: "Destaque inválido." },
        { status: 400 }
      );
    }
    if (body.featured) {
      // só faz sentido destacar um anúncio publicado
      const car = await prisma.car.findUnique({
        where: { id: params.id },
        select: { status: true, forSale: true },
      });
      const willBeApproved = data.status === "APPROVED";
      if (
        !car ||
        (!willBeApproved && (car.status !== "APPROVED" || !car.forSale))
      ) {
        return NextResponse.json(
          { error: "Só é possível destacar anúncios aprovados e à venda." },
          { status: 400 }
        );
      }
    }
    data.featured = body.featured;
    data.featuredAt = body.featured ? new Date() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para alterar." }, { status: 400 });
  }

  await prisma.car.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}
