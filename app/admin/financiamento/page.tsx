import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { fmtEur } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Leads de financiamento",
  robots: { index: false },
};

export default async function FinanceLeads() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") redirect("/");

  const leads = await prisma.financeLead.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1100px,94%)] py-7">
        <h1 className="mb-1 font-head text-[2rem] font-extrabold text-ink">
          Pedidos de financiamento
        </h1>
        <p className="mb-5 text-n2muted">{leads.length} pedidos</p>

        {leads.length === 0 ? (
          <div className="n2-card p-10 text-center text-n2muted">
            Ainda não há pedidos.
          </div>
        ) : (
          <div className="n2-card overflow-x-auto">
            <table className="w-full min-w-[720px] text-[0.88rem]">
              <thead>
                <tr className="border-b border-outline text-left text-n2muted">
                  <th className="p-3">Data</th>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Contacto</th>
                  <th className="p-3">Viatura</th>
                  <th className="p-3 text-right">Preço</th>
                  <th className="p-3 text-right">Entrada</th>
                  <th className="p-3 text-right">Prazo</th>
                  <th className="p-3 text-right">€/mês</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-outline/50">
                    <td className="p-3 text-n2muted2">
                      {l.createdAt.toLocaleDateString("pt-PT")}
                    </td>
                    <td className="p-3 font-semibold text-ink">{l.name}</td>
                    <td className="p-3 text-ink">
                      <a href={`mailto:${l.email}`} className="hover:underline">
                        {l.email}
                      </a>
                      {l.phone && (
                        <span className="block text-n2muted2">{l.phone}</span>
                      )}
                    </td>
                    <td className="p-3 text-ink">{l.vehicleTitle || "—"}</td>
                    <td className="p-3 text-right">{fmtEur(l.price)}</td>
                    <td className="p-3 text-right">{fmtEur(l.downPayment)}</td>
                    <td className="p-3 text-right">{l.months}m</td>
                    <td className="p-3 text-right font-bold text-ink">
                      {fmtEur(l.monthlyEstimate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
