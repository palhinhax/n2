import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { fmtEur } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Propostas aos vendedores",
  robots: { index: false },
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "⏳ Pendente",
  ACCEPTED: "✓ Aceite",
  REJECTED: "✕ Recusada",
  WITHDRAWN: "Retirada",
};
const STATUS_TAG: Record<string, string> = {
  PENDING: "bg-clay",
  ACCEPTED: "bg-olive",
  REJECTED: "bg-weathered",
  WITHDRAWN: "bg-weathered",
};

export default async function AdminPropostas({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") redirect("/");

  const estado = searchParams.estado;
  const statusFilter = estado && estado in STATUS_LABEL ? estado : undefined;

  const [offers, byStatus] = await Promise.all([
    prisma.offer.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      include: {
        buyer: true,
        car: { include: { brand: true, model: true, owner: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.offer.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const statusCounts: Record<string, number> = {};
  for (const row of byStatus) statusCounts[row.status] = row._count._all;
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1100px,94%)] py-7">
        <h1 className="mb-1 font-head text-[2rem] font-extrabold text-ink">
          💶 Propostas aos vendedores
        </h1>
        <p className="mb-4 text-n2muted">
          Todas as ofertas enviadas por compradores a vendedores da plataforma.
        </p>

        <div className="mb-5 flex flex-wrap gap-2">
          <Link
            href="/admin/propostas"
            className={`btn-sm ${!statusFilter ? "btn-clay" : "btn-line"}`}
          >
            Todas ({total})
          </Link>
          {Object.keys(STATUS_LABEL).map((s) => (
            <Link
              key={s}
              href={`/admin/propostas?estado=${s}`}
              className={`btn-sm ${statusFilter === s ? "btn-clay" : "btn-line"}`}
            >
              {STATUS_LABEL[s]} ({statusCounts[s] ?? 0})
            </Link>
          ))}
        </div>

        {offers.length === 0 ? (
          <div className="n2-card p-10 text-center text-n2muted">
            Ainda não há propostas{statusFilter ? " neste estado" : ""}.
          </div>
        ) : (
          <div className="n2-card overflow-x-auto">
            <table className="w-full min-w-[860px] text-[0.88rem]">
              <thead>
                <tr className="border-b border-outline text-left text-n2muted">
                  <th className="p-3">Data</th>
                  <th className="p-3">Comprador</th>
                  <th className="p-3">Vendedor</th>
                  <th className="p-3">Carro</th>
                  <th className="p-3 text-right">Oferta</th>
                  <th className="p-3 text-right">Pedido</th>
                  <th className="p-3">Mensagem</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => {
                  const car = o.car;
                  const carName = `${car.brand.name} ${car.model.name}`;
                  return (
                    <tr
                      key={o.id}
                      className="border-b border-outline/50 align-top"
                    >
                      <td className="whitespace-nowrap p-3 text-n2muted2">
                        {o.createdAt.toLocaleDateString("pt-PT")}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-ink">
                          {o.buyer.name || "—"}
                        </span>
                        <a
                          href={`mailto:${o.buyer.email}`}
                          className="block text-n2muted2 hover:underline"
                        >
                          {o.buyer.email}
                        </a>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-ink">
                          {car.owner.name || "—"}
                        </span>
                        <a
                          href={`mailto:${car.owner.email}`}
                          className="block text-n2muted2 hover:underline"
                        >
                          {car.owner.email}
                        </a>
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/carros/${car.id}`}
                          className="font-semibold text-ink hover:underline"
                        >
                          {carName}
                        </Link>
                        <span className="block text-n2muted2">
                          {car.year} · {car.km.toLocaleString("pt-PT")} km
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-ink">
                        {fmtEur(o.amount)}
                      </td>
                      <td className="p-3 text-right text-n2muted">
                        {car.price ? fmtEur(car.price) : "—"}
                      </td>
                      <td className="max-w-[260px] p-3 text-n2muted">
                        {o.message ? `“${o.message}”` : "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`n2-tag ${STATUS_TAG[o.status] || "bg-weathered"}`}
                        >
                          {STATUS_LABEL[o.status] || o.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
