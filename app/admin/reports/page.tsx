import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ReportActions from "@/components/report-actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Denúncias de anúncios",
  robots: { index: false },
};

const BADGE: Record<string, string> = {
  NEW: "bg-clay text-white",
  REVIEWED: "bg-olive text-white",
  DISMISSED: "bg-n2muted2 text-white",
};
const LABEL: Record<string, string> = {
  NEW: "Nova",
  REVIEWED: "Revista",
  DISMISSED: "Descartada",
};

export default async function AdminReports() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") redirect("/");

  const reports = await prisma.report.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 500,
  });

  const nNew = reports.filter((r) => r.status === "NEW").length;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1100px,94%)] py-7">
        <h1 className="mb-1 font-head text-[2rem] font-extrabold text-ink">
          Denúncias de anúncios
        </h1>
        <p className="mb-5 text-n2muted">
          {reports.length} no total · {nNew} por rever
        </p>

        {reports.length === 0 ? (
          <div className="n2-card p-10 text-center text-n2muted">
            Sem denúncias.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((r) => {
              const href =
                r.kind === "car"
                  ? `/carros/${r.carId}`
                  : `/carros/externo/${r.listingId}`;
              return (
                <div key={r.id} className="n2-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.72rem] font-bold ${BADGE[r.status] ?? ""}`}
                      >
                        {LABEL[r.status] ?? r.status}
                      </span>
                      <span className="font-head text-[1.02rem] font-bold text-ink">
                        {r.reason}
                      </span>
                    </div>
                    <span className="text-[0.78rem] text-n2muted2">
                      {r.createdAt.toLocaleString("pt-PT")}
                    </span>
                  </div>
                  {r.note && (
                    <p className="mt-1.5 text-[0.9rem] text-ink/90">{r.note}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={href}
                      className="text-[0.85rem] font-semibold text-clay hover:underline"
                    >
                      {r.vehicleTitle || "Ver anúncio"} ↗
                    </Link>
                    <ReportActions id={r.id} status={r.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
