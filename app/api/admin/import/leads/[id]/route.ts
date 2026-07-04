import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const b = await req.json().catch(() => ({}));
  const status = String(b.status || "").toUpperCase();
  if (!["NEW", "CONTACTED", "CLOSED"].includes(status))
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

  try {
    const lead = await prisma.importLead.update({
      where: { id: params.id },
      data: { status },
    });
    return NextResponse.json({ ok: true, lead });
  } catch {
    return NextResponse.json({ error: "Lead não encontrada" }, { status: 404 });
  }
}
