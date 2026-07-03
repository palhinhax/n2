import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import Filters from "@/components/filters";
import CarGrid from "@/components/car-grid";
import TrackSearch from "@/components/track-search";
import { fetchListingPage, fetchBrandOptions } from "@/lib/car-listing";
import type { Metadata } from "next";
import { absolute, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carros elétricos usados à venda em Portugal",
  description: `Carros 100% elétricos usados de particulares e stands. Compara autonomia, preço e km no ${SITE_NAME}. Grátis.`,
  alternates: { canonical: absolute("/eletricos") },
  openGraph: {
    title: `Carros elétricos usados | ${SITE_NAME}`,
    description:
      "Carros 100% elétricos usados de particulares e stands. Compara autonomia, preço e km. Grátis.",
  },
};

const FUEL = "Elétrico";

export default async function Eletricos({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const ordenar = searchParams.ordenar || "recentes";

  // marcas/modelos só de carros elétricos
  const brands = await fetchBrandOptions({ electric: true });

  // combustível fixo em Elétrico; os restantes filtros vêm do URL
  const query: Record<string, string> = { fuel: FUEL };
  for (const k of [
    "marca",
    "modelo",
    "precoMax",
    "caixa",
    "anoMin",
    "kmMax",
    "ordenar",
    "carroceria",
    "cor",
    "potMin",
    "lugares",
    "mensalMax",
  ]) {
    const v = searchParams[k];
    if (v) query[k] = v;
  }
  const firstPage = await fetchListingPage(query, 0, 24);

  const sortLink = (v: string) => {
    const p = new URLSearchParams(searchParams as any);
    p.set("ordenar", v);
    return "/eletricos?" + p.toString();
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <TrackSearch query={query} />
      <div className="mx-auto w-[min(1240px,94%)] py-6">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          › <b className="text-ink">Carros elétricos</b>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[272px_1fr]">
          <Filters
            brands={brands}
            hideFuel
            basePath="/eletricos"
            fixed={{ fuel: FUEL }}
          />
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="font-head text-[1.3rem] font-extrabold text-ink">
                ⚡ Carros elétricos
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
            <CarGrid
              key={JSON.stringify(query)}
              initialItems={firstPage.items}
              initialNextOffset={firstPage.nextOffset}
              query={query}
            />
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
