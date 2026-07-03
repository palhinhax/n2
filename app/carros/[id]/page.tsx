import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CarArt from "@/components/car-art";
import CarCard from "@/components/car-card";
import AdSlot from "@/components/ad-slot";
import OfferPanel from "@/components/offer-panel";
import FavoriteButton from "@/components/favorite-button";
import TrackView from "@/components/track-view";
import AdminActions from "@/components/admin-actions";
import { fmtEur } from "@/lib/constants";
import type { Metadata } from "next";
import JsonLd from "@/components/json-ld";
import { absolute, clamp, eur, SITE_NAME } from "@/lib/seo";
import PriceBadge from "@/components/price-badge";
import { marketStats, ratePrice } from "@/lib/price-intel";
import FinanceSimulator from "@/components/finance-simulator";
import ReportButton from "@/components/report-button";
import CarAssistant from "@/components/car-assistant";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const car = await prisma.car.findUnique({
    where: { id: params.id },
    include: {
      brand: true,
      model: true,
      photos: { orderBy: { position: "asc" }, take: 1 },
    },
  });
  if (!car || !(car.forSale && car.status === "APPROVED")) {
    return { title: "Carro", robots: { index: false } };
  }
  const name = `${car.brand.name} ${car.model.name}${car.version ? " " + car.version : ""}`;
  const title = `${name} (${car.year}) — ${eur(car.price)}`;
  const description = clamp(
    `${name} de ${car.year} com ${car.km.toLocaleString("pt-PT")} km, ${car.fuel}, ${car.gearbox}. ` +
      `${eur(car.price)}. Vê fotos e detalhes no ${SITE_NAME}.`
  );
  const image = car.photos[0]?.url;
  const url = absolute(`/carros/${car.id}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CarDetail({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const car = await prisma.car.findUnique({
    where: { id: params.id },
    include: {
      brand: true,
      model: true,
      photos: { orderBy: { position: "asc" } },
      owner: true,
      _count: { select: { favorites: true } },
    },
  });
  if (!car) notFound();
  const isOwner = session?.user?.id === car.ownerId;
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  if (!(car.forSale && car.status === "APPROVED") && !isOwner && !isAdmin)
    notFound();

  const similar = await prisma.car.findMany({
    where: {
      id: { not: car.id },
      forSale: true,
      status: "APPROVED",
      price: { gte: (car.price || 0) - 6000, lte: (car.price || 0) + 6000 },
    },
    include: {
      brand: true,
      model: true,
      photos: true,
      owner: true,
      _count: { select: { offers: true } },
    },
    take: 4,
  });

  const specs: [string, string][] = [
    ["Ano", String(car.year)],
    ["Quilómetros", car.km.toLocaleString("pt-PT") + " km"],
    ["Combustível", car.fuel],
    ["Caixa", car.gearbox],
    ["Potência", car.power ? car.power + " cv" : "—"],
    ["Distrito", car.district || "—"],
  ];
  if (car.evRange) specs.push(["Autonomia (WLTP)", car.evRange + " km ⚡"]);

  const stats = await marketStats({
    brand: car.brand.name,
    model: car.model.name,
    year: car.year,
  });
  const rating = ratePrice(car.price, stats);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: `${car.brand.name} ${car.model.name}${car.version ? " " + car.version : ""}`,
    brand: { "@type": "Brand", name: car.brand.name },
    model: car.model.name,
    vehicleModelDate: String(car.year),
    productionDate: String(car.year),
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: car.km,
      unitCode: "KMT",
    },
    fuelType: car.fuel,
    vehicleTransmission: car.gearbox,
    ...(car.power
      ? {
          vehicleEngine: {
            "@type": "EngineSpecification",
            enginePower: {
              "@type": "QuantitativeValue",
              value: car.power,
              unitText: "cv",
            },
          },
        }
      : {}),
    image: car.photos.map((p) => p.url),
    url: absolute(`/carros/${car.id}`),
    ...(car.price
      ? {
          offers: {
            "@type": "Offer",
            price: car.price,
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/UsedCondition",
            url: absolute(`/carros/${car.id}`),
          },
        }
      : {}),
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <TrackView kind="car" id={car.id} />
      <div className="mx-auto w-[min(1240px,94%)] py-6">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          ›{" "}
          <Link href="/carros" className="hover:underline">
            Carros
          </Link>{" "}
          ›{" "}
          <b className="text-ink">
            {car.brand.name} {car.model.name}
          </b>
        </div>
        {car.status !== "APPROVED" && (
          <div className="n2-card mb-4 flex flex-wrap items-center justify-between gap-3 border-clay bg-[#FBF3DC] px-4 py-3 font-semibold text-bark">
            <span>
              {car.status === "PENDING"
                ? "⏳ Este anúncio aguarda validação da equipa."
                : car.status === "REJECTED"
                  ? "✕ Este anúncio foi rejeitado pela moderação."
                  : "🔒 Este carro está na garagem (não está à venda)."}
            </span>
            {isAdmin &&
              (car.status === "PENDING" || car.status === "REJECTED") && (
                <AdminActions carId={car.id} />
              )}
          </div>
        )}
        <div className="grid items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
          <div>
            <div className="n2-card relative overflow-hidden bg-gradient-to-b from-[#FCF4E2] to-[#F4E2BC]">
              {car.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={car.photos[0].url}
                  alt=""
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                <div className="p-10">
                  <CarArt color={car.color} />
                </div>
              )}
              {car.evRange ? (
                <span className="n2-tag absolute left-3 top-3 bg-olive">
                  ⚡ {car.evRange} km autonomia
                </span>
              ) : null}
            </div>
            {car.photos.length > 1 && (
              <div className="mt-2 grid grid-cols-6 gap-2">
                {car.photos.slice(0, 6).map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={p.url}
                    alt=""
                    className="aspect-[4/3] rounded-lg border border-outline object-cover"
                  />
                ))}
              </div>
            )}
            <section className="mt-7">
              <h2 className="mb-3 font-head text-[1.4rem] font-extrabold text-ink">
                Características
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {specs.map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-xl border border-outline bg-white px-3 py-2"
                  >
                    <small className="block font-head text-[0.68rem] font-bold uppercase tracking-widest text-n2muted2">
                      {k}
                    </small>
                    <b className="text-[0.95rem] text-ink">{v}</b>
                  </div>
                ))}
              </div>
            </section>
            <section className="mt-7">
              <h2 className="mb-2 font-head text-[1.4rem] font-extrabold text-ink">
                Descrição
              </h2>
              <p className="whitespace-pre-line text-[0.97rem] text-[#453f33]">
                {car.description || "Sem descrição."}
              </p>
            </section>
            <section className="mt-7">
              <CarAssistant
                kind="car"
                id={car.id}
                title={`${car.brand.name} ${car.model.name}`}
              />
            </section>
            <section className="mt-7">
              <AdSlot variant="banner" index={1} />
            </section>
            <section className="mt-7">
              <div className="n2-card bg-[#FBF3DC] px-5 py-4">
                <b className="font-head text-[1.05rem] text-ink">
                  Dicas de segurança Nacional 2
                </b>
                <ul className="ml-5 mt-1 list-disc space-y-0.5 text-[0.88rem] text-n2muted">
                  <li>Vê o carro pessoalmente antes de qualquer pagamento</li>
                  <li>Desconfia de preços muito abaixo do mercado</li>
                  <li>Nunca envies dinheiro por adiantado</li>
                </ul>
              </div>
            </section>
          </div>
          <aside className="flex flex-col gap-4">
            <div className="n2-card p-5">
              <span className="font-head text-[0.8rem] font-bold uppercase tracking-widest text-clay">
                {car.brand.name}
              </span>
              <h1 className="font-head text-[1.6rem] font-extrabold leading-tight text-ink">
                {car.model.name} {car.version || ""}
              </h1>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[0.85rem] font-medium text-n2muted">
                <span>{car.year}</span>
                <span>{car.km.toLocaleString("pt-PT")} km</span>
                <span>{car.fuel}</span>
                <span>{car.district || ""}</span>
              </div>
              <div className="mt-3 font-head text-[2.2rem] font-extrabold text-ink">
                {fmtEur(car.price)}
              </div>
              <div className="text-[0.8rem] font-semibold text-n2muted2">
                {car.negotiable ? "✓ Aceita ofertas" : "Preço fixo"}
              </div>
              <PriceBadge rating={rating} stats={stats} price={car.price} />
              <div className="mt-3">
                <FavoriteButton
                  kind="car"
                  id={car.id}
                  variant="detail"
                  count={car._count.favorites}
                />
              </div>
              <div className="mt-1 border-t border-outline pt-3">
                <OfferPanel
                  carId={car.id}
                  price={car.price || 0}
                  negotiable={car.negotiable}
                  isOwner={isOwner}
                />
              </div>
              <div className="mt-3 flex items-center gap-3 border-t border-outline pt-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-stone2 font-head font-extrabold text-ink">
                  {car.owner.name?.[0] || "?"}
                </div>
                <div className="text-[0.9rem]">
                  <b className="block leading-tight text-ink">
                    {car.owner.name}
                  </b>
                  <small className="text-n2muted">
                    {car.district || "Portugal"} · membro desde{" "}
                    {car.owner.createdAt.getFullYear()}
                  </small>
                </div>
              </div>
              {car.status === "APPROVED" && (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline pt-3">
                  <span className="inline-flex items-center gap-1 text-[0.76rem] font-semibold text-olive">
                    ✓ Anúncio moderado pela equipa
                  </span>
                  <ReportButton
                    kind="car"
                    id={car.id}
                    title={`${car.brand.name} ${car.model.name}`}
                  />
                </div>
              )}
            </div>
            {car.price ? (
              <FinanceSimulator
                price={car.price}
                carId={car.id}
                vehicleTitle={`${car.brand.name} ${car.model.name}`}
              />
            ) : null}
            <AdSlot index={3} />
          </aside>
        </div>
        {similar.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 font-head text-[1.5rem] font-extrabold text-ink">
              Anúncios semelhantes
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((c) => (
                <CarCard key={c.id} car={c} />
              ))}
            </div>
          </section>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
