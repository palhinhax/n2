import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import JsonLd from "@/components/json-ld";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const revalidate = 86400;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const guide = guideBySlug(params.slug);
  if (!guide) return { title: "Guia", robots: { index: false } };
  return {
    title: guide.title,
    description: clamp(guide.description),
    alternates: { canonical: absolute(`/guias/${guide.slug}`) },
    openGraph: {
      type: "article",
      title: `${guide.title} | ${SITE_NAME}`,
      description: clamp(guide.description),
    },
  };
}

export default function GuiaPage({ params }: { params: { slug: string } }) {
  const guide = guideBySlug(params.slug);
  if (!guide) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    dateModified: guide.updated,
    inLanguage: "pt-PT",
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME, url: absolute("/") },
    mainEntityOfPage: absolute(`/guias/${guide.slug}`),
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: absolute("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guias",
        item: absolute("/guias"),
      },
      { "@type": "ListItem", position: 3, name: guide.title },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <JsonLd data={articleLd} />
      <JsonLd data={faqLd} />
      <JsonLd data={breadcrumbLd} />
      <SiteHeader />
      <div className="mx-auto w-[min(860px,94%)] py-6">
        <nav className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          ›{" "}
          <Link href="/guias" className="hover:underline">
            Guias
          </Link>{" "}
          › <b className="text-ink">{guide.title}</b>
        </nav>

        <article>
          <h1 className="font-head text-[1.9rem] font-extrabold leading-tight text-ink">
            {guide.title}
          </h1>
          <p className="mt-2 text-[1rem] text-n2muted">{guide.description}</p>
          <p className="mt-1 text-[0.8rem] text-n2muted2">
            Atualizado em{" "}
            {new Date(guide.updated).toLocaleDateString("pt-PT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {SITE_NAME}
          </p>

          {guide.sections.map((s) => (
            <section key={s.h2} className="mt-8">
              <h2 className="font-head text-[1.35rem] font-bold text-ink">
                {s.h2}
              </h2>
              {s.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="mt-3 text-[0.95rem] leading-relaxed text-ink/90"
                >
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[0.95rem] text-ink/90">
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="mt-10">
            <h2 className="mb-4 font-head text-[1.35rem] font-bold text-ink">
              Perguntas frequentes
            </h2>
            <div className="flex flex-col gap-3">
              {guide.faq.map((f) => (
                <div key={f.q} className="n2-card p-5">
                  <h3 className="mb-1 font-head text-[1rem] font-bold text-ink">
                    {f.q}
                  </h3>
                  <p className="text-[0.92rem] text-n2muted">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="mb-2 font-head text-[1rem] font-bold text-ink">
              Continua a ler
            </h2>
            <ul className="flex flex-wrap gap-1.5">
              {guide.related.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="n2-chip">
                    {l.label}
                  </Link>
                </li>
              ))}
              {GUIDES.filter((g) => g.slug !== guide.slug)
                .slice(0, 3)
                .map((g) => (
                  <li key={g.slug}>
                    <Link href={`/guias/${g.slug}`} className="n2-chip">
                      {g.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        </article>
      </div>
      <SiteFooter />
    </div>
  );
}
