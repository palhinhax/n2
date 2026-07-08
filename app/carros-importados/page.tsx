import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ImportCarCard from "@/components/import-car-card";
import { prisma } from "@/lib/prisma";
import { IMPORT_COUNTRIES } from "@/lib/import-countries";
import { absolute, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carros importados — os melhores negócios da Europa",
  description:
    "Os carros da Europa que mais compensam importar para Portugal neste momento: poupança estimada face ao mercado português com ISV, transporte e legalização incluídos.",
  alternates: { canonical: absolute("/carros-importados") },
  openGraph: {
    title: `Carros importados: melhores negócios | ${SITE_NAME}`,
    description:
      "Ranking dos carros da Europa com maior poupança estimada face ao mercado português.",
  },
};

export default async function CarrosImportados() {
  // os melhores negócios: maior poupança estimada face ao mercado PT
  const deals = await prisma.foreignListing.findMany({
    where: {
      active: true,
      status: "APPROVED",
      isDuplicate: false,
      suspicious: false,
      savingsEur: { gt: 0 },
      dealRating: { in: ["EXCELLENT", "GOOD"] },
    },
    orderBy: { savingsEur: "desc" },
    take: 24,
  });

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1240px,94%)] py-6">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          › <b className="text-ink">Carros importados</b>
        </div>

        <h1 className="font-head text-[1.8rem] font-extrabold text-ink">
          Os melhores negócios de importação agora
        </h1>
        <p className="mb-5 max-w-3xl text-[0.95rem] text-n2muted">
          Carros à venda na Europa com a maior <b>poupança estimada</b> face ao
          preço do mesmo carro em Portugal — já com ISV, transporte, inspeção e
          legalização somados. Valores são estimativas; confirma antes de
          comprar.
        </p>

        {deals.length === 0 ? (
          <div className="n2-card p-12 text-center">
            <h2 className="font-head text-[1.3rem] font-bold text-ink">
              Ainda estamos a analisar o mercado europeu
            </h2>
            <p className="text-n2muted">
              Volta em breve, ou explora todos os{" "}
              <Link
                href="/importar-carros"
                className="font-semibold text-clay hover:underline"
              >
                anúncios estrangeiros
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {deals.map((l) => (
              <ImportCarCard key={l.id} listing={l} />
            ))}
          </div>
        )}

        <section className="mt-8">
          <h2 className="mb-3 font-head text-[1.2rem] font-extrabold text-ink">
            Procurar por país
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {IMPORT_COUNTRIES.map((c) => (
              <Link
                key={c.code}
                href={`/importar-carros/${c.slug}`}
                className="n2-chip"
              >
                {c.flag} {c.name}
              </Link>
            ))}
          </div>
          <p className="mt-4 text-[0.85rem] text-n2muted">
            Como calculamos? Vê o guia{" "}
            <Link
              href="/quanto-custa-importar-carro"
              className="font-semibold text-clay hover:underline"
            >
              quanto custa importar um carro
            </Link>{" "}
            e o{" "}
            <Link
              href="/simulador-isv"
              className="font-semibold text-clay hover:underline"
            >
              simulador de ISV
            </Link>
            .
          </p>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
