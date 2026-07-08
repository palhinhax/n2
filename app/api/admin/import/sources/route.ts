import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { ensureDefaultImportSources } from "../../../../../scripts/scraper/foreign/engine";
import { FOREIGN_ADAPTERS } from "../../../../../scripts/scraper/foreign/sites";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  await ensureDefaultImportSources();
  const [sources, counts] = await Promise.all([
    prisma.importSource.findMany({ orderBy: { slug: "asc" } }),
    prisma.foreignListing.groupBy({
      by: ["sourceSlug"],
      where: { active: true },
      _count: { _all: true },
    }),
  ]);
  const bySlug: Record<string, number> = {};
  for (const c of counts) bySlug[c.sourceSlug] = c._count._all;

  return NextResponse.json({
    sources: sources.map((s) => ({
      ...s,
      activeListings: bySlug[s.slug] ?? 0,
    })),
    adapters: Object.keys(FOREIGN_ADAPTERS),
  });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const b = await req.json().catch(() => null);
  const slug = String(b?.slug || "")
    .trim()
    .toLowerCase();
  const name = String(b?.name || "").trim();
  const adapter = String(b?.adapter || "").trim();
  const country = String(b?.country || "")
    .trim()
    .toUpperCase();
  const baseUrl = String(b?.baseUrl || "").trim();

  if (!/^[a-z0-9-]{3,50}$/.test(slug))
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  if (!name || !country || !/^https?:\/\//.test(baseUrl))
    return NextResponse.json(
      { error: "Nome, país e URL base válidos são obrigatórios" },
      { status: 400 }
    );
  if (!FOREIGN_ADAPTERS[adapter])
    return NextResponse.json(
      { error: `Adaptador desconhecido: ${adapter}` },
      { status: 400 }
    );

  try {
    const source = await prisma.importSource.create({
      data: {
        slug,
        name,
        adapter,
        country,
        baseUrl,
        enabled: b?.enabled === true,
        notes: b?.notes ? String(b.notes).slice(0, 1000) : null,
      },
    });
    return NextResponse.json({ ok: true, source });
  } catch {
    return NextResponse.json(
      { error: "Já existe uma fonte com esse slug" },
      { status: 409 }
    );
  }
}
