// Links internos partilhados pelas páginas SEO programáticas.
// Manter tudo aqui evita páginas órfãs: cada página nova entra nestes grupos
// e passa automaticamente a ser lincada pelas outras (e pelo sitemap).

import { slugify } from "@/lib/slug";
import { DISTRICTS } from "@/lib/constants";
import type { RelatedGroup } from "@/components/seo-listing";

export const PRICE_BANDS = [5000, 7500, 10000, 15000, 20000, 30000, 50000];

/** Páginas de categoria (combustível/caixa/tipo/orçamento editorial). */
export const CATEGORY_PAGES: {
  href: string;
  label: string;
}[] = [
  { href: "/carros-automaticos-usados", label: "Automáticos" },
  { href: "/carros-diesel-usados", label: "Diesel" },
  { href: "/carros-eletricos-usados", label: "Elétricos" },
  { href: "/carros-familiares-usados", label: "Familiares / carrinhas" },
  { href: "/primeiro-carro", label: "Primeiro carro" },
];

/** Grupos de links "relacionados" comuns às páginas SEO. */
export function commonRelatedGroups(current?: string): RelatedGroup[] {
  return [
    {
      heading: "Por tipo de carro",
      links: CATEGORY_PAGES.filter((c) => c.href !== current).map((c) => ({
        label: c.label,
        href: c.href,
      })),
    },
    {
      heading: "Por orçamento",
      links: PRICE_BANDS.map((b) => ({
        label: `até ${b.toLocaleString("pt-PT")} €`,
        href: `/carros-ate/${b}`,
      })).filter((l) => l.href !== current),
    },
    {
      heading: "Por distrito",
      links: DISTRICTS.map((d) => ({
        label: d,
        href: `/carros-usados/${slugify(d)}`,
      })).filter((l) => l.href !== current),
    },
  ];
}
