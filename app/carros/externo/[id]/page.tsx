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
import ExternalGallery from "@/components/external-gallery";

export const dynamic = "force-dynamic";

export default async function ExternalCarDetail({
  params,
}: {
  params: { id: string };
}) {
  let listing = await prisma.scrapedListing.findUnique({
    where: { id: params.id },
  });
  if (!listing) notFound();

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

  let equipment: { group: string; items: string[] }[] = [];
  try {
    equipment = JSON.parse(listing.equipment || "[]");
  } catch {
    equipment = [];
  }

  const specs: [string, string | null][] = [
    ["Marca", listing.brand],
    ["Modelo", listing.model],
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
      listing.displacement != null ? `${listing.displacement} cm³` : null,
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

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
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

        <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-5">
            <ExternalGallery photos={photos} title={listing.title} />

            {listing.description && (
              <div className="n2-card p-5">
                <h2 className="mb-2 font-head text-[1.1rem] font-bold text-ink">
                  Descrição
                </h2>
                <p className="whitespace-pre-line text-[0.92rem] leading-relaxed text-ink/90">
                  {listing.description}
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
          </div>

          <div className="flex flex-col gap-4">
            <div className="n2-card p-5">
              <span className="n2-tag bg-bark">{sourceLabel}</span>
              <h1 className="mt-2 font-head text-[1.5rem] font-extrabold leading-tight text-ink">
                {listing.title}
              </h1>
              <div className="mt-2 font-head text-[2rem] font-extrabold text-ink">
                {listing.price != null ? fmtEur(listing.price) : "Sob consulta"}
              </div>
              <a
                href={listing.url}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="n2-btn mt-4 block w-full text-center"
              >
                Ver anúncio original no {sourceLabel} ↗
              </a>
              <p className="mt-3 text-[0.76rem] leading-snug text-n2muted2">
                Anúncio externo: os dados e as imagens pertencem ao site de
                origem e ao vendedor. O contacto e a negociação fazem-se no site
                original.
              </p>
              {isAdmin && <RefreshDetailsButton id={listing.id} />}
            </div>

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
