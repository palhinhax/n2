import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const esc = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Exporta todas as leads de importação em CSV. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const leads = await prisma.importLead.findMany({
    orderBy: { createdAt: "desc" },
    include: { listing: { select: { url: true, sourceSlug: true } } },
  });

  const header = [
    "data",
    "nome",
    "email",
    "telefone",
    "carro",
    "pais",
    "orcamento_eur",
    "contacto_preferido",
    "mensagem",
    "estado",
    "anuncio_url",
    "fonte",
  ].join(";");

  const rows = leads.map((l) =>
    [
      l.createdAt.toISOString(),
      l.name,
      l.email,
      l.phone,
      l.vehicleTitle,
      l.country,
      l.budget,
      l.contactPref,
      l.message,
      l.status,
      l.listing?.url,
      l.listing?.sourceSlug,
    ]
      .map(esc)
      .join(";")
  );

  // BOM para o Excel abrir com acentos corretos
  const csv = "﻿" + [header, ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-importacao-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
