import type { Metadata } from "next";
import SeoListing from "@/components/seo-listing";
import { commonRelatedGroups } from "@/lib/seo-links";
import { absolute, clamp, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/carros-diesel-usados";
const TITLE = "Carros diesel usados em Portugal";

export const metadata: Metadata = {
  title: TITLE,
  description: clamp(
    `Carros usados a gasóleo à venda em Portugal. Compara preços com a mediana de mercado, filtra por marca, ano e km no ${SITE_NAME}. Anunciar é grátis.`
  ),
  alternates: { canonical: absolute(PATH) },
  openGraph: { title: `${TITLE} | ${SITE_NAME}` },
};

export default function DieselPage() {
  return (
    <SeoListing
      h1={TITLE}
      intro="Carros usados a gasóleo à venda em Portugal, de particulares e stands. O diesel continua a fazer sentido para quem faz muitos quilómetros por ano, sobretudo em autoestrada — consumos baixos e grande autonomia. Compara cada anúncio com a mediana de mercado antes de decidir."
      query={{ fuel: "Diesel" }}
      path={PATH}
      breadcrumb={[
        { label: "Início", href: "/" },
        { label: "Carros usados", href: "/carros" },
        { label: "Diesel" },
      ]}
      related={commonRelatedGroups(PATH)}
      faq={[
        {
          q: "Ainda compensa comprar um diesel usado?",
          a: "Depende da utilização. Acima de ~20 000 km/ano, com muita autoestrada, o menor consumo do diesel tende a compensar. Para trajetos curtos de cidade, um gasolina, híbrido ou elétrico costuma ser melhor escolha — os diesel modernos precisam de rodar para regenerar o filtro de partículas (DPF/FAP).",
        },
        {
          q: "O que verificar num diesel usado?",
          a: "Estado do filtro de partículas e do sistema EGR, fumo no arranque a frio, histórico de manutenção (correia/corrente de distribuição, injetores) e se o carro fez sobretudo cidade ou estrada. Um diesel só de cidade tem mais risco de problemas no DPF.",
        },
        {
          q: "Os diesel vão ser proibidos nas cidades?",
          a: "Algumas cidades europeias têm zonas de emissões reduzidas com restrições a veículos mais antigos. Em Portugal, a Zona de Emissões Reduzidas de Lisboa restringe carros anteriores a determinadas normas Euro em certas zonas. Verifica a norma Euro do carro (indicada nos documentos) antes de comprar.",
        },
      ]}
    />
  );
}
