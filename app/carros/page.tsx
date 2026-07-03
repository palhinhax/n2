import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CarCard from "@/components/car-card";
import ExternalCarCard from "@/components/external-car-card";
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

  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { models: { orderBy: { name: "asc" } } },
  });

  // filtros equivalentes para os anúncios externos (marca/modelo por nome)
  const whereExt: any = { active: true };
  if (searchParams.marca) {
    const b = brands.find((x) => x.id === +searchParams.marca);
    if (b) whereExt.brand = { equals: b.name, mode: "insensitive" };
  }
  if (searchParams.modelo) {
    const m = brands
      .flatMap((b) => b.models)
      .find((x) => x.id === +searchParams.modelo);
    if (m) whereExt.model = { contains: m.name, mode: "insensitive" };
  }
  if (searchParams.precoMax) whereExt.price = { lte: +searchParams.precoMax };
  if (searchParams.fuel) whereExt.fuel = searchParams.fuel;
  if (searchParams.caixa) whereExt.gearbox = searchParams.caixa;
  if (searchParams.anoMin) whereExt.year = { gte: +searchParams.anoMin };
  if (searchParams.kmMax) whereExt.km = { lte: +searchParams.kmMax };

  const orderByExt: any =
    ordenar === "precoAsc"
      ? { price: "asc" }
      : ordenar === "precoDesc"
        ? { price: "desc" }
        : ordenar === "km"
          ? { km: "asc" }
          : { firstSeenAt: "desc" };

  const [cars, external] = await Promise.all([
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
    // filtro de autonomia é exclusivo dos carros do site (externos não têm evRange)
    searchParams.autonomiaMin
      ? Promise.resolve([])
      : prisma.scrapedListing.findMany({
          where: whereExt,
          orderBy: orderByExt,
          take: 60,
        }),
  ]);

  // junta os dois tipos e reordena
  type Item =
    | { kind: "car"; sortKey: number; data: (typeof cars)[number] }
    | { kind: "ext"; sortKey: number; data: (typeof external)[number] };

  const sortKeyCar = (c: (typeof cars)[number]) =>
    ordenar === "precoAsc" || ordenar === "precoDesc"
      ? (c.price ?? Number.MAX_SAFE_INTEGER)
      : ordenar === "km"
        ? c.km
        : -c.createdAt.getTime();
  const sortKeyExt = (e: (typeof external)[number]) =>
    ordenar === "precoAsc" || ordenar === "precoDesc"
      ? (e.price ?? Number.MAX_SAFE_INTEGER)
      : ordenar === "km"
        ? (e.km ?? Number.MAX_SAFE_INTEGER)
        : -e.firstSeenAt.getTime();

  const items: Item[] = [
    ...cars.map((c) => ({
      kind: "car" as const,
      sortKey: sortKeyCar(c),
      data: c,
    })),
    ...external.map((e) => ({
      kind: "ext" as const,
      sortKey: sortKeyExt(e),
      data: e,
    })),
  ]
    .sort((a, b) =>
      ordenar === "precoDesc" ? b.sortKey - a.sortKey : a.sortKey - b.sortKey
    )
    .slice(0, 60);

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
                <span className="text-clay">{items.length}</span> anúncios
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
            {items.length === 0 ? (
              <div className="n2-card p-12 text-center">
                <h3 className="font-head text-[1.3rem] font-bold text-ink">
                  Sem resultados nesta estrada
                </h3>
                <p className="text-n2muted">Experimenta alargar os filtros.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items
                  .slice(0, 2)
                  .map((it) =>
                    it.kind === "car" ? (
                      <CarCard key={`c-${it.data.id}`} car={it.data} />
                    ) : (
                      <ExternalCarCard
                        key={`e-${it.data.id}`}
                        listing={it.data}
                      />
                    )
                  )}
                {items.length > 2 && <AdSlot index={2} />}
                {items
                  .slice(2)
                  .map((it) =>
                    it.kind === "car" ? (
                      <CarCard key={`c-${it.data.id}`} car={it.data} />
                    ) : (
                      <ExternalCarCard
                        key={`e-${it.data.id}`}
                        listing={it.data}
                      />
                    )
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
