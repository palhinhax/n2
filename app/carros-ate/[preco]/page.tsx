import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SeoListing, { type RelatedGroup } from "@/components/seo-listing";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

const BANDS = [5000, 7500, 10000, 15000, 20000, 30000, 50000];

function parsePreco(slug: string): number | null {
  const n = parseInt(slug.replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n >= 1000 && n <= 500000 ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: { preco: string };
}): Promise<Metadata> {
  const preco = parsePreco(params.preco);
  if (!preco) return { title: "Preço", robots: { index: false } };
  const title = `Carros usados até ${preco.toLocaleString("pt-PT")} €`;
  return {
    title,
    description: clamp(
      `Carros usados à venda até ${preco.toLocaleString("pt-PT")} € em Portugal. Compara preços, km e ano de particulares e stands no ${SITE_NAME}. Anunciar é grátis.`
    ),
    alternates: { canonical: absolute(`/carros-ate/${preco}`) },
    openGraph: { title: `${title} | ${SITE_NAME}` },
  };
}

export default async function PrecoPage({
  params,
  searchParams,
}: {
  params: { preco: string };
  searchParams: Record<string, string>;
}) {
  const preco = parsePreco(params.preco);
  if (!preco) notFound();

  const marca = searchParams.marca?.trim();
  const query: Record<string, string> = { precoMax: String(preco) };
  if (marca) query.marca = marca;

  const related: RelatedGroup[] = [
    {
      heading: "Outros orçamentos",
      links: BANDS.filter((b) => b !== preco).map((b) => ({
        label: `até ${b.toLocaleString("pt-PT")} €`,
        href: `/carros-ate/${b}`,
      })),
    },
  ];

  const alvo = marca ? `${marca} ` : "";

  return (
    <SeoListing
      h1={`${alvo}Carros usados até ${preco.toLocaleString("pt-PT")} €`}
      intro={`${alvo}carros usados à venda até ${preco.toLocaleString("pt-PT")} € em Portugal. Encontra o melhor negócio dentro do teu orçamento — comparamos cada preço com a mediana de mercado.`}
      query={query}
      path={`/carros-ate/${preco}`}
      breadcrumb={[
        { label: "Início", href: "/" },
        { label: "Carros usados", href: "/carros" },
        { label: `até ${preco.toLocaleString("pt-PT")} €` },
      ]}
      related={related}
      faq={[
        {
          q: `Vale a pena comprar um carro usado até ${preco.toLocaleString("pt-PT")} €?`,
          a: `Sim, se o preço estiver alinhado com o mercado. No ${SITE_NAME}, cada anúncio mostra se está abaixo, dentro ou acima da mediana para modelos semelhantes — para não pagares a mais.`,
        },
      ]}
    />
  );
}
