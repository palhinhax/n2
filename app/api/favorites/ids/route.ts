import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Devolve os IDs dos carros que o utilizador tem nos favoritos.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ids: [] });

  const favs = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    select: { carId: true },
  });
  return NextResponse.json({ ids: favs.map((f) => f.carId) });
}
