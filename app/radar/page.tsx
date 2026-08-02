import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ExternalCarCard from "@/components/external-car-card";
import JsonLd from "@/components/json-ld";
import { findDeals } from "@/lib/deal-radar";
import { DISTRICTS, fmtEur } from "@/lib/constants";
import { absolute, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Record<string, string>;
}): Promise<Metadata> {
  const distrito = searchParams.distrito?.trim();
  const title = distrito
    ? `Radar de Negócios em ${distrito} — carros abaixo do mercado`
    : "Radar de Negócios — carros usados abaixo do preço de mercado";
  const description =
    "Anúncios recentes com preço claramente abaixo da mediana de mercado do próprio modelo, detetados automaticamente em todos os portais. Atualizado ao longo do dia.";
  const path = "/radar" + (distrito ? `?distrito=${distrito}` : "");
  return {
    title,
    description,
    alternates: { canonical: absolute(path) },
    openGraph: { title: `${title} | ${SITE_NAME}`, description },
  };
}

export default async function Radar({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const distrito = searchParams.distrito?.trim() || undefined;
  const deals = await findDeals({ distrito, sinceDays: 7 });

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: absolute("/") },
      { "@type": "ListItem", position: 2, name: "Radar de negócios" },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <JsonLd data={breadcrumbLd} />
      <SiteHeader />
      <div className="mx-auto w-[min(1240px,94%)] py-7">
        <nav className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          › <b className="text-ink">Radar de negócios</b>
        </nav>
        <h1 className="font-head text-[1.9rem] font-extrabold leading-tight text-ink">
          🎯 Radar de negócios
          {distrito ? ` em ${distrito}` : ""}
        </h1>
        <p className="mt-1 max-w-3xl text-[0.95rem] text-n2muted">
          Carros anunciados nos últimos 7 dias com preço claramente abaixo da
          mediana de mercado do próprio modelo — em todos os portais ao mesmo
          tempo. Os bons negócios desaparecem em horas:{" "}
          <b className="text-ink">quem vê primeiro, ganha</b>.
        </p>

        <form action="/radar" className="mt-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="flabel">Distrito</label>
            <select name="distrito" className="finput" defaultValue={distrito}>
              <option value="">Todo o país</option>
              {DISTRICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <button className="btn-clay btn-sm">Filtrar</button>
        </form>

        {deals.length === 0 ? (
          <div className="n2-card mt-6 p-10 text-center">
            <h2 className="font-head text-[1.2rem] font-bold text-ink">
              Sem negócios detetados nesta zona, por agora
            </h2>
            <p className="mt-1 text-n2muted">
              O radar atualiza ao longo do dia com o novo inventário.{" "}
              <Link href="/radar" className="font-semibold text-clay underline">
                Vê o país inteiro
              </Link>{" "}
              ou volta mais tarde.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {deals.map((d) => (
              <div key={d.listing.id} className="flex flex-col gap-1.5">
                <ExternalCarCard listing={{ ...d.listing, _rating: "great" }} />
                <p className="rounded-xl bg-olive/10 px-3 py-1.5 text-center text-[0.8rem] font-bold text-olive">
                  {d.belowPct}% abaixo da mediana ({fmtEur(d.stats.median)},{" "}
                  {d.stats.count} anúncios)
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="n2-card mt-8 bg-[#FBF3DC] p-5 text-[0.88rem] text-n2muted">
          <b className="font-head text-ink">Como funciona o radar?</b> Para cada
          anúncio novo calculamos a mediana de preço dos anúncios ativos do
          mesmo modelo (todos os portais). Entram aqui os que estão pelo menos
          10% abaixo — descontos irrealistas (&gt;45%) ficam de fora, por
          cheirarem a erro ou esquema. Confirma sempre o carro pessoalmente
          antes de qualquer pagamento.
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
