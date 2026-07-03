import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CarCard from "@/components/car-card";
import Filters from "@/components/filters";
import AdSlot from "@/components/ad-slot";

export const dynamic = "force-dynamic";

export default async function Carros({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const where: any = { forSale: true, status: "APPROVED" };
  if (searchParams.marca) where.brandId = +searchParams.marca;
  if (searchParams.modelo) where.modelId = +searchParams.modelo;
  if (searchParams.precoMax) where.price = { lte: +searchParams.precoMax };
  if (searchParams.fuel) where.fuel = searchParams.fuel;
  if (searchParams.caixa) where.gearbox = searchParams.caixa;
  if (searchParams.anoMin) where.year = { gte: +searchParams.anoMin };
  if (searchParams.kmMax) where.km = { lte: +searchParams.kmMax };
  if (searchParams.autonomiaMin)
    where.evRange = { gte: +searchParams.autonomiaMin };

  const ordenar = searchParams.ordenar || "recentes";
  const orderBy: any =
    ordenar === "precoAsc"
      ? { price: "asc" }
      : ordenar === "precoDesc"
        ? { price: "desc" }
        : ordenar === "km"
          ? { km: "asc" }
          : { createdAt: "desc" };

  const [cars, brands] = await Promise.all([
    prisma.car.findMany({
      where,
      include: {
        brand: true,
        model: true,
        photos: { orderBy: { position: "asc" } },
        owner: true,
        _count: { select: { offers: true } },
      },
      orderBy,
      take: 60,
    }),
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: { models: { orderBy: { name: "asc" } } },
    }),
  ]);

  const sortLink = (v: string) => {
    const p = new URLSearchParams(searchParams as any);
    p.set("ordenar", v);
    return "/carros?" + p.toString();
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1240px,94%)] py-6">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          › <b className="text-ink">Carros usados</b>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[272px_1fr]">
          <Filters brands={brands} />
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="font-head text-[1.3rem] font-extrabold text-ink">
                <span className="text-clay">{cars.length}</span> anúncios
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ["recentes", "Recentes"],
                  ["precoAsc", "Preço ↑"],
                  ["precoDesc", "Preço ↓"],
                  ["km", "Menos km"],
                ].map(([v, l]) => (
                  <Link
                    key={v}
                    href={sortLink(v)}
                    className={`n2-chip ${ordenar === v ? "!border-clay !bg-clay !text-white" : ""}`}
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </div>
            {cars.length === 0 ? (
              <div className="n2-card p-12 text-center">
                <h3 className="font-head text-[1.3rem] font-bold text-ink">
                  Sem resultados nesta estrada
                </h3>
                <p className="text-n2muted">Experimenta alargar os filtros.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cars.slice(0, 2).map((c) => (
                  <CarCard key={c.id} car={c} />
                ))}
                {cars.length > 2 && <AdSlot index={2} />}
                {cars.slice(2).map((c) => (
                  <CarCard key={c.id} car={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
