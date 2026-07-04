import type { Metadata } from "next";
import SeoListing from "@/components/seo-listing";
import { commonRelatedGroups } from "@/lib/seo-links";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/primeiro-carro";
const TITLE = "Primeiro carro: usados até 8 000 € em Portugal";
const BUDGET = 8000;

export const metadata: Metadata = {
  title: TITLE,
  description: clamp(
    `À procura do primeiro carro? Usados até ${BUDGET.toLocaleString("pt-PT")} € em Portugal, com comparação de preço vs mercado e dicas para não errar na primeira compra. ${SITE_NAME}.`
  ),
  alternates: { canonical: absolute(PATH) },
  openGraph: { title: `${TITLE} | ${SITE_NAME}` },
};

export default function PrimeiroCarroPage() {
  return (
    <SeoListing
      h1="O teu primeiro carro"
      intro={`Carros usados até ${BUDGET.toLocaleString("pt-PT")} € — o intervalo onde a maioria encontra um bom primeiro carro. Para quem está a começar, o mais importante é a fiabilidade e o custo total (seguro, IUC, manutenção), não os extras. Citadinos e utilitários com histórico de revisões limpo são a aposta mais segura. Cada anúncio mostra se o preço está abaixo, dentro ou acima da mediana de mercado.`}
      query={{ precoMax: String(BUDGET) }}
      path={PATH}
      breadcrumb={[
        { label: "Início", href: "/" },
        { label: "Carros usados", href: "/carros" },
        { label: "Primeiro carro" },
      ]}
      related={commonRelatedGroups(PATH)}
      faq={[
        {
          q: "Qual é o melhor primeiro carro usado?",
          a: "Não há um único 'melhor', mas os citadinos e utilitários com manutenção em dia e peças baratas são candidatos fortes — o seguro para condutores recentes também tende a ser mais barato em carros de menor potência. Prefere um exemplar bem cuidado de um modelo comum a um modelo raro difícil de manter.",
        },
        {
          q: "Quanto devo gastar no primeiro carro?",
          a: "Além do preço de compra, conta com seguro (mais caro para carta recente), IUC anual, IPO, manutenção e eventuais reparações iniciais. Uma boa regra é reservar 10–15% do preço do carro para pôr tudo em dia depois da compra.",
        },
        {
          q: "Vale mais um carro antigo barato ou um recente com crédito?",
          a: "Depende do orçamento mensal. Um usado barato bem escolhido evita juros e perde pouco valor; um recente financiado dá mais segurança e garantia, mas tem custo total superior. Simula o financiamento em cada anúncio para comparar.",
        },
        {
          q: "Como evito comprar um mau carro na primeira compra?",
          a: `Vê o histórico de manutenção, confirma os km (pede faturas/IPO), faz um test drive a frio e, na dúvida, leva alguém experiente ou paga uma inspeção pré-compra. Lê o nosso guia de compra em segurança no ${SITE_NAME}.`,
        },
      ]}
    />
  );
}
