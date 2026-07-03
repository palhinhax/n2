import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim();
  if (!name || !/.+@.+\..+/.test(email)) {
    return NextResponse.json(
      { error: "Nome e email válidos são obrigatórios" },
      { status: 400 }
    );
  }

  const lead = await prisma.financeLead.create({
    data: {
      name,
      email,
      phone: b.phone ? String(b.phone).trim() : null,
      carId: b.carId || null,
      listingId: b.listingId || null,
      vehicleTitle: b.vehicleTitle ? String(b.vehicleTitle) : null,
      price: Math.max(0, Math.round(Number(b.price) || 0)),
      downPayment: Math.max(0, Math.round(Number(b.downPayment) || 0)),
      months: Math.max(1, Math.round(Number(b.months) || 1)),
      monthlyEstimate: Math.max(0, Math.round(Number(b.monthlyEstimate) || 0)),
    },
  });

  return NextResponse.json({ ok: true, id: lead.id });
}
