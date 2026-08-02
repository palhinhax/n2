import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import JsonLd from "@/components/json-ld";
import { computeMarketIndex, monthLabel } from "@/lib/market-index";
import { fmtEur } from "@/lib/constants";
import { absolute, SITE_NAME, SITE_URL } from "@/lib/seo";

// Recalcula 2x/dia — os agregados mudam ao ritmo do scraping, não em tempo real.
export const revalidate = 43200;

export const metadata: Metadata = {
  title: "Índice Nacional 2 — preços de carros usados em Portugal",
  description:
    "Quanto custam os carros usados em Portugal? Mediana de preços por mês, combustível e marca, calculada a partir de milhares de anúncios de todos os portais. Atualizado diariamente.",
  alternates: { canonical: "/indice-precos" },
  openGraph: {
    title: `Índice Nacional 2 — preços de carros usados em Portugal | ${SITE_NAME}`,
    description:
      "Mediana de preços do mercado de usados português, por mês, combustível e marca — dados agregados de todos os portais.",
  },
};

export default async function IndicePrecos() {
  const idx = await computeMarketIndex();

  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Índice Nacional 2 de preços de carros usados",
    description:
      "Medianas de preço do mercado português de carros usados, agregadas de anúncios de OLX, Standvirtual, Pisca Pisca e Auto SAPO.",
    url: absolute("/indice-precos"),
    creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    spatialCoverage: "Portugal",
    license: absolute("/indice-precos"),
    isAccessibleForFree: true,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: absolute("/") },
      { "@type": "ListItem", position: 2, name: "Índice de preços" },
    ],
  };

  const maxMedian = idx?.months.length
    ? Math.max(...idx.months.map((m) => m.median))
    : 0;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <JsonLd data={datasetLd} />
      <JsonLd data={breadcrumbLd} />
      <SiteHeader />
      <div className="mx-auto w-[min(1080px,94%)] py-7">
        <nav className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          › <b className="text-ink">Índice de preços</b>
        </nav>
        <h1 className="font-head text-[1.9rem] font-extrabold leading-tight text-ink">
          📈 Índice Nacional 2 de preços
        </h1>
        <p className="mt-1 max-w-3xl text-[0.95rem] text-n2muted">
          Quanto custam os carros usados em Portugal, mês a mês — calculado a
          partir do inventário agregado de todos os grandes portais (OLX,
          Standvirtual, Pisca Pisca e Auto SAPO). Dados abertos: cita à vontade
          com link para esta página.
        </p>

        {!idx ? (
          <div className="n2-card mt-6 p-10 text-center text-n2muted">
            Os dados do índice estão temporariamente indisponíveis. Volta daqui
            a pouco.
          </div>
        ) : (
          <>
            {/* headline */}
            <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="n2-card p-4">
                <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-n2muted">
                  Mediana atual
                </p>
                <p className="font-head text-[1.4rem] font-extrabold text-ink">
                  {idx.currentMedian != null ? fmtEur(idx.currentMedian) : "—"}
                </p>
              </div>
              <div className="n2-card p-4">
                <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-n2muted">
                  Variação mensal
                </p>
                <p
                  className={`font-head text-[1.4rem] font-extrabold ${
                    idx.momPct == null
                      ? "text-ink"
                      : idx.momPct > 0
                        ? "text-[#C6603B]"
                        : "text-olive"
                  }`}
                >
                  {idx.momPct == null
                    ? "—"
                    : `${idx.momPct > 0 ? "+" : ""}${idx.momPct.toLocaleString("pt-PT")}%`}
                </p>
              </div>
              <div className="n2-card p-4">
                <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-n2muted">
                  Anúncios ativos
                </p>
                <p className="font-head text-[1.4rem] font-extrabold text-ink">
                  {idx.activeCount.toLocaleString("pt-PT")}
                </p>
              </div>
              <div className="n2-card p-4">
                <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-n2muted">
                  Fontes
                </p>
                <p className="font-head text-[1.4rem] font-extrabold text-ink">
                  4 portais
                </p>
              </div>
            </section>

            {/* evolução mensal */}
            {idx.months.length >= 2 && (
              <section className="n2-card mt-6 p-5">
                <h2 className="mb-4 font-head text-[1.3rem] font-extrabold text-ink">
                  Mediana de preço, mês a mês
                </h2>
                <div className="flex items-end gap-1.5 sm:gap-3">
                  {idx.months.map((m) => (
                    <div
                      key={m.month}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <span className="text-[0.7rem] font-bold text-ink sm:text-[0.78rem]">
                        {Math.round(m.median / 100) / 10} k€
                      </span>
                      <div
                        className="w-full rounded-t-lg bg-clay/80"
                        style={{
                          height: `${Math.max(12, (m.median / maxMedian) * 160)}px`,
                        }}
                        title={`${monthLabel(m.month)}: ${fmtEur(m.median)} (${m.n.toLocaleString("pt-PT")} anúncios)`}
                      />
                      <span className="text-[0.66rem] font-semibold text-n2muted sm:text-[0.74rem]">
                        {monthLabel(m.month)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {/* por combustível */}
              <section className="n2-card p-5">
                <h2 className="mb-3 font-head text-[1.2rem] font-extrabold text-ink">
                  Por combustível (anúncios ativos)
                </h2>
                <table className="w-full text-[0.92rem]">
                  <thead>
                    <tr className="text-left text-[0.76rem] uppercase tracking-wide text-n2muted">
                      <th className="pb-2">Segmento</th>
                      <th className="pb-2 text-right">Mediana</th>
                      <th className="pb-2 text-right">Anúncios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {idx.fuels.map((f) => (
                      <tr key={f.seg} className="border-t border-outline">
                        <td className="py-1.5 font-semibold text-ink">
                          {f.seg}
                        </td>
                        <td className="py-1.5 text-right font-bold text-ink">
                          {fmtEur(f.median)}
                        </td>
                        <td className="py-1.5 text-right text-n2muted">
                          {f.n.toLocaleString("pt-PT")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* por marca */}
              <section className="n2-card p-5">
                <h2 className="mb-3 font-head text-[1.2rem] font-extrabold text-ink">
                  Marcas com mais oferta
                </h2>
                <table className="w-full text-[0.92rem]">
                  <thead>
                    <tr className="text-left text-[0.76rem] uppercase tracking-wide text-n2muted">
                      <th className="pb-2">Marca</th>
                      <th className="pb-2 text-right">Mediana</th>
                      <th className="pb-2 text-right">Anúncios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {idx.brands.map((b) => (
                      <tr key={b.brand} className="border-t border-outline">
                        <td className="py-1.5 font-semibold text-ink">
                          <Link
                            href={`/carros?marca=${encodeURIComponent(b.brand)}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {b.brand}
                          </Link>
                        </td>
                        <td className="py-1.5 text-right font-bold text-ink">
                          {fmtEur(b.median)}
                        </td>
                        <td className="py-1.5 text-right text-n2muted">
                          {b.n.toLocaleString("pt-PT")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>

            <div className="n2-card mt-6 bg-[#FBF3DC] p-5 text-[0.88rem] text-n2muted">
              <b className="font-head text-ink">Metodologia.</b> Medianas
              calculadas sobre anúncios com preço entre 500 € e 300 000 €,
              excluindo duplicados entre portais e anúncios com dados
              implausíveis. Um anúncio conta num mês se esteve visível nesse
              mês. A mediana (e não a média) evita que meia dúzia de supercarros
              distorça o valor. Podes citar estes dados com link para{" "}
              <span className="font-semibold text-ink">
                nacional-2.pt/indice-precos
              </span>
              .
            </div>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
