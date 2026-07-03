import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SeoListing, { type RelatedGroup } from "@/components/seo-listing";
import { fetchBrandOptions } from "@/lib/car-listing";
import { slugify, matchSlug } from "@/lib/slug";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

async function resolveBrand(slug: string) {
  const brands = await fetchBrandOptions();
  const brand = matchSlug(slug, brands, (b) => b.name);
  return { brand, brands };
}

export async function generateMetadata({
  params,
}: {
  params: { marca: string };
}): Promise<Metadata> {
  const { brand } = await resolveBrand(params.marca);
  if (!brand) return { title: "Marca", robots: { index: false } };
  const title = `${brand.name} usados à venda em Portugal`;
  return {
    title,
    description: clamp(
      `Todos os ${brand.name} usados à venda em Portugal — de particulares e stands. Compara preços, quilómetros e ano no ${SITE_NAME}. Anunciar é grátis.`
    ),
    alternates: { canonical: absolute(`/marcas/${params.marca}`) },
    openGraph: { title: `${title} | ${SITE_NAME}` },
  };
}

const PRICE_BANDS = [5000, 10000, 15000, 20000, 30000];

export default async function MarcaPage({
  params,
}: {
  params: { marca: string };
}) {
  const { brand } = await resolveBrand(params.marca);
  if (!brand) notFound();

  const related: RelatedGroup[] = [];
  if (brand.models.length) {
    related.push({
      heading: `Modelos ${brand.name}`,
      links: brand.models.slice(0, 24).map((m) => ({
        label: m,
        href: `/marcas/${params.marca}/${slugify(m)}`,
      })),
    });
  }
  related.push({
    heading: `${brand.name} por preço`,
    links: PRICE_BANDS.map((p) => ({
      label: `até ${p.toLocaleString("pt-PT")} €`,
      href: `/carros-ate/${p}?marca=${encodeURIComponent(brand.name)}`,
    })),
  });

  return (
    <SeoListing
      h1={`${brand.name} usados à venda`}
      intro={`Explora todos os ${brand.name} usados à venda em Portugal, de particulares e stands. Compara preços com a mediana de mercado, filtra por modelo, ano e quilómetros — e anuncia o teu ${brand.name} de graça.`}
      query={{ marca: brand.name }}
      path={`/marcas/${params.marca}`}
      breadcrumb={[
        { label: "Início", href: "/" },
        { label: "Marcas", href: "/marcas" },
        { label: brand.name },
      ]}
      related={related}
      faq={[
        {
          q: `Quanto custa um ${brand.name} usado?`,
          a: `Os preços variam com o modelo, ano e quilómetros. No ${SITE_NAME} mostramos, em cada anúncio, se o preço está abaixo, dentro ou acima da mediana de mercado para modelos semelhantes.`,
        },
        {
          q: `Anunciar um ${brand.name} no ${SITE_NAME} é grátis?`,
          a: `Sim. Publicar o teu carro é 100% grátis, sem comissões, para sempre.`,
        },
      ]}
    />
  );
}
