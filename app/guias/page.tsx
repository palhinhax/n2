import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import JsonLd from "@/components/json-ld";
import { GUIDES } from "@/lib/guides";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const revalidate = 86400;

const TITLE = "Guias de compra e venda de carros usados";

export const metadata: Metadata = {
  title: TITLE,
  description: clamp(
    `Guias práticos do ${SITE_NAME}: checklist de compra, avaliar preços, diesel vs gasolina, elétricos usados, ISV e IUC. Escritos para o mercado português.`
  ),
  alternates: { canonical: absolute("/guias") },
  openGraph: { title: `${TITLE} | ${SITE_NAME}` },
};

export default function GuiasPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: absolute("/") },
      { "@type": "ListItem", position: 2, name: "Guias" },
    ],
  };
  const listLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    numberOfItems: GUIDES.length,
    itemListElement: GUIDES.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: g.title,
      url: absolute(`/guias/${g.slug}`),
    })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={listLd} />
      <SiteHeader />
      <div className="mx-auto w-[min(1240px,94%)] py-6">
        <nav className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          › <b className="text-ink">Guias</b>
        </nav>

        <h1 className="font-head text-[1.9rem] font-extrabold leading-tight text-ink">
          {TITLE}
        </h1>
        <p className="mt-1 max-w-3xl text-[0.95rem] text-n2muted">
          Guias práticos escritos para o mercado português — sem tradução à
          pressa nem generalidades. Para comprares, venderes e manteres o teu
          carro com decisões informadas.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((g) => (
            <Link
              key={g.slug}
              href={`/guias/${g.slug}`}
              className="n2-card block p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="font-head text-[1.1rem] font-bold leading-snug text-ink">
                {g.title}
              </h2>
              <p className="mt-2 text-[0.9rem] text-n2muted">{g.description}</p>
              <span className="mt-3 inline-block text-[0.85rem] font-semibold text-clay">
                Ler o guia →
              </span>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
