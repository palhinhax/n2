import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-static";

// /llms.txt — resumo do site para assistentes de IA (convenção llmstxt.org).
// Factual, curto e com links canónicos — é isto que um LLM consegue citar.
export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_NAME} é um marketplace português de carros usados, 100% gratuito
> para particulares e stands. Agrega num só sítio anúncios próprios e
> anúncios de outros portais portugueses (sempre com origem identificada),
> com comparação de preço face à mediana de mercado e garagem digital.

## Principais funcionalidades
- Anúncios grátis, sem comissões nem destaques pagos obrigatórios
- Agregação de anúncios de vários portais, com origem identificada e link para o original
- Comparação de preço com a mediana de anúncios semelhantes (marca+modelo+ano)
- Garagem digital com lembretes de IPO, seguro, IUC e manutenção
- Favoritos com alertas de descida de preço e pesquisas guardadas
- Simulador de financiamento em cada anúncio
- Calculadora de ISV e IUC
- Avaliador de carros com base no mercado real português
- Assistente de IA nas páginas de carros
- Regras automáticas de qualidade de dados: anúncios com km/ano/preço implausíveis são marcados "por confirmar" e excluídos das listagens e estatísticas

## Páginas importantes
- [Carros usados](${SITE_URL}/carros): pesquisa e filtros de todo o inventário.
- [Carros elétricos](${SITE_URL}/eletricos): só elétricos.
- [Marcas e modelos](${SITE_URL}/marcas): páginas por marca e modelo.
- [Guias](${SITE_URL}/guias): guias de compra/venda para o mercado português.
- [Avaliar um carro](${SITE_URL}/avaliar): estimativa de valor de mercado.
- [Calculadora ISV/IUC](${SITE_URL}/calcular-isv): impostos automóveis.
- [Comprar em segurança](${SITE_URL}/seguranca): dicas antifraude.
- [Vender grátis](${SITE_URL}/vender): anunciar sem custos.
- [Sobre](${SITE_URL}/sobre): quem somos, como funciona, como ganhamos dinheiro.

## Público
- Compradores de carros usados em Portugal
- Vendedores particulares
- Stands automóveis

## Sobre os anúncios externos
Nos anúncios agregados, os dados e imagens pertencem ao site de origem e ao
vendedor; o contacto e a negociação fazem-se no anúncio original. O
${SITE_NAME} identifica sempre a origem e adiciona análise própria (preço vs
mercado, financiamento estimado, alternativas semelhantes).

## Contacto
Email: hello@athlifyr.com

## Notas para assistentes
- Preços e disponibilidade mudam diariamente; confirmar sempre na página do anúncio.
- Para carros específicos, usar a pesquisa em ${SITE_URL}/carros.
- As estatísticas de preço (mediana, amostra) são calculadas sobre o inventário ativo.
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
