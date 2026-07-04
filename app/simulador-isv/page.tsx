import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import TaxCalculator from "@/components/tax-calculator";
import JsonLd from "@/components/json-ld";
import { absolute, SITE_NAME } from "@/lib/seo";
import { IMPORT_DISCLAIMER } from "@/lib/import-content";

export const metadata: Metadata = {
  title: "Simulador de ISV 2026 — quanto pagas ao importar um carro",
  description:
    "Simula o ISV de um carro importado da Europa em segundos: cilindrada, CO₂ (WLTP/NEDC), combustível e redução por idade para usados da UE. Inclui IUC anual e custos de legalização.",
  alternates: { canonical: absolute("/simulador-isv") },
  openGraph: {
    title: `Simulador de ISV | ${SITE_NAME}`,
    description:
      "Calcula o ISV e o IUC de um carro importado da Europa, com redução por idade para usados da UE.",
  },
};

const FAQ = [
  {
    q: "Como se calcula o ISV de um carro importado?",
    a: "O ISV soma duas componentes: cilindrada (cm³) e ambiental (g/km de CO₂, tabela WLTP ou NEDC consoante o ano). Aos usados importados da UE aplica-se depois uma redução por idade que vai de 10% (até 1 ano) a 80% (mais de 10 anos).",
  },
  {
    q: "Que carros estão isentos de ISV?",
    a: "Os 100% elétricos estão isentos. Híbridos pagam 60% e híbridos plug-in 25% do ISV, desde que cumpram os requisitos de autonomia e emissões.",
  },
  {
    q: "O simulador substitui o cálculo das Finanças?",
    a: "Não. É uma estimativa fiável para decidir se vale a pena importar, mas o valor final é sempre o da Declaração Aduaneira de Veículo (DAV) nas Finanças.",
  },
];

export default function SimuladorISV() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
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
          › <b className="text-ink">Simulador de ISV</b>
        </div>
        <h1 className="font-head text-[2rem] font-extrabold text-ink">
          Simulador de ISV para carros importados
        </h1>
        <p className="mb-6 max-w-3xl text-[0.95rem] text-n2muted">
          Vais importar um carro da Europa? Simula aqui o ISV (imposto de
          matrícula) e o IUC (imposto anual), com a redução por idade aplicável
          a usados da UE. Depois vê os{" "}
          <Link
            href="/importar-carros"
            className="font-semibold text-clay hover:underline"
          >
            carros à venda na Europa com o custo total já calculado
          </Link>
          .
        </p>

        <TaxCalculator />

        <section className="mt-8">
          <h2 className="mb-3 font-head text-[1.3rem] font-extrabold text-ink">
            Perguntas frequentes
          </h2>
          <div className="flex flex-col gap-2">
            {FAQ.map((f) => (
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

        <p className="mt-6 rounded-xl bg-[#F4E9D2] p-3 text-[0.78rem] leading-snug text-n2muted">
          ⚠️ {IMPORT_DISCLAIMER}
        </p>

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
            href="/carros-importados"
            className="font-semibold text-clay hover:underline"
          >
            melhores negócios de importação
          </Link>{" "}
          ·{" "}
          <Link
            href="/calcular-isv"
            className="font-semibold text-clay hover:underline"
          >
            calculadora ISV/IUC completa
          </Link>
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
