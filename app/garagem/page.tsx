import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CarArt from "@/components/car-art";
import { fmtEur } from "@/lib/constants";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, [string, string]> = {
  GARAGE: ["Na garagem", "bg-weathered"],
  PENDING: ["Em validação", "bg-clay"],
  APPROVED: ["À venda", "bg-olive"],
  REJECTED: ["Rejeitado", "bg-red-700"],
};

export default async function Garagem() {
  const session = await auth();
  const cars = await prisma.car.findMany({
    where: { ownerId: session!.user.id },
    include: {
      brand: true,
      model: true,
      photos: { orderBy: { position: "asc" } },
      reminders: { where: { done: false }, orderBy: { dueDate: "asc" } },
      offers: { where: { status: "PENDING" } },
      views: { select: { visitorHash: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const soon = (d: Date) => (d.getTime() - Date.now()) / 86400000 < 30;
  const weekAgo = Date.now() - 7 * 86400000;
  const viewStats = (views: { visitorHash: string; createdAt: Date }[]) => ({
    total: views.length,
    people: new Set(views.map((v) => v.visitorHash)).size,
    week: views.filter((v) => v.createdAt.getTime() >= weekAgo).length,
  });

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1240px,94%)] py-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="font-head text-[0.82rem] font-bold uppercase tracking-[0.14em] text-clay">
              O teu espaço
            </span>
            <h1 className="font-head text-[2rem] font-extrabold text-ink">
              A minha garagem
            </h1>
            <p className="text-n2muted">
              Os teus carros, à venda ou não. Lembretes, ofertas e histórico num
              só sítio.
            </p>
          </div>
          <Link href="/garagem/novo" className="btn-clay">
            + Adicionar carro
          </Link>
        </div>

        {cars.length === 0 ? (
          <div className="n2-card p-14 text-center">
            <h3 className="font-head text-[1.4rem] font-bold text-ink">
              A tua garagem está vazia
            </h3>
            <p className="mb-4 text-n2muted">
              Adiciona o teu primeiro carro — para vender já, ou só para o teres
              organizado.
            </p>
            <Link href="/garagem/novo" className="btn-clay">
              Adicionar o meu carro
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cars.map((car) => {
              const [label, cls] =
                STATUS_LABEL[car.status] || STATUS_LABEL.GARAGE;
              const next = car.reminders[0];
              const st = viewStats(car.views);
              return (
                <div
                  key={car.id}
                  className="n2-card flex flex-col overflow-hidden"
                >
                  <div className="relative flex aspect-[16/9] items-center justify-center bg-gradient-to-b from-[#FCF4E2] to-[#F4E2BC]">
                    <span
                      className={`n2-tag ${cls} absolute left-2 top-2 z-10`}
                    >
                      {label}
                    </span>
                    {car.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={car.photos[0].url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <CarArt color={car.color} className="w-[76%]" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="font-head text-[1.15rem] font-bold text-ink">
                      {car.brand.name} {car.model.name}
                      <small className="block font-barlow text-[0.8rem] font-medium text-n2muted">
                        {car.year} · {car.km.toLocaleString("pt-PT")} km ·{" "}
                        {car.fuel}
                        {car.evRange ? ` · ⚡${car.evRange} km` : ""}
                      </small>
                    </div>
                    {car.forSale && (
                      <div className="font-head text-[1.2rem] font-extrabold text-ink">
                        {fmtEur(car.price)}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-cream px-2 py-2 text-center">
                      <div>
                        <b className="block font-head text-[1.1rem] leading-none text-ink">
                          {st.total}
                        </b>
                        <small className="text-[0.68rem] uppercase tracking-wide text-n2muted2">
                          Visualizações
                        </small>
                      </div>
                      <div className="border-x border-outline">
                        <b className="block font-head text-[1.1rem] leading-none text-ink">
                          {st.people}
                        </b>
                        <small className="text-[0.68rem] uppercase tracking-wide text-n2muted2">
                          Pessoas
                        </small>
                      </div>
                      <div>
                        <b className="block font-head text-[1.1rem] leading-none text-ink">
                          {st.week}
                        </b>
                        <small className="text-[0.68rem] uppercase tracking-wide text-n2muted2">
                          7 dias
                        </small>
                      </div>
                    </div>
                    {car.status !== "APPROVED" && st.total === 0 && (
                      <small className="text-[0.78rem] text-n2muted2">
                        As estatísticas começam quando o anúncio está à venda e
                        aprovado.
                      </small>
                    )}
                    {next && (
                      <div
                        className={`rounded-lg px-2.5 py-1.5 text-[0.85rem] font-semibold ${soon(next.dueDate) ? "bg-[#FBE9DC] text-[#8a3b12]" : "bg-cream text-bark"}`}
                      >
                        🔔 {next.type}: {next.title} —{" "}
                        {next.dueDate.toLocaleDateString("pt-PT")}
                      </div>
                    )}
                    {car.offers.length > 0 && (
                      <div className="rounded-lg bg-[#F3F6E8] px-2.5 py-1.5 text-[0.85rem] font-semibold text-olive">
                        💶 {car.offers.length} oferta
                        {car.offers.length > 1 ? "s" : ""} pendente
                        {car.offers.length > 1 ? "s" : ""}
                      </div>
                    )}
                    <div className="mt-auto flex gap-2 pt-2">
                      <Link
                        href={`/garagem/${car.id}`}
                        className="btn-ink btn-xs flex-1"
                      >
                        Gerir
                      </Link>
                      {car.status === "APPROVED" && (
                        <Link
                          href={`/carros/${car.id}`}
                          className="btn-line btn-xs"
                        >
                          Ver anúncio
                        </Link>
                      )}
                    </div>
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
