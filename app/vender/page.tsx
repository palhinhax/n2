import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import JsonLd from "@/components/json-ld";
import { absolute, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Vender carro grátis — sem comissões | Nacional 2",
  description:
    "Vende o teu carro usado em Portugal 100% grátis, sem comissões nem taxas. Publica em minutos, recebe ofertas diretas e acompanha tudo na tua garagem digital.",
  alternates: { canonical: absolute("/vender") },
  openGraph: {
    title: `Vender carro grátis, sem comissões | ${SITE_NAME}`,
    description:
      "Publica o teu carro em minutos, sem pagar nada. Ofertas diretas e garagem digital.",
  },
};

const STEPS = [
  {
    n: "1",
    t: "Cria o anúncio em minutos",
    d: "Marca, modelo, fotos e preço. Sugerimos-te um preço com base no mercado real.",
  },
  {
    n: "2",
    t: "Recebe ofertas diretas",
    d: "Os compradores contactam-te e fazem ofertas dentro da plataforma. Sem intermediários.",
  },
  {
    n: "3",
    t: "Vende e fecha negócio",
    d: "Negoceias e combinas a entrega diretamente. Sem comissões sobre a venda.",
  },
];

const WHY = [
  [
    "100% grátis, para sempre",
    "Sem taxas de publicação, sem destaque pago, sem comissão sobre a venda.",
  ],
  [
    "Preço certo à primeira",
    "Mostramos se o teu preço está abaixo, dentro ou acima da mediana de mercado.",
  ],
  [
    "Garagem digital",
    "Guarda o carro, recebe lembretes de IPO, seguro, IUC e manutenção — mesmo depois de vender.",
  ],
  [
    "Ofertas e favoritos",
    "Vê quem guardou o teu carro e recebe propostas diretas dos interessados.",
  ],
];

const FAQ = [
  {
    q: "Vender no Nacional 2 é mesmo grátis?",
    a: "Sim. Publicar, destacar e vender é 100% grátis, sem comissões nem taxas escondidas. Para sempre.",
  },
  {
    q: "Quanto tempo demora a publicar?",
    a: "Poucos minutos. Preenches marca, modelo, ano, quilómetros, fotos e preço, e o anúncio fica online após uma validação rápida.",
  },
  {
    q: "Como recebo o pagamento?",
    a: "O pagamento e a entrega são combinados diretamente entre ti e o comprador. Recomendamos as boas práticas da nossa página de segurança.",
  },
];

export default function Vender() {
  const jsonLd = {
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
      <JsonLd data={jsonLd} />
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/promo.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#2A211A]/70 via-[#2A211A]/40 to-[#2A211A]/70" />
        <div className="relative mx-auto w-[min(1000px,92%)] py-16 text-center text-white">
          <span className="font-head text-[0.85rem] font-bold uppercase tracking-[0.16em] text-sand">
            100% grátis · sem comissões
          </span>
          <h1 className="mt-2 font-head text-[2.6rem] font-extrabold leading-[1.05]">
            Vende o teu carro sem pagar nada
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[1.05rem] text-[#F2E9D6]">
            Publica em minutos, recebe ofertas diretas e acompanha tudo na tua
            garagem digital. Sem taxas, sem comissões, sem surpresas.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/garagem/novo" className="btn-clay">
              Anunciar o meu carro grátis →
            </Link>
            <Link
              href="/avaliar"
              className="n2-btn border border-white/40 bg-white/10 text-white hover:bg-white/20"
            >
              Quanto vale o meu carro?
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto w-[min(1000px,92%)] py-12">
        {/* Passos */}
        <h2 className="text-center font-head text-[1.8rem] font-extrabold text-ink">
          Vender é simples
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="n2-card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-clay font-head text-[1.2rem] font-extrabold text-white">
                {s.n}
              </div>
              <h3 className="mt-3 font-head text-[1.15rem] font-bold text-ink">
                {s.t}
              </h3>
              <p className="mt-1 text-[0.92rem] text-n2muted">{s.d}</p>
            </div>
          ))}
        </div>

        {/* Porquê */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {WHY.map(([t, d]) => (
            <div key={t} className="n2-card flex gap-3 p-5">
              <span className="text-olive">✓</span>
              <div>
                <h3 className="font-head text-[1.05rem] font-bold text-ink">
                  {t}
                </h3>
                <p className="text-[0.9rem] text-n2muted">{d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Comparação vs comissões */}
        <div className="n2-card mt-12 bg-[#FBF3DC] p-7 text-center">
          <h2 className="font-head text-[1.5rem] font-extrabold text-ink">
            Quanto poupas em comissões?
          </h2>
          <p className="mt-1 text-n2muted">
            Muitas plataformas e stands cobram 5% a 10% sobre a venda. Aqui
            pagas <b className="text-ink">0 €</b>.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["10.000 €", "até 1.000 €"],
              ["20.000 €", "até 2.000 €"],
              ["30.000 €", "até 3.000 €"],
            ].map(([v, s]) => (
              <div
                key={v}
                className="rounded-xl border border-outline bg-white p-4"
              >
                <div className="text-[0.8rem] font-semibold text-n2muted">
                  Carro de {v}
                </div>
                <div className="font-head text-[1.2rem] font-extrabold text-ink">
                  Poupas {s}
                </div>
              </div>
            ))}
          </div>
          <Link href="/garagem/novo" className="btn-clay mt-6 inline-flex">
            Começar agora — é grátis
          </Link>
        </div>

        {/* FAQ */}
        <section className="mt-12">
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
      </div>

      <SiteFooter />
    </div>
  );
}
