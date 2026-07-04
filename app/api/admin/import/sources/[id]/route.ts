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
  const data: Record<string, unknown> = {};
  if (typeof b.enabled === "boolean") data.enabled = b.enabled;
  if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
  if (typeof b.baseUrl === "string" && /^https?:\/\//.test(b.baseUrl))
    data.baseUrl = b.baseUrl.trim();
  if (typeof b.notes === "string") data.notes = b.notes.slice(0, 1000) || null;
  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nada para alterar" }, { status: 400 });

  try {
    const source = await prisma.importSource.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ ok: true, source });
  } catch {
    return NextResponse.json(
      { error: "Fonte não encontrada" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await prisma.importSource.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Fonte não encontrada" },
      { status: 404 }
    );
  }
}
