import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Regista uma visita ao anúncio. Não conta o dono e deduplica a mesma
// pessoa (cookie) durante 6h, para "quantas pessoas viram" ser realista.
const VISITOR_COOKIE = "n2vid";
const DEDUPE_MS = 6 * 60 * 60 * 1000; // 6 horas

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const car = await prisma.car.findUnique({
    where: { id: params.id },
    select: { id: true, ownerId: true, forSale: true, status: true },
  });
  if (!car)
    return NextResponse.json(
      { error: "Carro não encontrado." },
      { status: 404 }
    );

  // Só contam anúncios públicos.
  if (!(car.forSale && car.status === "APPROVED")) {
    return NextResponse.json({ ok: true, counted: false });
  }

  // Não contar o próprio dono a ver o seu anúncio.
  const session = await auth();
  if (session?.user?.id === car.ownerId) {
    return NextResponse.json({ ok: true, counted: false });
  }

  // Identificador de visitante (cookie de 1ª parte).
  const jar = cookies();
  let visitor = jar.get(VISITOR_COOKIE)?.value;
  if (!visitor) {
    visitor = crypto.randomUUID();
    jar.set(VISITOR_COOKIE, visitor, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  // Deduplica: mesma pessoa + mesmo carro nas últimas 6h conta 1x.
  const recent = await prisma.carView.findFirst({
    where: {
      carId: car.id,
      visitorHash: visitor,
      createdAt: { gte: new Date(Date.now() - DEDUPE_MS) },
    },
    select: { id: true },
  });
  if (recent) return NextResponse.json({ ok: true, counted: false });

  await prisma.carView.create({
    data: { carId: car.id, visitorHash: visitor },
  });
  return NextResponse.json({ ok: true, counted: true });
}
