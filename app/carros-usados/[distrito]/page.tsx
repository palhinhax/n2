import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SeoListing, { type RelatedGroup } from "@/components/seo-listing";
import { DISTRICTS } from "@/lib/constants";
import { slugify, matchSlug } from "@/lib/slug";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";
import { CATEGORY_PAGES, PRICE_BANDS } from "@/lib/seo-links";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { distrito: string };
}): Promise<Metadata> {
  const distrito = matchSlug(params.distrito, DISTRICTS, (d) => d);
  if (!distrito) return { title: "Distrito", robots: { index: false } };
  const title = `Carros usados em ${distrito}`;
  return {
    title,
    description: clamp(
      `Carros usados à venda em ${distrito}, de particulares e stands. Compara preços, km e ano no ${SITE_NAME}. Anunciar o teu carro é grátis.`
    ),
    alternates: { canonical: absolute(`/carros-usados/${params.distrito}`) },
    openGraph: { title: `${title} | ${SITE_NAME}` },
  };
}

export default async function DistritoPage({
  params,
}: {
  params: { distrito: string };
}) {
  const distrito = matchSlug(params.distrito, DISTRICTS, (d) => d);
  if (!distrito) notFound();

  const related: RelatedGroup[] = [
    {
      heading: "Por tipo de carro",
      links: CATEGORY_PAGES.map((c) => ({ label: c.label, href: c.href })),
    },
    {
      heading: "Por orçamento",
      links: PRICE_BANDS.map((b) => ({
        label: `até ${b.toLocaleString("pt-PT")} €`,
        href: `/carros-ate/${b}`,
      })),
    },
    {
      heading: "Outros distritos",
      links: DISTRICTS.filter((d) => d !== distrito).map((d) => ({
        label: d,
        href: `/carros-usados/${slugify(d)}`,
      })),
    },
  ];

  return (
    <SeoListing
      h1={`Carros usados em ${distrito}`}
      intro={`Carros usados à venda em ${distrito}, de particulares e stands. Compara preços com a mediana de mercado, filtra por marca, ano e quilómetros — e anuncia o teu carro de graça.`}
      query={{ distrito }}
      path={`/carros-usados/${params.distrito}`}
      breadcrumb={[
        { label: "Início", href: "/" },
        { label: "Carros usados", href: "/carros" },
        { label: distrito },
      ]}
      related={related}
      faq={[
        {
          q: `Como vendo o meu carro em ${distrito}?`,
          a: `Cria conta no ${SITE_NAME} e publica o anúncio em minutos — é grátis, sem comissões. O teu carro fica visível para compradores em ${distrito} e em todo o país.`,
        },
      ]}
    />
  );
}
