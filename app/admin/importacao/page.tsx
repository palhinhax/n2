import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ImportAdmin from "@/components/import-admin";
import ImportListingActions from "@/components/import-listing-actions";
import ImportLeadActions from "@/components/import-lead-actions";
import ImportDealBadge from "@/components/import-deal-badge";
import { fmtEur } from "@/lib/constants";
import { countryFlag, countryName } from "@/lib/import-countries";

export const dynamic = "force-dynamic";

export default async function AdminImportacao({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") notFound();

  const listStatus = ["APPROVED", "PENDING", "REJECTED", "EXPIRED"].includes(
    searchParams.estado || ""
  )
    ? (searchParams.estado as string)
    : "APPROVED";

  const [
    nActive,
    nSuspicious,
    nDuplicates,
    byCountry,
    byRating,
    listings,
    leads,
    nNewLeads,
    logs,
    errorLogs,
  ] = await Promise.all([
    prisma.foreignListing.count({ where: { active: true } }),
    prisma.foreignListing.count({ where: { active: true, suspicious: true } }),
    prisma.foreignListing.count({ where: { active: true, isDuplicate: true } }),
    prisma.foreignListing.groupBy({
      by: ["country"],
      where: { active: true },
      _count: { _all: true },
    }),
    prisma.foreignListing.groupBy({
      by: ["dealRating"],
      where: { active: true, dealRating: { not: null } },
      _count: { _all: true },
    }),
    prisma.foreignListing.findMany({
      where: { status: listStatus },
      orderBy: { firstSeenAt: "desc" },
      take: 30,
    }),
    prisma.importLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { listing: { select: { id: true } } },
    }),
    prisma.importLead.count({ where: { status: "NEW" } }),
    prisma.importScrapeLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.importScrapeLog.count({
      where: {
        level: "ERROR",
        createdAt: { gte: new Date(Date.now() - 48 * 3600_000) },
      },
    }),
  ]);

  const ratingCounts: Record<string, number> = {};
  for (const r of byRating)
    if (r.dealRating) ratingCounts[r.dealRating] = r._count._all;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1240px,94%)] py-7">
        <span className="font-head text-[0.82rem] font-bold uppercase tracking-[0.14em] text-olive">
          Administração
        </span>
        <h1 className="mb-2 font-head text-[2rem] font-extrabold text-ink">
          Importação de carros da Europa
        </h1>
        <div className="mb-5 text-[0.88rem] font-medium text-n2muted">
          <Link href="/admin" className="text-clay hover:underline">
            ← Voltar ao painel principal
          </Link>
        </div>

        {/* analytics */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            ["Anúncios ativos", nActive],
            ["Excelentes negócios", ratingCounts.EXCELLENT ?? 0],
            ["Boas oportunidades", ratingCounts.GOOD ?? 0],
            ["Suspeitos", nSuspicious],
            ["Duplicados escondidos", nDuplicates],
            ["Leads novas", nNewLeads],
          ].map(([l, n]) => (
            <div key={l as string} className="n2-card p-4 text-center">
              <div className="font-head text-[1.6rem] font-extrabold text-ink">
                {(n as number).toLocaleString("pt-PT")}
              </div>
              <div className="text-[0.78rem] font-semibold text-n2muted">
                {l}
              </div>
            </div>
          ))}
        </div>
        <div className="mb-7 flex flex-wrap gap-2">
          {byCountry
            .sort((a, b) => b._count._all - a._count._all)
            .map((c) => (
              <span key={c.country} className="n2-chip cursor-default">
                {countryFlag(c.country)} {countryName(c.country)}:{" "}
                {c._count._all.toLocaleString("pt-PT")}
              </span>
            ))}
          {errorLogs > 0 && (
            <span className="n2-tag ml-auto self-center bg-clay">
              {errorLogs} erros de scraping nas últimas 48h
            </span>
          )}
        </div>

        {/* fontes + pressupostos */}
        <section className="mb-8">
          <h2 className="mb-3 font-head text-[1.4rem] font-extrabold text-ink">
            🌍 Fontes e configuração
          </h2>
          <ImportAdmin />
        </section>

        {/* moderação de anúncios */}
        <section className="mb-8">
          <h2 className="mb-3 font-head text-[1.4rem] font-extrabold text-ink">
            🧾 Anúncios estrangeiros
          </h2>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[
              ["APPROVED", "Aprovados"],
              ["PENDING", "Pendentes"],
              ["REJECTED", "Rejeitados"],
              ["EXPIRED", "Expirados"],
            ].map(([v, l]) => (
              <Link
                key={v}
                href={`/admin/importacao?estado=${v}`}
                className={`n2-chip ${listStatus === v ? "!border-clay !bg-clay !text-white" : ""}`}
              >
                {l}
              </Link>
            ))}
          </div>
          {listings.length === 0 ? (
            <div className="n2-card p-6 text-n2muted">
              Sem anúncios neste estado.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="n2-card flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <b className="font-head text-[1.05rem] text-ink">
                      {countryFlag(l.country)} {l.title}
                    </b>
                    <div className="text-[0.82rem] text-n2muted">
                      {l.year ?? "—"} ·{" "}
                      {l.km != null
                        ? `${l.km.toLocaleString("pt-PT")} km`
                        : "— km"}{" "}
                      · {l.fuel ?? "—"} · {fmtEur(l.priceEur)} → total PT{" "}
                      {fmtEur(l.importTotalEur)} · {l.sourceSlug}
                      {l.suspicious ? " · ⚠️ suspeito" : ""}
                      {l.isDuplicate ? " · duplicado" : ""}
                    </div>
                    <ImportDealBadge rating={l.dealRating} className="mt-1" />
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Link
                      href={`/importar-carros/anuncio/${l.id}`}
                      className="btn-line btn-xs"
                    >
                      Ver
                    </Link>
                    <ImportListingActions listingId={l.id} status={l.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* leads */}
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="font-head text-[1.4rem] font-extrabold text-ink">
              💼 Leads de importação
            </h2>
            <a
              href="/api/admin/import/leads/export"
              className="btn-line btn-xs ml-auto"
            >
              ⬇ Exportar CSV
            </a>
          </div>
          {leads.length === 0 ? (
            <div className="n2-card p-6 text-n2muted">
              Ainda sem pedidos de importação.
            </div>
          ) : (
            <div className="n2-card overflow-x-auto">
              <table className="w-full text-[0.85rem]">
                <thead>
                  <tr className="border-b border-outline text-left font-head text-[0.72rem] uppercase tracking-wider text-n2muted2">
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2">Contacto</th>
                    <th className="px-4 py-2">Carro</th>
                    <th className="px-4 py-2">Orçamento</th>
                    <th className="px-4 py-2">Mensagem</th>
                    <th className="px-4 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((ld) => (
                    <tr
                      key={ld.id}
                      className="border-b border-outline/60 align-top"
                    >
                      <td className="px-4 py-2 text-n2muted">
                        {ld.createdAt.toLocaleDateString("pt-PT")}
                      </td>
                      <td className="px-4 py-2">
                        <b className="text-ink">{ld.name}</b>
                        <div className="text-n2muted">
                          {ld.email}
                          {ld.phone ? ` · ${ld.phone}` : ""}
                          {ld.contactPref ? ` · prefere ${ld.contactPref}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-n2muted">
                        {ld.listing ? (
                          <Link
                            href={`/importar-carros/anuncio/${ld.listing.id}`}
                            className="text-clay hover:underline"
                          >
                            {ld.vehicleTitle ?? "ver anúncio"}
                          </Link>
                        ) : (
                          (ld.vehicleTitle ?? "—")
                        )}
                        {ld.country
                          ? ` (${countryFlag(ld.country)} ${countryName(ld.country)})`
                          : ""}
                      </td>
                      <td className="px-4 py-2">{fmtEur(ld.budget)}</td>
                      <td className="max-w-[240px] px-4 py-2 text-n2muted">
                        {ld.message ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <ImportLeadActions leadId={ld.id} status={ld.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* logs */}
        <section>
          <h2 className="mb-3 font-head text-[1.4rem] font-extrabold text-ink">
            📜 Log do scraping
          </h2>
          <div className="n2-card overflow-x-auto p-4">
            {logs.length === 0 ? (
              <p className="text-n2muted">Sem atividade registada.</p>
            ) : (
              <ul className="flex flex-col gap-1 font-mono text-[0.78rem]">
                {logs.map((lg) => (
                  <li
                    key={lg.id}
                    className={
                      lg.level === "ERROR" ? "text-clay" : "text-n2muted"
                    }
                  >
                    {lg.createdAt.toLocaleString("pt-PT")} [{lg.sourceSlug}]{" "}
                    {lg.level === "ERROR" ? "⚠ " : ""}
                    {lg.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
