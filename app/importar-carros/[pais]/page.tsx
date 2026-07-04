import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ImportFilters from "@/components/import-filters";
import ImportGrid from "@/components/import-grid";
import {
  fetchImportBrandOptions,
  fetchImportPage,
  IMPORT_QUERY_KEYS,
} from "@/lib/import-listing";
import { countryBySlug, IMPORT_COUNTRIES } from "@/lib/import-countries";
import { IMPORT_STEPS } from "@/lib/import-content";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { pais: string };
}): Promise<Metadata> {
  const country = countryBySlug(params.pais);
  if (!country) return { title: "Importar carros", robots: { index: false } };
  const title = `Importar carros da ${country.name} para Portugal`;
  const description = clamp(
    `Carros usados à venda na ${country.name} com o custo de importação para Portugal já estimado: ISV, transporte (~${country.distanceKm} km), inspeção e legalização. Compara com o mercado português antes de decidir.`
  );
  return {
    title,
    description,
    alternates: { canonical: absolute(`/importar-carros/${country.slug}`) },
    openGraph: { title: `${title} | ${SITE_NAME}`, description },
  };
}

export default async function ImportarPais({
  params,
  searchParams,
}: {
  params: { pais: string };
  searchParams: Record<string, string>;
}) {
  const country = countryBySlug(params.pais);
  if (!country) notFound();

  const query: Record<string, string> = { pais: country.code };
  for (const k of IMPORT_QUERY_KEYS) {
    if (k === "pais") continue;
    const v = searchParams[k];
    if (v) query[k] = v;
  }

  const [brands, firstPage] = await Promise.all([
    fetchImportBrandOptions(country.code),
    fetchImportPage(query, 0, 24),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1240px,94%)] py-6">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          ›{" "}
          <Link href="/importar-carros" className="hover:underline">
            Importar carros
          </Link>{" "}
          › <b className="text-ink">{country.name}</b>
        </div>

        <div className="n2-card mb-5 bg-gradient-to-r from-white to-[#F4E9D2] p-5">
          <h1 className="font-head text-[1.7rem] font-extrabold text-ink">
            {country.flag} Importar carros da {country.name}
          </h1>
          <p className="max-w-3xl text-[0.95rem] text-n2muted">
            {country.marketNote} Distância típica até Portugal: ~
            {country.distanceKm.toLocaleString("pt-PT")} km. Cada anúncio mostra
            o custo total estimado já legalizado em Portugal.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {IMPORT_COUNTRIES.map((c) => (
              <Link
                key={c.code}
                href={`/importar-carros/${c.slug}`}
                className={`n2-chip ${c.code === country.code ? "!border-clay !bg-clay !text-white" : ""}`}
              >
                {c.flag} {c.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[272px_1fr]">
          <ImportFilters
            brands={brands}
            basePath={`/importar-carros/${country.slug}`}
            fixed={{ pais: country.code }}
          />
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-head text-[1.3rem] font-extrabold text-ink">
                Carros na {country.name}
                <span className="ml-2 text-[0.9rem] font-semibold text-n2muted">
                  {firstPage.total.toLocaleString("pt-PT")} resultados
                </span>
              </span>
            </div>
            <ImportGrid
              key={JSON.stringify(query)}
              initialItems={firstPage.items}
              initialNextOffset={firstPage.nextOffset}
              query={query}
            />
          </div>
        </div>

        <section className="mt-10">
          <h2 className="mb-3 font-head text-[1.3rem] font-extrabold text-ink">
            Como importar um carro da {country.name} — passo a passo
          </h2>
          <ol className="grid gap-3 md:grid-cols-2">
            {IMPORT_STEPS.map((s, i) => (
              <li key={s.title} className="n2-card p-4">
                <div className="font-head text-[0.98rem] font-extrabold text-ink">
                  {i + 1}. {s.title}
                </div>
                <p className="text-[0.86rem] leading-relaxed text-n2muted">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[0.85rem] text-n2muted">
            Estimativas — confirma sempre os valores no simulador oficial das
            Finanças. Vê o guia completo:{" "}
            <Link
              href="/quanto-custa-importar-carro"
              className="font-semibold text-clay hover:underline"
            >
              quanto custa importar um carro para Portugal
            </Link>
            .
          </p>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
