import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ELECTRIFIED } from "@/lib/constants";

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

  // campos de texto/opcionais que podem vir vazios
  for (const k of ["version", "district", "description"]) {
    if (b[k] !== undefined) data[k] = b[k] || null;
  }
  if (b.negotiable !== undefined) data.negotiable = !!b.negotiable;

  // marca/modelo
  if (b.brandId !== undefined) data.brandId = +b.brandId;
  if (b.modelId !== undefined) data.modelId = +b.modelId;

  // numéricos
  if (b.year !== undefined) data.year = +b.year;
  if (b.km !== undefined) data.km = +b.km;
  if (b.power !== undefined) data.power = b.power ? +b.power : null;

  // combustível/caixa + autonomia (só faz sentido em elétricos/plug-in)
  if (b.fuel !== undefined) data.fuel = b.fuel;
  if (b.gearbox !== undefined) data.gearbox = b.gearbox;
  if (b.fuel !== undefined || b.evRange !== undefined) {
    const fuel = b.fuel ?? car!.fuel;
    data.evRange = ELECTRIFIED.includes(fuel) && b.evRange ? +b.evRange : null;
  }

  // fotos: substitui o conjunto completo pelo enviado
  if (Array.isArray(b.photos)) {
    data.photos = {
      deleteMany: {},
      create: b.photos.map((p: any, i: number) => ({
        key: p.key,
        url: p.url,
        position: i,
      })),
    };
  }

  // venda / preço
  if (b.forSale !== undefined) {
    data.forSale = !!b.forSale;
    if (b.forSale) {
      const price = +(b.price ?? car!.price ?? 0);
      if (!(price > 0))
        return NextResponse.json({ error: "Indica o preço." }, { status: 400 });
      data.price = price;
      data.status = "PENDING"; // volta à moderação sempre que é (re)colocado à venda
    } else {
      data.status = "GARAGE";
    }
  } else if (b.price !== undefined) {
    data.price = b.price ? +b.price : null;
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
