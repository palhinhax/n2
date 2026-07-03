import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const kind = b.kind === "car" || b.kind === "listing" ? b.kind : null;
  const id = typeof b.id === "string" ? b.id : null;
  const reason = typeof b.reason === "string" ? b.reason.trim() : "";
  if (!kind || !id || !reason) {
    return NextResponse.json(
      { error: "Indica o motivo da denúncia." },
      { status: 400 }
    );
  }

  const session = await auth();
  const reporterId = (session?.user as any)?.id ?? null;

  await prisma.report.create({
    data: {
      kind,
      carId: kind === "car" ? id : null,
      listingId: kind === "listing" ? id : null,
      vehicleTitle: b.vehicleTitle
        ? String(b.vehicleTitle).slice(0, 200)
        : null,
      reason: reason.slice(0, 120),
      note: b.note ? String(b.note).slice(0, 1000) : null,
      reporterId,
    },
  });

  return NextResponse.json({ ok: true });
}
