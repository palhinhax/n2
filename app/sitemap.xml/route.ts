import { SITE_URL } from "@/lib/seo";
import { renderIndex, xmlResponse } from "@/lib/sitemap-xml";
import { SITEMAP_NAMES } from "@/lib/sitemaps";

export const revalidate = 3600;

// Índice de sitemaps — cada segmento vive em /sitemaps/<nome>.xml.
// Separar por tipo dá visibilidade por secção no Search Console e permite
// lastmod fiável por tipo de conteúdo.
export function GET() {
  const now = new Date();
  return xmlResponse(
    renderIndex(
      SITEMAP_NAMES.map((name) => ({
        loc: `${SITE_URL}/sitemaps/${name}.xml`,
        lastmod: now,
      }))
    )
  );
}
