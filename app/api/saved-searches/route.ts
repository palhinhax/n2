import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { countListings, type ListingQuery } from "@/lib/car-listing";

export const dynamic = "force-dynamic";

const KEYS = [
  "marca",
  "modelo",
  "precoMax",
  "fuel",
  "caixa",
  "anoMin",
  "kmMax",
  "carroceria",
  "cor",
  "potMin",
  "lugares",
  "mensalMax",
];

function labelFor(q: Record<string, string>): string {
  const bits: string[] = [];
  if (q.marca) bits.push(q.marca);
  if (q.modelo) bits.push(q.modelo);
  if (q.fuel) bits.push(q.fuel);
  if (q.precoMax)
    bits.push(`até ${Number(q.precoMax).toLocaleString("pt-PT")} €`);
  if (q.anoMin) bits.push(`desde ${q.anoMin}`);
  if (q.kmMax) bits.push(`< ${Number(q.kmMax).toLocaleString("pt-PT")} km`);
  return bits.length ? bits.join(" · ") : "Todos os carros";
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ searches: [] });
  const searches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ searches });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const q: Record<string, string> = {};
  for (const k of KEYS) if (body[k]) q[k] = String(body[k]);

  const count = await countListings(q as ListingQuery);
  const search = await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      label: labelFor(q),
      query: JSON.stringify(q),
      lastCount: count,
    },
  });
  return NextResponse.json({ ok: true, search });
}
