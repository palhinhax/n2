import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { fetchBrandOptions } from "@/lib/car-listing";
import { DISTRICTS } from "@/lib/constants";
import { slugify } from "@/lib/slug";
import { absolute, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Carros usados por marca, distrito e preço",
  description: `Explora carros usados à venda em Portugal por marca, modelo, distrito e orçamento. De particulares e stands, no ${SITE_NAME}. Anunciar é grátis.`,
  alternates: { canonical: absolute("/marcas") },
};

const BANDS = [5000, 7500, 10000, 15000, 20000, 30000, 50000];

export default async function MarcasHub() {
  const brands = await fetchBrandOptions();

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1240px,94%)] py-7">
        <nav className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          › <b className="text-ink">Marcas</b>
        </nav>
        <h1 className="font-head text-[2rem] font-extrabold text-ink">
          Carros usados por marca
        </h1>
        <p className="mt-1 max-w-2xl text-n2muted">
          Escolhe a marca para veres todos os anúncios à venda em Portugal, de
          particulares e stands.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {brands.map((b) => (
            <Link
              key={b.name}
              href={`/marcas/${slugify(b.name)}`}
              className="n2-chip"
            >
              {b.name}
            </Link>
          ))}
        </div>

        <h2 className="mt-10 font-head text-[1.4rem] font-extrabold text-ink">
          Por distrito
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {DISTRICTS.map((d) => (
            <Link
              key={d}
              href={`/carros-usados/${slugify(d)}`}
              className="n2-chip"
            >
              {d}
            </Link>
          ))}
        </div>

        <h2 className="mt-10 font-head text-[1.4rem] font-extrabold text-ink">
          Por orçamento
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {BANDS.map((b) => (
            <Link key={b} href={`/carros-ate/${b}`} className="n2-chip">
              até {b.toLocaleString("pt-PT")} €
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
