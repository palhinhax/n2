import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function ownedCar(id: string) {
  const session = await auth();
  if (!session?.user)
    return {
      err: NextResponse.json({ error: "Sessão necessária." }, { status: 401 }),
    };
  const car = await prisma.car.findUnique({ where: { id } });
  if (!car)
    return {
      err: NextResponse.json(
        { error: "Carro não encontrado." },
        { status: 404 }
      ),
    };
  if (
    car.ownerId !== session.user.id &&
    (session.user as any).role !== "ADMIN"
  ) {
    return {
      err: NextResponse.json({ error: "Sem permissão." }, { status: 403 }),
    };
  }
  return { car, session };
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { car, err } = await ownedCar(params.id);
  if (err) return err;
  const b = await req.json();
  const data: any = {};
  for (const k of [
    "version",
    "km",
    "power",
    "evRange",
    "district",
    "description",
    "negotiable",
  ]) {
    if (b[k] !== undefined) data[k] = b[k];
  }
  if (b.forSale !== undefined) {
    data.forSale = !!b.forSale;
    if (b.forSale) {
      const price = +(b.price ?? car!.price ?? 0);
      if (!(price > 0))
        return NextResponse.json({ error: "Indica o preço." }, { status: 400 });
      data.price = price;
      // volta à moderação sempre que é (re)colocado à venda
      data.status = "PENDING";
    } else {
      data.status = "GARAGE";
    }
  } else if (b.price !== undefined) {
    data.price = +b.price;
  }
  const updated = await prisma.car.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, status: updated.status });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { err } = await ownedCar(params.id);
  if (err) return err;
  await prisma.car.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
