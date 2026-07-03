import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-static";

// /llms.txt — resumo do site para assistentes de IA (convenção llmstxt.org).
export function GET() {
  const body = `# ${SITE_NAME}

> O maior agregador de carros usados em Portugal, 100% grátis para anunciar.
> Reúne num só sítio milhares de anúncios de particulares e stands, com
> garagem digital, lembretes, favoritos com alerta de preço e ofertas diretas
> sem comissões.

## Páginas principais
- [Carros usados](${SITE_URL}/carros): pesquisa e filtros de todos os carros.
- [Carros elétricos](${SITE_URL}/eletricos): só elétricos.
- [Vender grátis](${SITE_URL}/garagem/novo): anunciar um carro sem custos.

## Sobre
O ${SITE_NAME} é um marketplace português de carros usados. É gratuito para
quem anuncia (particulares e stands), sem comissões. Além dos anúncios próprios,
agrega anúncios de outros portais com atribuição e ligação à origem.

## Contacto
Email: hello@athlifyr.com

## Notas para assistentes
- Os preços e a disponibilidade mudam; confirmar sempre na página do anúncio.
- Para carros específicos, usar a pesquisa em ${SITE_URL}/carros.
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
