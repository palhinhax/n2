import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SeoListing, { type RelatedGroup } from "@/components/seo-listing";
import { fetchBrandOptions } from "@/lib/car-listing";
import { slugify, matchSlug } from "@/lib/slug";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

async function resolve(marcaSlug: string, modeloSlug: string) {
  const brands = await fetchBrandOptions();
  const brand = matchSlug(marcaSlug, brands, (b) => b.name);
  if (!brand) return { brand: null, model: null };
  const model = matchSlug(modeloSlug, brand.models, (m) => m);
  return { brand, model };
}

export async function generateMetadata({
  params,
}: {
  params: { marca: string; modelo: string };
}): Promise<Metadata> {
  const { brand, model } = await resolve(params.marca, params.modelo);
  if (!brand || !model) return { title: "Modelo", robots: { index: false } };
  const title = `${brand.name} ${model} usados à venda em Portugal`;
  return {
    title,
    description: clamp(
      `${brand.name} ${model} usados à venda em Portugal. Compara preços, km e ano de particulares e stands no ${SITE_NAME}. Vê se o preço está abaixo da média. Anunciar é grátis.`
    ),
    alternates: {
      canonical: absolute(`/marcas/${params.marca}/${params.modelo}`),
    },
    openGraph: { title: `${title} | ${SITE_NAME}` },
  };
}

export default async function ModeloPage({
  params,
}: {
  params: { marca: string; modelo: string };
}) {
  const { brand, model } = await resolve(params.marca, params.modelo);
  if (!brand || !model) notFound();

  const related: RelatedGroup[] = [
    {
      heading: `Outros modelos ${brand.name}`,
      links: brand.models
        .filter((m) => m !== model)
        .slice(0, 18)
        .map((m) => ({
          label: m,
          href: `/marcas/${params.marca}/${slugify(m)}`,
        })),
    },
  ];

  return (
    <SeoListing
      h1={`${brand.name} ${model} usados à venda`}
      intro={`Todos os ${brand.name} ${model} usados à venda em Portugal. Compara o preço de cada anúncio com a mediana de mercado, filtra por ano e quilómetros, e recebe alertas quando surgirem novos ${model}.`}
      query={{ marca: brand.name, modelo: model }}
      path={`/marcas/${params.marca}/${params.modelo}`}
      breadcrumb={[
        { label: "Início", href: "/" },
        { label: "Marcas", href: "/marcas" },
        { label: brand.name, href: `/marcas/${params.marca}` },
        { label: model },
      ]}
      related={related}
      faq={[
        {
          q: `Qual o preço médio de um ${brand.name} ${model} usado?`,
          a: `Depende do ano e dos quilómetros. Cada anúncio no ${SITE_NAME} indica se o preço está abaixo, dentro ou acima da mediana de mercado para ${brand.name} ${model} semelhantes.`,
        },
        {
          q: `Como recebo avisos de novos ${brand.name} ${model}?`,
          a: `Guarda esta pesquisa na tua conta e avisamos-te quando surgirem novos anúncios que correspondam.`,
        },
      ]}
    />
  );
}
