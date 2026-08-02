import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import JsonLd from "@/components/json-ld";
import { computeMarketIndex, monthLabel } from "@/lib/market-index";
import {
  TrendChart,
  FuelDonut,
  HBars,
  ColumnChart,
  FUEL_COLOR,
  CHART,
} from "@/components/market-charts";
import { fmtEur } from "@/lib/constants";
import { absolute, SITE_NAME, SITE_URL } from "@/lib/seo";

// Recalcula 2x/dia — os agregados mudam ao ritmo do scraping, não em tempo real.
export const revalidate = 43200;

export const metadata: Metadata = {
  title: "Índice Nacional 2 — preços de carros usados em Portugal",
  description:
    "Quanto custam os carros usados em Portugal? Mediana de preços por mês, combustível, ano e marca, tempo médio até vender e desvalorização — calculado a partir de milhares de anúncios de todos os portais.",
  alternates: { canonical: "/indice-precos" },
  openGraph: {
    title: `Índice Nacional 2 — preços de carros usados em Portugal | ${SITE_NAME}`,
    description:
      "Mediana de preços do mercado de usados português, por mês, combustível, ano e marca — dados agregados de todos os portais.",
  },
};

function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="n2-card relative overflow-hidden p-4">
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: accent ?? CHART.clay }}
      />
      <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-n2muted">
        {label}
      </p>
      <p className="font-head text-[1.5rem] font-extrabold leading-tight text-ink">
        {value}
      </p>
      {hint && <p className="text-[0.76rem] text-n2muted2">{hint}</p>}
    </div>
  );
}

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

  const sellAll = idx?.sellTimes.find((s) => s.seg === "Todos");
  const dropPct =
    idx?.drops && idx.activeCount > 0
      ? Math.round((idx.drops.count / idx.activeCount) * 100)
      : null;

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
          Quanto custam os carros usados em Portugal — calculado a partir do
          inventário agregado de todos os grandes portais (OLX, Standvirtual,
          Pisca Pisca e Auto SAPO). Dados abertos: cita à vontade com link para
          esta página.
        </p>

        {!idx ? (
          <div className="n2-card mt-6 p-10 text-center text-n2muted">
            Os dados do índice estão temporariamente indisponíveis. Volta daqui
            a pouco.
          </div>
        ) : (
          <>
            {/* headline */}
            <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatTile
                label="Mediana atual"
                value={
                  idx.currentMedian != null ? fmtEur(idx.currentMedian) : "—"
                }
                accent={CHART.clay}
              />
              <StatTile
                label="Variação mensal"
                value={
                  idx.momPct == null
                    ? "—"
                    : `${idx.momPct > 0 ? "▲ +" : "▼ "}${idx.momPct.toLocaleString("pt-PT")}%`
                }
                hint="da mediana vs mês anterior"
                accent={
                  idx.momPct == null
                    ? CHART.muted
                    : idx.momPct > 0
                      ? CHART.rust
                      : CHART.green
                }
              />
              <StatTile
                label="Anúncios ativos"
                value={idx.activeCount.toLocaleString("pt-PT")}
                hint="em 4 portais, sem duplicados"
                accent={CHART.blue}
              />
              <StatTile
                label="Tempo até vender"
                value={sellAll ? `${sellAll.medianDays} dias` : "—"}
                hint="mediana até sair do portal"
                accent={CHART.teal}
              />
              <StatTile
                label="Com desconto"
                value={dropPct != null ? `${dropPct}%` : "—"}
                hint={
                  idx.drops
                    ? `descida mediana ${fmtEur(idx.drops.medianDrop)}`
                    : "dos anúncios ativos"
                }
                accent={CHART.green}
              />
            </section>

            {/* evolução mensal */}
            {idx.months.length >= 2 && (
              <section className="n2-card mt-6 p-5">
                <h2 className="font-head text-[1.3rem] font-extrabold text-ink">
                  Mediana de preço, mês a mês
                </h2>
                <p className="mb-2 text-[0.85rem] text-n2muted">
                  Um anúncio conta num mês se esteve visível nesse mês.
                </p>
                <TrendChart
                  id="meses"
                  color={CHART.clay}
                  points={idx.months.map((m) => ({
                    label: monthLabel(m.month),
                    value: m.median,
                    sub: `${m.n.toLocaleString("pt-PT")} anúncios`,
                  }))}
                />
              </section>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* mix por combustível */}
              <section className="n2-card p-5">
                <h2 className="font-head text-[1.2rem] font-extrabold text-ink">
                  O mercado por combustível
                </h2>
                <p className="mb-3 text-[0.85rem] text-n2muted">
                  Quota da oferta ativa e preço mediano de cada segmento.
                </p>
                <FuelDonut
                  slices={idx.fuels.map((f) => ({
                    label: f.seg,
                    value: f.n,
                    detail: fmtEur(f.median),
                  }))}
                  centerTop={idx.activeCount.toLocaleString("pt-PT")}
                  centerBottom="anúncios ativos"
                />
              </section>

              {/* desvalorização por ano */}
              {idx.yearCurve.length >= 4 && (
                <section className="n2-card p-5">
                  <h2 className="font-head text-[1.2rem] font-extrabold text-ink">
                    A curva da desvalorização
                  </h2>
                  <p className="mb-2 text-[0.85rem] text-n2muted">
                    Preço mediano por ano do carro — quanto “perde” cada ano no
                    mercado real.
                  </p>
                  <TrendChart
                    id="anos"
                    color={CHART.teal}
                    width={480}
                    height={300}
                    points={idx.yearCurve.map((y) => ({
                      label: String(y.year).slice(2),
                      value: y.median,
                      sub: `${y.n.toLocaleString("pt-PT")} anúncios de ${y.year}`,
                    }))}
                  />
                </section>
              )}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* histograma por preço */}
              <section className="n2-card p-5">
                <h2 className="font-head text-[1.2rem] font-extrabold text-ink">
                  Onde está a oferta
                </h2>
                <p className="mb-4 text-[0.85rem] text-n2muted">
                  Nº de anúncios ativos por faixa de preço.
                </p>
                <ColumnChart bands={idx.priceBands} color={CHART.blue} />
              </section>

              {/* tempo até vender por combustível */}
              {idx.sellTimes.length > 1 && (
                <section className="n2-card p-5">
                  <h2 className="font-head text-[1.2rem] font-extrabold text-ink">
                    Quanto tempo demora a vender?
                  </h2>
                  <p className="mb-4 text-[0.85rem] text-n2muted">
                    Dias (mediana) até um anúncio desaparecer do portal de
                    origem — proxy de venda, últimos 60 dias.
                  </p>
                  <HBars
                    rows={idx.sellTimes
                      .filter((s) => s.seg !== "Todos")
                      .map((s) => ({
                        label: s.seg,
                        value: s.medianDays,
                        display: `${s.medianDays} dias`,
                        sub: `${s.n.toLocaleString("pt-PT")} vendidos`,
                        color: FUEL_COLOR[s.seg],
                      }))}
                  />
                  {sellAll && (
                    <p className="mt-3 border-t border-outline pt-2 text-[0.82rem] font-semibold text-n2muted">
                      Mercado todo: {sellAll.medianDays} dias (
                      {sellAll.n.toLocaleString("pt-PT")} anúncios que saíram)
                    </p>
                  )}
                </section>
              )}
            </div>

            {/* marcas */}
            <section className="n2-card mt-6 p-5">
              <h2 className="font-head text-[1.2rem] font-extrabold text-ink">
                Marcas com mais oferta
              </h2>
              <p className="mb-4 text-[0.85rem] text-n2muted">
                Nº de anúncios ativos; o valor à direita é o preço mediano da
                marca.
              </p>
              <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                <HBars
                  rows={idx.brands.slice(0, 6).map((b) => ({
                    label: b.brand,
                    value: b.n,
                    display: fmtEur(b.median),
                    sub: `${b.n.toLocaleString("pt-PT")} anúncios`,
                  }))}
                />
                <HBars
                  rows={idx.brands.slice(6, 12).map((b) => ({
                    label: b.brand,
                    value: b.n,
                    display: fmtEur(b.median),
                    sub: `${b.n.toLocaleString("pt-PT")} anúncios`,
                  }))}
                />
              </div>
            </section>

            <div className="n2-card mt-6 bg-[#FBF3DC] p-5 text-[0.88rem] text-n2muted">
              <b className="font-head text-ink">Metodologia.</b> Medianas
              calculadas sobre anúncios com preço entre 500 € e 300 000 €,
              excluindo duplicados entre portais e anúncios com dados
              implausíveis. A mediana (e não a média) evita que meia dúzia de
              supercarros distorça o valor. “Tempo até vender” mede os dias
              entre a primeira e a última vez que o anúncio foi visto no portal
              de origem. Podes citar estes dados com link para{" "}
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
