import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CarGrid from "@/components/car-grid";
import JsonLd from "@/components/json-ld";
import {
  fetchListingPage,
  countListings,
  type ListingQuery,
} from "@/lib/car-listing";
import { absolute } from "@/lib/seo";
import { seoStats } from "@/lib/seo-stats";

export type RelatedGroup = {
  heading: string;
  links: { label: string; href: string }[];
};
type Crumb = { label: string; href?: string };

/**
 * Página de listagem otimizada para SEO (marca, modelo, distrito, preço…).
 * Reutiliza a lista combinada + scroll infinito, com H1, texto, links internos,
 * FAQ e JSON-LD (BreadcrumbList + ItemList + FAQPage).
 */
export default async function SeoListing({
  h1,
  intro,
  query,
  breadcrumb,
  path,
  related = [],
  faq = [],
}: {
  h1: string;
  intro: string;
  query: ListingQuery;
  breadcrumb: Crumb[];
  path: string; // ex.: /marcas/bmw
  related?: RelatedGroup[];
  faq?: { q: string; a: string }[];
}) {
  const [firstPage, total, stats] = await Promise.all([
    fetchListingPage(query as any, 0, 24),
    countListings(query),
    seoStats(query),
  ]);

  const gridQuery: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) if (v) gridQuery[k] = String(v);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumb.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: absolute(c.href) } : {}),
    })),
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: h1,
    numberOfItems: total,
    url: absolute(path),
  };
  const faqLd =
    faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={itemListLd} />
      {faqLd && <JsonLd data={faqLd} />}
      <SiteHeader />
      <div className="mx-auto w-[min(1240px,94%)] py-6">
        <nav className="mb-3 text-[0.88rem] font-medium text-n2muted">
          {breadcrumb.map((c, i) => (
            <span key={i}>
              {i > 0 && " › "}
              {c.href ? (
                <Link href={c.href} className="hover:underline">
                  {c.label}
                </Link>
              ) : (
                <b className="text-ink">{c.label}</b>
              )}
            </span>
          ))}
        </nav>

        <h1 className="font-head text-[1.9rem] font-extrabold leading-tight text-ink">
          {h1}
        </h1>
        <p className="mt-1 max-w-3xl text-[0.95rem] text-n2muted">{intro}</p>
        <p className="mt-1 text-[0.85rem] font-semibold text-clay">
          {total.toLocaleString("pt-PT")}{" "}
          {total === 1 ? "carro disponível" : "carros disponíveis"}
        </p>

        {stats && (
          <section
            aria-label="Estatísticas de mercado"
            className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <div className="n2-card p-4">
              <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-n2muted">
                Preço mediano
              </p>
              <p className="font-head text-[1.25rem] font-extrabold text-ink">
                {stats.medianPrice != null
                  ? `${stats.medianPrice.toLocaleString("pt-PT")} €`
                  : "—"}
              </p>
            </div>
            <div className="n2-card p-4">
              <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-n2muted">
                Km médio
              </p>
              <p className="font-head text-[1.25rem] font-extrabold text-ink">
                {stats.avgKm != null
                  ? `${stats.avgKm.toLocaleString("pt-PT")} km`
                  : "—"}
              </p>
            </div>
            <div className="n2-card p-4">
              <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-n2muted">
                Anos mais comuns
              </p>
              <p className="font-head text-[1.25rem] font-extrabold text-ink">
                {stats.commonYears.length ? stats.commonYears.join(" · ") : "—"}
              </p>
            </div>
            <div className="n2-card p-4">
              <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-n2muted">
                Amostra
              </p>
              <p className="font-head text-[1.25rem] font-extrabold text-ink">
                {stats.sample.toLocaleString("pt-PT")} anúncios
              </p>
            </div>
          </section>
        )}

        <div className="mt-5">
          {firstPage.items.length === 0 ? (
            <div className="n2-card p-10 text-center">
              <h2 className="font-head text-[1.2rem] font-bold text-ink">
                Ainda sem anúncios nesta pesquisa
              </h2>
              <p className="mt-1 text-n2muted">
                Volta em breve ou{" "}
                <Link
                  href="/carros"
                  className="font-semibold text-clay underline"
                >
                  vê todos os carros
                </Link>
                .
              </p>
            </div>
          ) : (
            <CarGrid
              key={JSON.stringify(gridQuery)}
              initialItems={firstPage.items}
              initialNextOffset={firstPage.nextOffset}
              query={gridQuery}
            />
          )}
        </div>

        {related.length > 0 && (
          <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((g) => (
              <div key={g.heading}>
                <h2 className="mb-2 font-head text-[1rem] font-bold text-ink">
                  {g.heading}
                </h2>
                <ul className="flex flex-wrap gap-1.5">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="n2-chip">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {faq.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 font-head text-[1.5rem] font-extrabold text-ink">
              Perguntas frequentes
            </h2>
            <div className="flex flex-col gap-3">
              {faq.map((f) => (
                <div key={f.q} className="n2-card p-5">
                  <h3 className="mb-1 font-head text-[1.02rem] font-bold text-ink">
                    {f.q}
                  </h3>
                  <p className="text-[0.92rem] text-n2muted">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
