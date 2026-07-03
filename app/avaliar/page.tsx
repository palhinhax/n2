import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import AvaliarForm from "@/components/avaliar-form";
import { fetchBrandOptions } from "@/lib/car-listing";
import { absolute, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quanto vale o meu carro? Avaliação grátis",
  description: `Sabe quanto vale o teu carro em segundos. Estimativa grátis com base em milhares de anúncios de carros usados em Portugal no ${SITE_NAME}.`,
  alternates: { canonical: absolute("/avaliar") },
  openGraph: {
    title: `Quanto vale o meu carro? | ${SITE_NAME}`,
    description:
      "Avaliação grátis do teu carro com base em milhares de anúncios reais.",
  },
};

export default async function Avaliar() {
  const brands = await fetchBrandOptions();
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1000px,94%)] py-8">
        <span className="font-head text-[0.82rem] font-bold uppercase tracking-[0.14em] text-olive">
          Avaliação grátis
        </span>
        <h1 className="mb-1 font-head text-[2rem] font-extrabold text-ink">
          Quanto vale o meu carro?
        </h1>
        <p className="mb-6 text-n2muted">
          Estimativa em segundos, com base nos preços reais de milhares de
          carros usados à venda em Portugal.
        </p>
        <AvaliarForm brands={brands} />
      </div>
      <SiteFooter />
    </div>
  );
}
