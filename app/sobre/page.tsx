import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import JsonLd from "@/components/json-ld";
import { absolute, clamp, SITE_NAME, SITE_URL } from "@/lib/seo";

export const revalidate = 86400;

const TITLE = `Sobre o ${SITE_NAME}`;
const CONTACT_EMAIL = "hello@athlifyr.com";

export const metadata: Metadata = {
  title: TITLE,
  description: clamp(
    `O que é o ${SITE_NAME}, quem o criou, como funciona, como ganha dinheiro e como tratamos os anúncios externos. Transparência total.`
  ),
  alternates: { canonical: absolute("/sobre") },
  openGraph: { title: `${TITLE} | ${SITE_NAME}` },
};

const SECTIONS: { h2: string; body: string[] }[] = [
  {
    h2: "O que é o Nacional 2",
    body: [
      "O Nacional 2 é um marketplace português de carros usados, 100% grátis para quem anuncia — particulares e stands, sem comissões nem destaques pagos obrigatórios. Além dos anúncios publicados diretamente no site, agregamos anúncios de outros portais portugueses, sempre com a origem identificada e ligação ao anúncio original.",
      "O nome vem da Estrada Nacional 2 — a estrada que atravessa Portugal de Chaves (km 0) a Faro (km 739). Tal como a EN2, queremos ligar o país inteiro: um só sítio para ver o mercado todo.",
    ],
  },
  {
    h2: "Porque existimos",
    body: [
      "Comprar um carro usado em Portugal ainda é um processo opaco: preços difíceis de comparar, anúncios espalhados por vários sites e pouca informação sobre se um preço é justo. E vender custa dinheiro em quase todo o lado.",
      "O Nacional 2 existe para inverter isso: anunciar é grátis, cada anúncio mostra a comparação com a mediana de mercado calculada sobre anúncios semelhantes, e a garagem digital ajuda-te a gerir o carro no dia a dia — lembretes de IPO, seguro, IUC e manutenção — para que, quando quiseres vender, seja um clique.",
    ],
  },
  {
    h2: "Como funciona",
    body: [
      "Anúncios próprios: crias conta, publicas o carro em minutos e recebes ofertas diretamente de compradores. Sem comissões sobre a venda.",
      "Anúncios externos: o nosso agregador recolhe anúncios públicos de outros portais e normaliza os dados (marca, modelo, versão, preço, km) para os tornar comparáveis. Nestas páginas identificamos sempre a origem, os dados e as imagens pertencem ao site de origem e ao vendedor, e o contacto e a negociação fazem-se no anúncio original — nós apenas te ajudamos a encontrá-lo e a avaliá-lo.",
      "Inteligência de preço: para cada carro calculamos a mediana de mercado com base em anúncios semelhantes (mesma marca, modelo e ano próximo) e classificamos o preço — excelente, bom, de mercado ou acima do mercado. A dimensão da amostra é sempre indicada.",
    ],
  },
  {
    h2: "Como ganhamos dinheiro",
    body: [
      "Anunciar é e vai continuar a ser grátis. O modelo de receita assenta em serviços opcionais à volta da compra e venda — como parcerias de financiamento e seguros — nunca em cobrar aos particulares pelo anúncio nem em comissões sobre a venda. Quando existir um conteúdo patrocinado ou uma parceria comercial, estará identificado como tal.",
    ],
  },
  {
    h2: "Qualidade dos dados e moderação",
    body: [
      "Dados de anúncios agregados vêm com erros dos sites de origem — quilómetros impossíveis, preços de peças em vez de carros, anos trocados. Aplicamos regras automáticas de validação: anúncios com valores implausíveis são marcados como 'por confirmar', saem das listagens e das estatísticas de preço, e a página respetiva indica claramente o problema.",
      "Qualquer anúncio pode ser denunciado pelos utilizadores (botão 'Reportar' na página do anúncio). As denúncias entram numa fila de revisão e os anúncios problemáticos são removidos.",
    ],
  },
  {
    h2: "Quem está por trás",
    body: [
      "O Nacional 2 foi construído e é gerido pela NorthSail, uma plataforma portuguesa de desenvolvimento de websites e aplicações web. O projeto é desenvolvido em Portugal, para o mercado português.",
    ],
  },
];

export default function SobrePage() {
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: TITLE,
    url: absolute("/sobre"),
    mainEntity: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      email: CONTACT_EMAIL,
      description:
        "Marketplace português de carros usados, gratuito para particulares e stands, com agregação de anúncios, comparação de preços com o mercado e garagem digital.",
      areaServed: "PT",
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <JsonLd data={aboutLd} />
      <SiteHeader />
      <div className="mx-auto w-[min(860px,94%)] py-6">
        <nav className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          › <b className="text-ink">Sobre</b>
        </nav>

        <h1 className="font-head text-[1.9rem] font-extrabold leading-tight text-ink">
          {TITLE}
        </h1>
        <p className="mt-2 text-[1rem] text-n2muted">
          Quem somos, porque existimos, como funciona e como ganhamos dinheiro —
          sem letras pequenas.
        </p>

        {SECTIONS.map((s) => (
          <section key={s.h2} className="mt-8">
            <h2 className="font-head text-[1.35rem] font-bold text-ink">
              {s.h2}
            </h2>
            {s.body.map((p, i) => (
              <p
                key={i}
                className="mt-3 text-[0.95rem] leading-relaxed text-ink/90"
              >
                {p}
              </p>
            ))}
          </section>
        ))}

        <section className="mt-8">
          <h2 className="font-head text-[1.35rem] font-bold text-ink">
            Contacto
          </h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/90">
            Dúvidas, sugestões, parcerias ou imprensa:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-clay underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
            . Para problemas com um anúncio específico, usa o botão
            &quot;Reportar&quot; na página do próprio anúncio — é o caminho mais
            rápido.
          </p>
        </section>

        <section className="mt-10 flex flex-wrap gap-1.5">
          <Link href="/carros" className="n2-chip">
            Ver carros usados
          </Link>
          <Link href="/vender" className="n2-chip">
            Vender grátis
          </Link>
          <Link href="/guias" className="n2-chip">
            Guias de compra e venda
          </Link>
          <Link href="/seguranca" className="n2-chip">
            Comprar em segurança
          </Link>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
