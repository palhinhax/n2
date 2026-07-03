import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUSES = ["NEW", "REVIEWED", "DISMISSED"];

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }
  if (!STATUSES.includes(b.status))
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

  await prisma.report.update({
    where: { id: params.id },
    data: { status: b.status },
  });
  return NextResponse.json({ ok: true });
}
