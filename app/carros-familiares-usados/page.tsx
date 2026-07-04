import type { Metadata } from "next";
import SeoListing from "@/components/seo-listing";
import { commonRelatedGroups } from "@/lib/seo-links";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/carros-familiares-usados";
const TITLE = "Carros familiares usados em Portugal";

export const metadata: Metadata = {
  title: TITLE,
  description: clamp(
    `Carrinhas e carros familiares usados à venda em Portugal — espaço, mala grande e 5 lugares a sério. Compara preços com o mercado no ${SITE_NAME}.`
  ),
  alternates: { canonical: absolute(PATH) },
  openGraph: { title: `${TITLE} | ${SITE_NAME}` },
};

export default function FamiliaresPage() {
  return (
    <SeoListing
      h1={TITLE}
      intro="Carrinhas (station wagon) usadas à venda em Portugal — a escolha clássica das famílias: mala grande, espaço atrás para cadeiras de criança e consumos contidos face a um SUV equivalente. Compara cada preço com a mediana de mercado e filtra por marca, ano e quilómetros."
      query={{ carroceria: "Carrinha" }}
      path={PATH}
      breadcrumb={[
        { label: "Início", href: "/" },
        { label: "Carros usados", href: "/carros" },
        { label: "Familiares" },
      ]}
      related={commonRelatedGroups(PATH)}
      faq={[
        {
          q: "Carrinha, SUV ou monovolume — o que é melhor para uma família?",
          a: "A carrinha costuma oferecer a melhor relação espaço/consumo/preço; o SUV dá posição de condução alta e facilidade de entrada; o monovolume maximiza a modularidade dos bancos. Para 2 adultos + 2 crianças com bagagem, uma carrinha compacta ou média serve quase sempre.",
        },
        {
          q: "O que verificar num carro familiar usado?",
          a: "Fixações Isofix em bom estado, espaço real para as tuas cadeiras de criança (leva-as ao test drive), mala com o volume de que precisas, e o desgaste típico de uso familiar — interior, estofos e portas. O resto é a checklist normal de qualquer usado.",
        },
      ]}
    />
  );
}
