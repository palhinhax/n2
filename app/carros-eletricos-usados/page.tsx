import type { Metadata } from "next";
import SeoListing from "@/components/seo-listing";
import { commonRelatedGroups } from "@/lib/seo-links";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/carros-eletricos-usados";
const TITLE = "Carros elétricos usados em Portugal";

export const metadata: Metadata = {
  title: TITLE,
  description: clamp(
    `Carros 100% elétricos usados à venda em Portugal. Compara preços com a mediana de mercado, vê autonomia e recebe alertas de descida de preço no ${SITE_NAME}.`
  ),
  alternates: { canonical: absolute(PATH) },
  openGraph: { title: `${TITLE} | ${SITE_NAME}` },
};

export default function EletricosUsadosPage() {
  return (
    <SeoListing
      h1={TITLE}
      intro="Carros 100% elétricos usados à venda em Portugal, de particulares e stands. Um elétrico usado pode ser a forma mais barata de entrar na mobilidade elétrica: a depreciação inicial já foi paga pelo primeiro dono e os custos de utilização são baixos. O essencial é avaliar o estado da bateria — vê as nossas dicas em baixo."
      query={{ fuel: "Elétrico" }}
      path={PATH}
      breadcrumb={[
        { label: "Início", href: "/" },
        { label: "Carros usados", href: "/carros" },
        { label: "Elétricos" },
      ]}
      related={commonRelatedGroups(PATH)}
      faq={[
        {
          q: "O que verificar antes de comprar um elétrico usado?",
          a: "O estado de saúde da bateria (SoH) é o fator nº 1 — pede um relatório de diagnóstico ou verifica a autonomia real numa volta de teste. Confirma também a garantia da bateria (tipicamente 8 anos ou ~160 000 km nos principais fabricantes), o tipo de carregamento suportado e o histórico de cargas rápidas.",
        },
        {
          q: "As baterias dos elétricos duram pouco?",
          a: "A degradação típica é gradual — poucos por cento nos primeiros anos, em uso normal. A maioria dos fabricantes garante a bateria contra degradação excessiva durante 8 anos. Um elétrico com 4-5 anos e bateria saudável pode ser uma excelente compra.",
        },
        {
          q: "Quanto custa carregar um elétrico em Portugal?",
          a: "Carregar em casa, em vazio, é normalmente a opção mais barata — o custo por 100 km fica em regra bem abaixo do combustível equivalente. Nos postos públicos rápidos o preço é superior e varia por operador. O custo exato depende do tarifário e do consumo do carro.",
        },
      ]}
    />
  );
}
