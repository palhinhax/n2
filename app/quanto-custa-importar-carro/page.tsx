import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import JsonLd from "@/components/json-ld";
import { absolute, SITE_NAME } from "@/lib/seo";
import {
  IMPORT_DISCLAIMER,
  IMPORT_FAQ,
  IMPORT_RISKS,
  IMPORT_STEPS,
} from "@/lib/import-content";
import { IMPORT_COUNTRIES } from "@/lib/import-countries";
import { fmtEur } from "@/lib/constants";
import {
  DEFAULT_ASSUMPTIONS,
  estimateImportCost,
  getImportAssumptions,
} from "@/lib/import-cost";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quanto custa importar um carro para Portugal em 2026?",
  description:
    "Guia completo com todos os custos de importar um carro da Europa: ISV, IUC, transporte, matrícula de exportação, inspeção tipo B, homologação e legalização — com exemplo real calculado passo a passo.",
  alternates: { canonical: absolute("/quanto-custa-importar-carro") },
  openGraph: {
    title: `Quanto custa importar um carro? | ${SITE_NAME}`,
    description:
      "Todos os custos de importar um carro da Europa para Portugal, com exemplo calculado.",
  },
};

export default async function QuantoCustaImportar() {
  const assumptions = await getImportAssumptions().catch(
    () => DEFAULT_ASSUMPTIONS
  );

  // exemplo realista: BMW 320d de 2021 comprado na Alemanha por 22.500 €
  const example = estimateImportCost(
    {
      price: 22500,
      currency: "EUR",
      country: "DE",
      fuel: "Diesel",
      year: 2021,
      firstRegistration: "2021-06",
      displacement: 1995,
      power: 190,
      co2: 125,
    },
    assumptions
  );

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
      <div className="mx-auto w-[min(1000px,94%)] py-8">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          › <b className="text-ink">Quanto custa importar um carro</b>
        </div>
        <h1 className="font-head text-[2rem] font-extrabold text-ink">
          Quanto custa importar um carro para Portugal?
        </h1>
        <p className="mb-6 max-w-3xl text-[0.98rem] leading-relaxed text-n2muted">
          Importar um carro da Europa pode poupar milhares de euros — ou sair
          caro, se falhares nas contas. Este guia soma <b>todos</b> os custos: o
          preço do carro, o transporte, os documentos, a inspeção, a legalização
          e os impostos (ISV e IUC). No fim tens um exemplo real calculado ao
          cêntimo.
        </p>

        <section className="n2-card mb-6 overflow-x-auto p-5">
          <h2 className="mb-3 font-head text-[1.3rem] font-extrabold text-ink">
            Tabela de custos típicos (2026)
          </h2>
          <table className="w-full text-[0.92rem]">
            <thead>
              <tr className="border-b border-outline text-left font-head text-[0.75rem] uppercase tracking-wider text-n2muted2">
                <th className="py-2 pr-3">Custo</th>
                <th className="py-2 pr-3">Valor típico</th>
                <th className="py-2">Notas</th>
              </tr>
            </thead>
            <tbody className="text-n2muted">
              {[
                [
                  "Transporte (camião)",
                  `${fmtEur(Math.round(assumptions.transportBase + assumptions.transportPerKm * 630))}–${fmtEur(Math.round(assumptions.transportBase + assumptions.transportPerKm * 2600))}`,
                  "Espanha é o mais barato; Alemanha/Áustria os mais caros",
                ],
                [
                  "Matrícula de exportação + documentos",
                  `~${fmtEur(assumptions.tempPlatesDocs)}`,
                  "Matrícula de trânsito, seguro temporário e COC",
                ],
                [
                  "Inspeção tipo B",
                  `~${fmtEur(assumptions.inspectionB)}`,
                  "Obrigatória para todos os importados",
                ],
                [
                  "Homologação + matrícula + chapas",
                  `~${fmtEur(assumptions.homologation + assumptions.registration + assumptions.plates)}`,
                  "Modelo 9 do IMT, DAV e chapas",
                ],
                [
                  "Outras despesas administrativas",
                  `~${fmtEur(assumptions.adminBuffer)}`,
                  "Traduções, deslocações, despachante",
                ],
                [
                  "ISV",
                  "0 € a vários milhares",
                  "Depende de cilindrada, CO₂ e idade — elétricos isentos",
                ],
                [
                  "IUC (anual)",
                  "0 € a 700+ €/ano",
                  "Imposto anual — não entra no custo de importação",
                ],
              ].map(([c, v, n]) => (
                <tr key={c as string} className="border-b border-outline/60">
                  <td className="py-2 pr-3 font-semibold text-ink">{c}</td>
                  <td className="py-2 pr-3">{v}</td>
                  <td className="py-2 text-[0.85rem]">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="n2-card mb-6 p-5">
          <h2 className="mb-1 font-head text-[1.3rem] font-extrabold text-ink">
            Exemplo real: BMW 320d (2021) comprado na Alemanha
          </h2>
          <p className="mb-3 text-[0.88rem] text-n2muted">
            190 cv, 1.995 cm³, 125 g CO₂/km (WLTP), comprado por 22.500 € num
            stand alemão.
          </p>
          <table className="w-full max-w-lg text-[0.95rem]">
            <tbody>
              <tr className="border-b border-outline/60">
                <td className="py-1.5 text-n2muted">Preço do carro</td>
                <td className="py-1.5 text-right font-semibold text-ink">
                  {fmtEur(example.vehiclePriceEur)}
                </td>
              </tr>
              {example.lines.map((l) => (
                <tr key={l.key} className="border-b border-outline/60">
                  <td className="py-1.5 text-n2muted">{l.label}</td>
                  <td className="py-1.5 text-right font-medium text-ink">
                    {fmtEur(l.amount)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-2 font-head font-extrabold text-ink">
                  Total estimado em Portugal
                </td>
                <td className="py-2 text-right font-head text-[1.2rem] font-extrabold text-ink">
                  {fmtEur(example.totalEur)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[0.85rem] text-n2muted">
            Se o mesmo carro custar 32.000–35.000 € em Portugal, a poupança
            estimada é de {fmtEur(32000 - example.totalEur)}–
            {fmtEur(35000 - example.totalEur)} —{" "}
            <b className="text-olive">um excelente negócio de importação</b>.
            IUC anual estimado: {fmtEur(example.iucAnnual)}.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 font-head text-[1.3rem] font-extrabold text-ink">
            O processo, passo a passo
          </h2>
          <ol className="grid gap-3 md:grid-cols-2">
            {IMPORT_STEPS.map((s, i) => (
              <li key={s.title} className="n2-card p-4">
                <div className="font-head text-[0.98rem] font-extrabold text-ink">
                  {i + 1}. {s.title}
                </div>
                <p className="text-[0.86rem] leading-relaxed text-n2muted">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="n2-card mb-6 p-5">
          <h2 className="mb-2 font-head text-[1.2rem] font-extrabold text-ink">
            Riscos a evitar
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-[0.9rem] text-n2muted">
            {IMPORT_RISKS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 font-head text-[1.3rem] font-extrabold text-ink">
            De onde importar?
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {IMPORT_COUNTRIES.map((c) => (
              <Link
                key={c.code}
                href={`/importar-carros/${c.slug}`}
                className="n2-chip"
              >
                {c.flag} Importar da {c.name}
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 font-head text-[1.3rem] font-extrabold text-ink">
            Perguntas frequentes
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
        </section>

        <div className="n2-card bg-gradient-to-r from-white to-[#F4E9D2] p-5 text-center">
          <h2 className="font-head text-[1.3rem] font-extrabold text-ink">
            Vê os carros da Europa com o custo total já calculado
          </h2>
          <p className="mb-3 text-[0.9rem] text-n2muted">
            Poupa as contas: cada anúncio estrangeiro no Nacional 2 mostra o
            total estimado em Portugal e a comparação com o mercado nacional.
          </p>
          <Link href="/importar-carros" className="btn-clay">
            Explorar carros na Europa →
          </Link>
        </div>

        <p className="mt-6 rounded-xl bg-[#F4E9D2] p-3 text-[0.78rem] leading-snug text-n2muted">
          ⚠️ {IMPORT_DISCLAIMER}
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
