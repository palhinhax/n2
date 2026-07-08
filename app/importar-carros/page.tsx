import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ImportFilters from "@/components/import-filters";
import ImportGrid from "@/components/import-grid";
import JsonLd from "@/components/json-ld";
import {
  countByCountry,
  fetchImportBrandOptions,
  fetchImportPage,
  IMPORT_QUERY_KEYS,
} from "@/lib/import-listing";
import { IMPORT_COUNTRIES } from "@/lib/import-countries";
import { IMPORT_FAQ } from "@/lib/import-content";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Importar carros da Europa — pesquisa e custo total em Portugal",
  description: clamp(
    "Carros à venda na Alemanha, França, Bélgica, Países Baixos, Espanha e mais — com o custo total de importação para Portugal já calculado: ISV, transporte, legalização e comparação com o mercado português."
  ),
  alternates: { canonical: absolute("/importar-carros") },
  openGraph: {
    title: `Importar carros da Europa | ${SITE_NAME}`,
    description:
      "Descobre carros na Europa e sabe logo quanto custam legalizados em Portugal — e se compensa face ao mercado nacional.",
  },
};

export default async function ImportarCarros({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const query: Record<string, string> = {};
  for (const k of IMPORT_QUERY_KEYS) {
    const v = searchParams[k];
    if (v) query[k] = v;
  }
  const ordenar = searchParams.ordenar || "recentes";

  const [brands, firstPage, byCountry] = await Promise.all([
    fetchImportBrandOptions(query.pais),
    fetchImportPage(query, 0, 24),
    countByCountry(),
  ]);

  const sortLink = (v: string) => {
    const p = new URLSearchParams(searchParams as any);
    p.set("ordenar", v);
    return "/importar-carros?" + p.toString();
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: IMPORT_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <JsonLd data={faqLd} />
      <SiteHeader />
      <div className="mx-auto w-[min(1240px,94%)] py-6">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          › <b className="text-ink">Importar carros da Europa</b>
        </div>

        <div className="n2-card mb-5 bg-gradient-to-r from-white to-[#F4E9D2] p-5">
          <h1 className="font-head text-[1.7rem] font-extrabold text-ink">
            🇪🇺 Importar carros da Europa
          </h1>
          <p className="max-w-3xl text-[0.95rem] text-n2muted">
            Pesquisa carros à venda noutros países europeus com o{" "}
            <b>custo total de importação para Portugal já calculado</b> — ISV,
            transporte, inspeção e legalização — e compara com o preço do mesmo
            carro no mercado português. Os valores são estimativas.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {IMPORT_COUNTRIES.map((c) => (
              <Link
                key={c.code}
                href={`/importar-carros/${c.slug}`}
                className={`n2-chip ${query.pais === c.code ? "!border-clay !bg-clay !text-white" : ""}`}
              >
                {c.flag} {c.name}
                {byCountry[c.code] ? (
                  <span className="ml-1 text-[0.75rem] font-medium opacity-70">
                    {byCountry[c.code].toLocaleString("pt-PT")}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[272px_1fr]">
          <ImportFilters brands={brands} />
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="font-head text-[1.3rem] font-extrabold text-ink">
                Anúncios estrangeiros
                <span className="ml-2 text-[0.9rem] font-semibold text-n2muted">
                  {firstPage.total.toLocaleString("pt-PT")} resultados
                </span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ["recentes", "Recentes"],
                  ["precoAsc", "Preço ↑"],
                  ["totalAsc", "Total em PT ↑"],
                  ["poupanca", "Maior poupança"],
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
            <ImportGrid
              key={JSON.stringify(query)}
              initialItems={firstPage.items}
              initialNextOffset={firstPage.nextOffset}
              query={query}
            />
          </div>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            [
              "💶 Custo total, sem surpresas",
              "Cada anúncio mostra o preço no país de origem e o total estimado legalizado em Portugal: ISV (com redução por idade), transporte, inspeção tipo B, homologação e matrícula.",
            ],
            [
              "⚖️ Compara com Portugal",
              "Cruzamos cada carro estrangeiro com os anúncios equivalentes no mercado português (mesma marca, modelo e geração) e dizemos-te se compensa importar ou comprar cá.",
            ],
            [
              "🧭 Processo passo a passo",
              "Na página de cada carro tens o processo completo de importação, os documentos necessários, os riscos a evitar e um botão para pedires ajuda a importar.",
            ],
          ].map(([t, b]) => (
            <div key={t} className="n2-card p-5">
              <h2 className="mb-1 font-head text-[1.05rem] font-extrabold text-ink">
                {t}
              </h2>
              <p className="text-[0.88rem] leading-relaxed text-n2muted">{b}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 font-head text-[1.3rem] font-extrabold text-ink">
            Perguntas frequentes sobre importação
          </h2>
          <div className="flex flex-col gap-2">
            {IMPORT_FAQ.map((f) => (
              <details key={f.q} className="n2-card p-4">
                <summary className="cursor-pointer select-none font-head font-bold text-ink">
                  {f.q}
                </summary>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-n2muted">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-4 text-[0.85rem] text-n2muted">
            Vê também:{" "}
            <Link
              href="/quanto-custa-importar-carro"
              className="font-semibold text-clay hover:underline"
            >
              quanto custa importar um carro
            </Link>{" "}
            ·{" "}
            <Link
              href="/simulador-isv"
              className="font-semibold text-clay hover:underline"
            >
              simulador de ISV
            </Link>{" "}
            ·{" "}
            <Link
              href="/carros-importados"
              className="font-semibold text-clay hover:underline"
            >
              melhores negócios de importação
            </Link>
          </p>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
