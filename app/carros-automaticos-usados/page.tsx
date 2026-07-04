import type { Metadata } from "next";
import SeoListing from "@/components/seo-listing";
import { commonRelatedGroups } from "@/lib/seo-links";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/carros-automaticos-usados";
const TITLE = "Carros automáticos usados em Portugal";

export const metadata: Metadata = {
  title: TITLE,
  description: clamp(
    `Carros usados com caixa automática à venda em Portugal. Compara preços com a mediana de mercado, filtra por marca, ano e km no ${SITE_NAME}. Anunciar é grátis.`
  ),
  alternates: { canonical: absolute(PATH) },
  openGraph: { title: `${TITLE} | ${SITE_NAME}` },
};

export default function AutomaticosPage() {
  return (
    <SeoListing
      h1={TITLE}
      intro="Todos os carros usados com caixa automática à venda em Portugal, de particulares e stands. A procura por automáticos não pára de crescer — no trânsito urbano são mais confortáveis e, nos híbridos e elétricos, a caixa automática é padrão. Compara cada preço com a mediana de mercado e recebe alertas quando baixam."
      query={{ caixa: "Automática" }}
      path={PATH}
      breadcrumb={[
        { label: "Início", href: "/" },
        { label: "Carros usados", href: "/carros" },
        { label: "Automáticos" },
      ]}
      related={commonRelatedGroups(PATH)}
      faq={[
        {
          q: "Um carro automático usado gasta mais do que um manual?",
          a: "Nas caixas automáticas modernas (DSG, EDC, CVT, conversores de binário atuais) a diferença de consumo é mínima e por vezes favorável ao automático. Em carros mais antigos, as caixas automáticas clássicas podiam consumir mais.",
        },
        {
          q: "O que devo verificar numa caixa automática usada?",
          a: "Passagens de caixa suaves e sem solavancos, ausência de ruídos em D e R, e histórico de manutenção — em muitas caixas o óleo deve ser substituído a intervalos regulares (frequentemente entre 60 000 e 120 000 km, conforme o fabricante). Pede sempre o registo de revisões ao vendedor.",
        },
        {
          q: "Automático, híbrido ou elétrico — qual escolher?",
          a: `Se conduzes sobretudo em cidade, híbridos e elétricos (sempre automáticos) tendem a compensar. Para muitos km de autoestrada, um diesel automático ainda pode ser competitivo. Usa a comparação de preço do ${SITE_NAME} para avaliar cada caso.`,
        },
      ]}
    />
  );
}
