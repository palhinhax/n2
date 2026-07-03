import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import Filters from "@/components/filters";
import CarGrid from "@/components/car-grid";
import TrackSearch from "@/components/track-search";
import { fetchListingPage, fetchBrandOptions } from "@/lib/car-listing";
import type { Metadata } from "next";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Record<string, string>;
}): Promise<Metadata> {
  const marca = searchParams.marca?.trim();
  const modelo = searchParams.modelo?.trim();
  const alvo = [marca, modelo].filter(Boolean).join(" ");
  const title = alvo
    ? `${alvo} usados à venda`
    : "Carros usados à venda em Portugal";
  const description = clamp(
    alvo
      ? `Anúncios de ${alvo} usados em Portugal. Compara preços, km e ano de particulares e stands no ${SITE_NAME}. Grátis.`
      : `Milhares de carros usados à venda em Portugal, de particulares e stands. Filtra por marca, preço, km e combustível no ${SITE_NAME}. Grátis.`
  );
  const params = new URLSearchParams();
  if (marca) params.set("marca", marca);
  if (modelo) params.set("modelo", modelo);
  const qs = params.toString();
  return {
    title,
    description,
    alternates: { canonical: absolute("/carros" + (qs ? "?" + qs : "")) },
    openGraph: { title: `${title} | ${SITE_NAME}`, description },
  };
}

export default async function Carros({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const ordenar = searchParams.ordenar || "recentes";

  const brands = await fetchBrandOptions();

  // primeira página da lista combinada (o resto carrega por scroll infinito)
  const query: Record<string, string> = {};
  for (const k of [
    "marca",
    "modelo",
    "precoMax",
    "fuel",
    "caixa",
    "anoMin",
    "kmMax",
    "ordenar",
  ]) {
    const v = searchParams[k];
    if (v) query[k] = v;
  }
  const firstPage = await fetchListingPage(query, 0, 24);

  const sortLink = (v: string) => {
    const p = new URLSearchParams(searchParams as any);
    p.set("ordenar", v);
    return "/carros?" + p.toString();
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
          › <b className="text-ink">Carros usados</b>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[272px_1fr]">
          <Filters brands={brands} />
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="font-head text-[1.3rem] font-extrabold text-ink">
                Carros usados
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
