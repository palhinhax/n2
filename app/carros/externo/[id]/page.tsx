import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ensureListingDetail } from "@/lib/scraped-detail";
import RefreshDetailsButton from "@/components/refresh-details-button";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { fmtEur } from "@/lib/constants";
import { SOURCE_LABEL } from "@/components/external-car-card";
import { MIN_LISTING_PRICE } from "@/lib/car-listing";
import ExternalGallery from "@/components/external-gallery";
import FavoriteButton from "@/components/favorite-button";
import TrackView from "@/components/track-view";
import type { Metadata } from "next";
import JsonLd from "@/components/json-ld";
import { absolute, clamp, eur, SITE_NAME } from "@/lib/seo";
import PriceBadge from "@/components/price-badge";
import { parseSuspiciousReasons, REASON_LABEL } from "@/lib/listing-quality";
import { marketStats, ratePrice } from "@/lib/price-intel";
import FinanceSimulator from "@/components/finance-simulator";
import ReportButton from "@/components/report-button";
import CarAssistant from "@/components/car-assistant";
import ListingHistoryCard from "@/components/listing-history-card";
import PurchaseReport from "@/components/purchase-report";
import { externalListingHistory } from "@/lib/listing-history";
import {
  estimateAnnualCosts,
  estimateDepreciation,
} from "@/lib/purchase-report";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const l = await prisma.scrapedListing.findUnique({
    where: { id: params.id },
  });
  if (!l || !l.active || (l.price != null && l.price < MIN_LISTING_PRICE))
    return { title: "Anúncio", robots: { index: false } };
  const title = `${l.title}${l.year ? ` (${l.year})` : ""} — ${eur(l.price)}`;
  // dados implausíveis (km/ano/preço) — página visível mas fora do índice
  const suspiciousMeta = l.suspicious
    ? { robots: { index: false as const } }
    : {};
  const description = clamp(
    `${l.title}${l.year ? `, ${l.year}` : ""}${l.km != null ? `, ${l.km.toLocaleString("pt-PT")} km` : ""}` +
      `${l.fuel ? `, ${l.fuel}` : ""}. ${eur(l.price)}. Vê no ${SITE_NAME}.`
  );
  let image: string | undefined;
  try {
    image = JSON.parse(l.imageUrls || "[]")[0];
  } catch {
    image = undefined;
  }
  const url = absolute(`/carros/externo/${l.id}`);
  return {
    title,
    description,
    ...suspiciousMeta,
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

export default async function ExternalCarDetail({
  params,
}: {
  params: { id: string };
}) {
  let listing = await prisma.scrapedListing.findUnique({
    where: { id: params.id },
  });
  if (!listing) notFound();
  // preço inválido (ex.: 56 €) — não é um carro real; escondemos a página.
  if (listing.price != null && listing.price < MIN_LISTING_PRICE) notFound();

  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  // enriquece à primeira visita (ou se os detalhes estiverem velhos)
  try {
    const updated = await ensureListingDetail(listing);
    if (updated) listing = updated;
  } catch {
    // se a origem falhar, mostramos o que temos
  }

  let photos: string[] = [];
  try {
    photos = JSON.parse(listing.imageUrls || "[]");
  } catch {
    photos = [];
  }

  // rede de segurança: esconde descrições que sejam despejos de navegação/legal
  // (anúncios OLX antigos guardados antes da correção do parser)
  const JUNK_RE =
    /(pol[íi]tica de (privacidade|cookies)|direitos do consumidor|aceitar( todos)? os? cookies|todas as categorias|standvirtual|imovirtual|olx\.(bg|pl|ro|ua)|termos e condi)/i;
  const cleanDescription =
    listing.description &&
    !JUNK_RE.test(listing.description) &&
    listing.description.length <= 4000
      ? listing.description
      : null;

  let equipment: { group: string; items: string[] }[] = [];
  try {
    equipment = JSON.parse(listing.equipment || "[]");
  } catch {
    equipment = [];
  }

  const specs: [string, string | null][] = [
    ["Marca", listing.brand],
    ["Modelo", listing.model],
    ["Versão", listing.version],
    ["Ano", listing.year?.toString() ?? null],
    ["Mês de registo", listing.registrationDate],
    [
      "Quilómetros",
      listing.km != null ? `${listing.km.toLocaleString("pt-PT")} km` : null,
    ],
    ["Combustível", listing.fuel],
    ["Caixa", listing.gearbox],
    ["Potência", listing.power != null ? `${listing.power} cv` : null],
    [
      "Cilindrada",
      // esconde valores implausíveis (erro de parsing, ex.: 21483 cm³)
      listing.displacement != null &&
      listing.displacement >= 600 &&
      listing.displacement <= 9000
        ? `${listing.displacement} cm³`
        : null,
    ],
    ["Tracção", listing.drivetrain],
    ["Carroçaria", listing.bodyType],
    ["Cor", listing.color],
    ["Nº de portas", listing.doors?.toString() ?? null],
    ["Lugares", listing.seats?.toString() ?? null],
    ["Condição", listing.condition],
    ["Garantia", listing.warranty],
    ["CO₂", listing.co2 != null ? `${listing.co2} g/km` : null],
    ["Localização", listing.location],
    [
      "Vendedor",
      [listing.sellerName, listing.sellerType].filter(Boolean).join(" · ") ||
        null,
    ],
  ];

  const sourceLabel = SOURCE_LABEL[listing.source] ?? listing.source;

  const [stats, history] = await Promise.all([
    marketStats({
      brand: listing.brand,
      model: listing.model,
      year: listing.year,
    }),
    externalListingHistory(listing),
  ]);
  const rating = ratePrice(listing.price, stats);

  // relatório de compra: custos anuais + desvalorização (cálculo local, rápido)
  const annualCosts = estimateAnnualCosts({
    fuel: listing.fuel,
    power: listing.power,
    displacement: listing.displacement,
    co2: listing.co2,
    year: listing.year,
    price: listing.price,
  });
  const depreciation = estimateDepreciation(listing.price, listing.year);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: listing.title,
    ...(listing.brand
      ? { brand: { "@type": "Brand", name: listing.brand } }
      : {}),
    ...(listing.model ? { model: listing.model } : {}),
    ...(listing.year ? { vehicleModelDate: String(listing.year) } : {}),
    ...(listing.km != null
      ? {
          mileageFromOdometer: {
            "@type": "QuantitativeValue",
            value: listing.km,
            unitCode: "KMT",
          },
        }
      : {}),
    ...(listing.fuel ? { fuelType: listing.fuel } : {}),
    ...(listing.gearbox ? { vehicleTransmission: listing.gearbox } : {}),
    ...(listing.power
      ? {
          vehicleEngine: {
            "@type": "EngineSpecification",
            enginePower: {
              "@type": "QuantitativeValue",
              value: listing.power,
              unitText: "cv",
            },
          },
        }
      : {}),
    ...(listing.color ? { color: listing.color } : {}),
    ...(listing.doors ? { numberOfDoors: listing.doors } : {}),
    ...(listing.seats ? { seatingCapacity: listing.seats } : {}),
    ...(listing.bodyType ? { bodyType: listing.bodyType } : {}),
    ...(listing.co2 != null ? { emissionsCO2: listing.co2 } : {}),
    itemCondition: "https://schema.org/UsedCondition",
    image: photos,
    url: absolute(`/carros/externo/${listing.id}`),
    ...(listing.price
      ? {
          offers: {
            "@type": "Offer",
            price: listing.price,
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/UsedCondition",
            url: absolute(`/carros/externo/${listing.id}`),
          },
        }
      : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: absolute("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: "Carros usados",
        item: absolute("/carros"),
      },
      { "@type": "ListItem", position: 3, name: listing.title },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />
      <SiteHeader />
      <TrackView kind="listing" id={listing.id} />
      <div className="mx-auto w-[min(1080px,94%)] py-6">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          ›{" "}
          <Link href="/carros" className="hover:underline">
            Carros usados
          </Link>{" "}
          › <b className="text-ink">{listing.title}</b>
        </div>

        {!listing.active && (
          <div className="n2-card mb-4 border-l-4 border-clay p-4 text-[0.9rem] font-medium text-ink">
            Este anúncio já não aparece no site de origem — pode ter sido
            vendido ou removido.
          </div>
        )}

        {listing.suspicious && (
          <div className="n2-card mb-4 border-l-4 border-[#C6603B] p-4 text-[0.9rem] text-ink">
            <b>Dados por confirmar.</b> Alguns valores deste anúncio parecem
            implausíveis e podem ser erro do site de origem:
            <span className="ml-1 font-semibold">
              {parseSuspiciousReasons(listing.suspiciousReasons)
                .map((r) => REASON_LABEL[r])
                .join(" · ")}
            </span>
            . Confirma sempre no anúncio original antes de decidir. Por isso,
            este anúncio não entra nas listagens nem na comparação de preços.
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-5">
            <ExternalGallery photos={photos} title={listing.title} />

            {cleanDescription && (
              <div className="n2-card p-5">
                <h2 className="mb-2 font-head text-[1.1rem] font-bold text-ink">
                  Descrição
                </h2>
                <p className="whitespace-pre-line text-[0.92rem] leading-relaxed text-ink/90">
                  {cleanDescription}
                </p>
              </div>
            )}

            {equipment.length > 0 && (
              <div className="n2-card p-5">
                <h2 className="mb-3 font-head text-[1.1rem] font-bold text-ink">
                  Equipamento
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {equipment.map((g) => (
                    <div key={g.group}>
                      <h3 className="mb-1.5 text-[0.85rem] font-bold uppercase tracking-wide text-clay">
                        {g.group}
                      </h3>
                      <ul className="space-y-0.5 text-[0.88rem] text-ink/90">
                        {g.items.map((it) => (
                          <li key={it} className="flex gap-1.5">
                            <span className="text-olive">✓</span>
                            {it}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <PurchaseReport
              brand={listing.brand}
              model={listing.model}
              fuel={listing.fuel}
              year={listing.year}
              annualCosts={annualCosts}
              depreciation={depreciation}
            />

            <CarAssistant
              kind="listing"
              id={listing.id}
              title={listing.title}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="n2-card p-5">
              <span className="n2-tag bg-bark">{sourceLabel}</span>
              <h1 className="mt-2 font-head text-[1.5rem] font-extrabold leading-tight text-ink">
                {listing.title}
              </h1>
              <div className="mt-2 flex items-end gap-2">
                <span className="font-head text-[2rem] font-extrabold text-ink">
                  {listing.price != null
                    ? fmtEur(listing.price)
                    : "Sob consulta"}
                </span>
                {listing.previousPrice != null &&
                  listing.price != null &&
                  listing.previousPrice > listing.price && (
                    <span className="pb-1.5 text-[0.9rem] font-semibold text-n2muted line-through">
                      {fmtEur(listing.previousPrice)}
                    </span>
                  )}
              </div>
              {listing.previousPrice != null &&
                listing.price != null &&
                listing.previousPrice > listing.price && (
                  <span className="mt-1 inline-block rounded-full bg-olive/15 px-2.5 py-0.5 text-[0.8rem] font-bold text-olive">
                    ↓ Desceu {fmtEur(listing.previousPrice - listing.price)}
                    {listing.priceChangedAt
                      ? ` em ${listing.priceChangedAt.toLocaleDateString("pt-PT")}`
                      : ""}
                  </span>
                )}
              <PriceBadge rating={rating} stats={stats} price={listing.price} />
              <div className="mt-3">
                <FavoriteButton
                  kind="listing"
                  id={listing.id}
                  variant="detail"
                />
              </div>
              <a
                href={listing.url}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="n2-btn mt-3 block w-full text-center"
              >
                Ver anúncio original no {sourceLabel} ↗
              </a>
              <p className="mt-3 text-[0.76rem] leading-snug text-n2muted2">
                Anúncio externo: os dados e as imagens pertencem ao site de
                origem e ao vendedor. O contacto e a negociação fazem-se no site
                original.
              </p>
              <div className="mt-3 border-t border-outline pt-3">
                <span className="inline-flex items-center gap-1 text-[0.76rem] font-semibold text-olive">
                  ✓ Origem identificada: {sourceLabel}
                </span>
                <div className="mt-2">
                  <ReportButton
                    kind="listing"
                    id={listing.id}
                    title={listing.title}
                  />
                </div>
              </div>
              {isAdmin && <RefreshDetailsButton id={listing.id} />}
            </div>

            <ListingHistoryCard history={history} />

            {listing.price != null && (
              <FinanceSimulator
                price={listing.price}
                listingId={listing.id}
                vehicleTitle={listing.title}
              />
            )}

            <div className="n2-card p-5">
              <h2 className="mb-3 font-head text-[1.05rem] font-bold text-ink">
                Detalhes
              </h2>
              <dl className="grid grid-cols-1 gap-y-1.5 text-[0.9rem]">
                {specs
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="font-medium text-n2muted">{k}</dt>
                      <dd className="text-right font-semibold text-ink">{v}</dd>
                    </div>
                  ))}
              </dl>
              <p className="mt-3 border-t border-outline pt-2 text-[0.74rem] text-n2muted2">
                Visto pela última vez em{" "}
                {listing.lastSeenAt.toLocaleDateString("pt-PT")}
              </p>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
