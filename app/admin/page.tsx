import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import AdminActions from "@/components/admin-actions";
import ScraperAdmin from "@/components/scraper-admin";
import { fmtEur } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") notFound();

  const [pending, users, counts] = await Promise.all([
    prisma.car.findMany({
      where: { status: "PENDING" },
      include: { brand: true, model: true, owner: true },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { _count: { select: { cars: true, offers: true } } },
    }),
    Promise.all([
      prisma.user.count(),
      prisma.car.count(),
      prisma.car.count({ where: { forSale: true, status: "APPROVED" } }),
      prisma.offer.count(),
    ]),
  ]);
  const [nUsers, nCars, nLive, nOffers] = counts;

  // estatísticas do scraping (por fonte + detalhes enriquecidos)
  const [nExtActive, nEnriched, bySource] = await Promise.all([
    prisma.scrapedListing.count({ where: { active: true } }),
    prisma.scrapedListing.count({ where: { detailsFetchedAt: { not: null } } }),
    prisma.scrapedListing.groupBy({
      by: ["source"],
      where: { active: true },
      _count: { _all: true },
    }),
  ]);
  const sourceCounts: Record<string, number> = {};
  for (const row of bySource) sourceCounts[row.source] = row._count._all;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1100px,94%)] py-7">
        <span className="font-head text-[0.82rem] font-bold uppercase tracking-[0.14em] text-olive">
          Administração
        </span>
        <h1 className="mb-5 font-head text-[2rem] font-extrabold text-ink">
          Moderação e gestão
        </h1>

        <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Utilizadores", nUsers],
            ["Carros na plataforma", nCars],
            ["Anúncios ativos", nLive],
            ["Ofertas", nOffers],
          ].map(([l, n]) => (
            <div key={l as string} className="n2-card p-4 text-center">
              <div className="font-head text-[1.9rem] font-extrabold text-ink">
                {n as number}
              </div>
              <div className="text-[0.85rem] font-semibold text-n2muted">
                {l}
              </div>
            </div>
          ))}
        </div>

        <section className="mb-8">
          <h2 className="mb-3 font-head text-[1.4rem] font-extrabold text-ink">
            🚗 Scraping de anúncios externos
          </h2>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ["Externos ativos", nExtActive],
              ["Standvirtual", sourceCounts.STANDVIRTUAL ?? 0],
              ["OLX", sourceCounts.OLX ?? 0],
              ["Pisca Pisca", sourceCounts.PISCAPISCA ?? 0],
              ["Com detalhes", nEnriched],
            ].map(([l, n]) => (
              <div key={l as string} className="n2-card p-4 text-center">
                <div className="font-head text-[1.6rem] font-extrabold text-ink">
                  {(n as number).toLocaleString("pt-PT")}
                </div>
                <div className="text-[0.8rem] font-semibold text-n2muted">
                  {l}
                </div>
              </div>
            ))}
          </div>
          <ScraperAdmin />
        </section>

        <section className="mb-8">
          <h2 className="mb-3 font-head text-[1.4rem] font-extrabold text-ink">
            ⏳ Anúncios a aguardar validação ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="n2-card p-6 text-n2muted">
              Tudo validado. Bom trabalho! ✓
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pending.map((c) => (
                <div
                  key={c.id}
                  className="n2-card flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <div>
                    <b className="font-head text-[1.1rem] text-ink">
                      {c.brand.name} {c.model.name} {c.version || ""}
                    </b>
                    <div className="text-[0.85rem] text-n2muted">
                      {c.year} · {c.km.toLocaleString("pt-PT")} km · {c.fuel} ·{" "}
                      {fmtEur(c.price)} · por {c.owner.name} ({c.owner.email})
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Link href={`/carros/${c.id}`} className="btn-line btn-xs">
                      Ver
                    </Link>
                    <AdminActions carId={c.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-head text-[1.4rem] font-extrabold text-ink">
            Utilizadores recentes
          </h2>
          <div className="n2-card overflow-x-auto">
            <table className="w-full text-[0.9rem]">
              <thead>
                <tr className="border-b border-outline text-left font-head text-[0.75rem] uppercase tracking-wider text-n2muted2">
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Papel</th>
                  <th className="px-4 py-2">Carros</th>
                  <th className="px-4 py-2">Ofertas</th>
                  <th className="px-4 py-2">Registo</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-outline/60">
                    <td className="px-4 py-2 font-semibold text-ink">
                      {u.name}
                    </td>
                    <td className="px-4 py-2 text-n2muted">{u.email}</td>
                    <td className="px-4 py-2">
                      {u.role === "ADMIN" ? (
                        <span className="n2-tag bg-olive">Admin</span>
                      ) : (
                        "User"
                      )}
                    </td>
                    <td className="px-4 py-2">{u._count.cars}</td>
                    <td className="px-4 py-2">{u._count.offers}</td>
                    <td className="px-4 py-2 text-n2muted">
                      {u.createdAt.toLocaleDateString("pt-PT")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
