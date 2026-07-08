import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ExternalGallery from "@/components/external-gallery";
import ImportCostBreakdown from "@/components/import-cost-breakdown";
import ImportDealBadge from "@/components/import-deal-badge";
import ImportLeadButton from "@/components/import-lead-button";
import JsonLd from "@/components/json-ld";
import { fmtEur } from "@/lib/constants";
import { countryByCode } from "@/lib/import-countries";
import {
  estimateImportCost,
  getImportAssumptions,
  rateImportDeal,
} from "@/lib/import-cost";
import {
  IMPORT_DOCUMENTS,
  IMPORT_RISKS,
  IMPORT_STEPS,
} from "@/lib/import-content";
import { marketStats } from "@/lib/price-intel";
import { absolute, clamp, eur, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const l = await prisma.foreignListing.findUnique({
    where: { id: params.id },
  });
  if (!l || !l.active || l.status !== "APPROVED")
    return { title: "Anúncio", robots: { index: false } };
  const country = countryByCode(l.country);
  const title = `${l.title}${l.year ? ` (${l.year})` : ""} na ${country?.name ?? "Europa"} — importar por ${eur(l.importTotalEur ?? l.priceEur)}`;
  const description = clamp(
    `${l.title} à venda na ${country?.name ?? "Europa"} por ${eur(l.priceEur)}. Custo total estimado legalizado em Portugal: ${eur(l.importTotalEur)}. Vê a decomposição de custos no ${SITE_NAME}.`
  );
  const suspiciousMeta = l.suspicious
    ? { robots: { index: false as const } }
    : {};
  return {
    title,
    description,
    ...suspiciousMeta,
    alternates: { canonical: absolute(`/importar-carros/anuncio/${l.id}`) },
    openGraph: { title, description },
  };
}

