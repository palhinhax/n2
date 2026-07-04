import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "EXPIRED"];

/** Moderação de um anúncio estrangeiro: aprovar, rejeitar ou expirar. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const b = await req.json().catch(() => ({}));
  const status = String(b.status || "").toUpperCase();
  if (!STATUSES.includes(status))
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

  try {
    const listing = await prisma.foreignListing.update({
      where: { id: params.id },
      data: {
        status,
        // expirar/rejeitar também tira o anúncio das listagens
        ...(status === "EXPIRED" || status === "REJECTED"
          ? { active: false }
          : { active: true }),
      },
    });
    return NextResponse.json({ ok: true, listing });
  } catch {
    return NextResponse.json(
      { error: "Anúncio não encontrado" },
      { status: 404 }
    );
  }
}
