import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import TaxCalculator from "@/components/tax-calculator";
import JsonLd from "@/components/json-ld";
import { absolute, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Calculadora de ISV e IUC 2026 — Importar carro para Portugal",
  description:
    "Calcula grátis o ISV (imposto de matrícula) e o IUC (imposto anual) de um carro usado, e o custo total de importar para Portugal em 2026. Simulação instantânea por cilindrada, CO₂ e ano.",
  alternates: { canonical: absolute("/calcular-isv") },
  openGraph: {
    title: `Calculadora de ISV e IUC 2026 | ${SITE_NAME}`,
    description:
      "Calcula o ISV, o IUC e o custo total de importar um carro para Portugal. Grátis e instantâneo.",
  },
};

const FAQ = [
  {
    q: "O que é o ISV?",
    a: "O ISV (Imposto Sobre Veículos) é o imposto de matrícula, pago uma única vez quando o carro é matriculado pela primeira vez em Portugal. Calcula-se pela cilindrada e pelas emissões de CO₂.",
  },
  {
    q: "O que é o IUC?",
    a: "O IUC (Imposto Único de Circulação) é o imposto anual sobre a propriedade do veículo — o antigo 'selo do carro'. Paga-se todos os anos no mês da matrícula.",
  },
  {
    q: "Os carros elétricos pagam ISV e IUC?",
    a: "Não. Os veículos exclusivamente elétricos estão isentos de ISV e de IUC em Portugal.",
  },
  {
    q: "Há desconto ao importar um usado da UE?",
    a: "Sim. Os usados importados da União Europeia têm um desconto no ISV que aumenta com a idade do carro, de 10% (até 1 ano) até 80% (mais de 10 anos).",
  },
];

export default function CalcularISV() {
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
          › <b className="text-ink">Calculadora ISV / IUC</b>
        </div>
        <span className="font-head text-[0.82rem] font-bold uppercase tracking-[0.14em] text-olive">
          Grátis · tabelas 2026
        </span>
        <h1 className="mb-1 font-head text-[2rem] font-extrabold text-ink">
          Calculadora de ISV e IUC
        </h1>
        <p className="mb-6 max-w-2xl text-n2muted">
          Estás a pensar importar um carro? Calcula em segundos o ISV (imposto
          de matrícula), o IUC (imposto anual) e o custo total de trazer o carro
          para Portugal.
        </p>

        <TaxCalculator />

        <section className="mt-10">
          <h2 className="mb-4 font-head text-[1.5rem] font-extrabold text-ink">
            Perguntas frequentes
          </h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((f) => (
              <div key={f.q} className="n2-card p-5">
                <h3 className="mb-1 font-head text-[1.05rem] font-bold text-ink">
                  {f.q}
                </h3>
                <p className="text-[0.92rem] text-n2muted">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 text-center">
          <Link href="/carros" className="btn-clay">
            Ver carros à venda em Portugal
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