export default async function ImportListingDetail({
  params,
}: {
  params: { id: string };
}) {
  const listing = await prisma.foreignListing.findUnique({
    where: { id: params.id },
  });
  if (!listing || listing.status === "REJECTED") notFound();

  const country = countryByCode(listing.country);

  let photos: string[] = [];
  try {
    photos = JSON.parse(listing.imageUrls || "[]");
  } catch {
    photos = [];
  }

  // custo recalculado ao vivo (os pressupostos podem ter mudado desde o
  // scraping) + comparação com o mercado PT ajustada ao ano do carro
  const assumptions = await getImportAssumptions();
  const breakdown =
    listing.priceEur != null
      ? estimateImportCost(
          {
            price: listing.priceEur,
            currency: "EUR",
            country: listing.country,
            fuel: listing.fuel,
            year: listing.year,
            firstRegistration: listing.firstRegistration,
            displacement: listing.displacement,
            power: listing.power,
            co2: listing.co2,
          },
          assumptions
        )
      : null;

  const ptStats = await marketStats({
    brand: listing.brand,
    model: listing.model,
    year: listing.year,
  }).catch(() => null);
  const ptMedian = ptStats?.median ?? listing.ptMarketMedian ?? null;
  const deal = breakdown ? rateImportDeal(breakdown.totalEur, ptMedian) : null;

  const specs: [string, string | null][] = [
    ["Ano", listing.year ? String(listing.year) : null],
    [
      "1ª matrícula",
      listing.firstRegistration ?? (listing.year ? String(listing.year) : null),
    ],
    [
      "Quilómetros",
      listing.km != null ? `${listing.km.toLocaleString("pt-PT")} km` : null,
    ],
    ["Combustível", listing.fuel],
    ["Caixa", listing.gearbox],
    ["Cilindrada", listing.displacement ? `${listing.displacement} cm³` : null],
    ["Potência", listing.power ? `${listing.power} cv` : null],
    ["CO₂", listing.co2 != null ? `${listing.co2} g/km` : null],
    ["Norma de emissões", listing.emissionStandard],
    ["Carroçaria", listing.bodyType],
    ["Portas", listing.doors ? String(listing.doors) : null],
    ["Lugares", listing.seats ? String(listing.seats) : null],
  ];

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: listing.title,
    url: absolute(`/importar-carros/anuncio/${listing.id}`),
    ...(photos[0] ? { image: photos[0] } : {}),
    ...(listing.brand
      ? { brand: { "@type": "Brand", name: listing.brand } }
      : {}),
    ...(listing.priceEur != null
      ? {
          offers: {
            "@type": "Offer",
            price: listing.priceEur,
            priceCurrency: "EUR",
            availability: listing.active
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }
      : {}),
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <JsonLd data={productLd} />
      <SiteHeader />
      <div className="mx-auto w-[min(1100px,94%)] py-6">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          ›{" "}
          <Link href="/importar-carros" className="hover:underline">
            Importar carros
          </Link>{" "}
          ›{" "}
          <Link
            href={`/importar-carros/${country?.slug ?? ""}`}
            className="hover:underline"
          >
            {country?.name ?? listing.country}
          </Link>{" "}
          › <b className="text-ink">{listing.title}</b>
        </div>

        {!listing.active && (
          <div className="mb-4 rounded-xl border border-clay bg-[#F9E8DB] p-3 text-[0.9rem] font-semibold text-clay">
            Este anúncio já não está disponível no site de origem.
          </div>
        )}
        {listing.suspicious && (
          <div className="mb-4 rounded-xl border border-clay bg-[#F9E8DB] p-3 text-[0.9rem] font-semibold text-clay">
            ⚠️ Alguns dados deste anúncio parecem implausíveis e estão por
            confirmar. Verifica tudo junto do vendedor antes de avançar.
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-5">
            <div className="n2-card overflow-hidden">
              <ExternalGallery photos={photos} title={listing.title} />
              <div className="p-5">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="n2-tag bg-ink">
                    {country?.flag} Anúncio estrangeiro · {country?.name}
                  </span>
                  {listing.region && (
                    <span className="text-[0.85rem] font-medium text-n2muted">
                      📍 {listing.region}
                    </span>
                  )}
                </div>
                <h1 className="font-head text-[1.7rem] font-extrabold leading-tight text-ink">
                  {listing.title}
                </h1>
                {listing.version && (
                  <p className="text-[0.95rem] text-n2muted">
                    {listing.version}
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {specs
                    .filter(([, v]) => v)
                    .map(([l, v]) => (
                      <div
                        key={l}
                        className="rounded-xl border border-outline p-2.5"
                      >
                        <div className="text-[0.7rem] font-bold uppercase tracking-wider text-n2muted2">
                          {l}
                        </div>
                        <div className="font-head text-[0.98rem] font-bold text-ink">
                          {v}
                        </div>
                      </div>
                    ))}
                </div>
                {listing.description && (
                  <p className="mt-4 whitespace-pre-line text-[0.92rem] leading-relaxed text-n2muted">
                    {listing.description.slice(0, 4000)}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-outline pt-3 text-[0.85rem] text-n2muted">
                  <span>
                    Vendedor:{" "}
                    <b className="text-ink">
                      {listing.sellerName ?? listing.sellerType ?? "—"}
                    </b>
                    {listing.sellerName && listing.sellerType
                      ? ` (${listing.sellerType})`
                      : ""}
                  </span>
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="ml-auto font-semibold text-clay hover:underline"
                  >
                    Ver anúncio original ({listing.sourceSlug}) ↗
                  </a>
                </div>
              </div>
            </div>

            {breakdown && (
              <div className="n2-card p-5" id="importar">
                <h2 className="mb-1 font-head text-[1.3rem] font-extrabold text-ink">
                  🇵🇹 Importar para Portugal
                </h2>
                <p className="mb-3 text-[0.88rem] text-n2muted">
                  Estimativa completa do custo deste carro legalizado e
                  matriculado em Portugal.
                </p>
                <ImportCostBreakdown
                  breakdown={breakdown}
                  ptMedian={ptMedian}
                  savings={deal?.savings ?? null}
                  rating={deal?.rating ?? null}
                />
              </div>
            )}

            <div className="n2-card p-5">
              <h2 className="mb-3 font-head text-[1.2rem] font-extrabold text-ink">
                Processo de importação passo a passo
              </h2>
              <ol className="flex flex-col gap-3">
                {IMPORT_STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay font-head text-[0.85rem] font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-head font-bold text-ink">
                        {s.title}
                      </div>
                      <p className="text-[0.86rem] leading-relaxed text-n2muted">
                        {s.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="n2-card p-5">
                <h2 className="mb-2 font-head text-[1.1rem] font-extrabold text-ink">
                  📄 Documentos necessários
                </h2>
                <ul className="list-disc space-y-1 pl-5 text-[0.86rem] text-n2muted">
                  {IMPORT_DOCUMENTS.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              <div className="n2-card p-5">
                <h2 className="mb-2 font-head text-[1.1rem] font-extrabold text-ink">
                  ⚠️ Riscos e avisos
                </h2>
                <ul className="list-disc space-y-1 pl-5 text-[0.86rem] text-n2muted">
                  {IMPORT_RISKS.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-[86px]">
            <div className="n2-card p-5">
              <div className="text-[0.8rem] font-semibold uppercase tracking-wider text-n2muted2">
                Preço na {country?.name ?? "origem"}
              </div>
              <div className="font-head text-[2rem] font-extrabold text-ink">
                {listing.priceEur != null
                  ? fmtEur(listing.priceEur)
                  : "Sob consulta"}
              </div>
              {breakdown && (
                <>
                  <div className="mt-2 flex items-center justify-between text-[0.95rem]">
                    <span className="text-n2muted">+ importação</span>
                    <b className="text-ink">
                      {fmtEur(breakdown.totalEur - breakdown.vehiclePriceEur)}
                    </b>
                  </div>
                  <div className="mt-1 flex items-center justify-between border-t border-outline pt-2">
                    <span className="font-semibold text-n2muted">
                      Total estimado em PT
                    </span>
                    <span className="font-head text-[1.3rem] font-extrabold text-ink">
                      {fmtEur(breakdown.totalEur)}
                    </span>
                  </div>
                </>
              )}
              {deal && (
                <div className="mt-2 flex flex-col gap-1">
                  <ImportDealBadge rating={deal.rating} />
                  <span
                    className={`text-[0.9rem] font-bold ${deal.savings >= 0 ? "text-olive" : "text-clay"}`}
                  >
                    {deal.savings >= 0
                      ? `Poupança estimada: ${fmtEur(deal.savings)}`
                      : `Mais caro que em PT: ${fmtEur(-deal.savings)}`}
                  </span>
                  {ptStats && (
                    <span className="text-[0.78rem] text-n2muted2">
                      Em Portugal: {fmtEur(ptStats.p25)}–{fmtEur(ptStats.p75)} (
                      {ptStats.count} anúncios comparáveis)
                    </span>
                  )}
                </div>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <ImportLeadButton
                  listingId={listing.id}
                  vehicleTitle={`${listing.title}${listing.year ? ` (${listing.year})` : ""}`}
                  country={listing.country}
                  suggestedBudget={breakdown?.totalEur ?? listing.priceEur}
                />
                <a
                  href={listing.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="btn-line w-full text-center"
                >
                  Ver anúncio original ↗
                </a>
              </div>
              <p className="mt-3 text-[0.72rem] leading-snug text-n2muted2">
                Anúncio agregado de {listing.sourceSlug}. O Nacional 2 não é o
                vendedor — valores de importação são estimativas.
              </p>
            </div>
            {listing.brand && listing.model && (
              <Link
                href={`/carros?marca=${encodeURIComponent(listing.brand)}&modelo=${encodeURIComponent(listing.model)}`}
                className="n2-card block p-4 text-[0.9rem] font-semibold text-clay hover:underline"
              >
                Ver {listing.brand} {listing.model} à venda em Portugal →
              </Link>
            )}
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
