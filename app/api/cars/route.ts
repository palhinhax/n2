import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CAR_COLORS, ELECTRIFIED } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const b = await req.json();
  if (
    !b.brandId ||
    !b.modelId ||
    !b.year ||
    b.km == null ||
    !b.fuel ||
    !b.gearbox
  ) {
    return NextResponse.json(
      { error: "Campos obrigatórios em falta." },
      { status: 400 }
    );
  }
  const forSale = !!b.forSale;
  if (forSale && !(b.price > 0))
    return NextResponse.json(
      { error: "Indica o preço de venda." },
      { status: 400 }
    );
  const car = await prisma.car.create({
    data: {
      ownerId: session.user.id,
      brandId: +b.brandId,
      modelId: +b.modelId,
      version: b.version || null,
      year: +b.year,
      km: +b.km,
      fuel: b.fuel,
      gearbox: b.gearbox,
      power: b.power ? +b.power : null,
      evRange: ELECTRIFIED.includes(b.fuel) && b.evRange ? +b.evRange : null,
      district: b.district || null,
      description: b.description || null,
      color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
      forSale,
      price: forSale ? +b.price : null,
      negotiable: b.negotiable !== false,
      status: forSale ? "PENDING" : "GARAGE",
      photos: b.photos?.length
        ? {
            create: b.photos.map((p: any, i: number) => ({
              key: p.key,
              url: p.url,
              position: i,
            })),
          }
        : undefined,
    },
  });
  return NextResponse.json({ ok: true, id: car.id });
}
