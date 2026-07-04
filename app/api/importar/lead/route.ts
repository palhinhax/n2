import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Lead do botão "Quero importar este carro". */
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

  // valida o anúncio se vier referenciado (lead também pode ser genérico)
  let listingId: string | null = null;
  let vehicleTitle = b.vehicleTitle
    ? String(b.vehicleTitle).slice(0, 200)
    : null;
  let country = b.country ? String(b.country).slice(0, 2).toUpperCase() : null;
  if (b.listingId) {
    const listing = await prisma.foreignListing.findUnique({
      where: { id: String(b.listingId) },
      select: { id: true, title: true, country: true },
    });
    if (listing) {
      listingId = listing.id;
      vehicleTitle = vehicleTitle ?? listing.title;
      country = country ?? listing.country;
    }
  }

  const budget = Math.round(Number(b.budget));
  const lead = await prisma.importLead.create({
    data: {
      name: name.slice(0, 120),
      email: email.slice(0, 200),
      phone: b.phone ? String(b.phone).trim().slice(0, 40) : null,
      listingId,
      vehicleTitle,
      country,
      budget: Number.isFinite(budget) && budget > 0 ? budget : null,
      contactPref: ["email", "telefone", "whatsapp"].includes(b.contactPref)
        ? b.contactPref
        : null,
      message: b.message ? String(b.message).slice(0, 2000) : null,
    },
  });

  return NextResponse.json({ ok: true, id: lead.id });
}
