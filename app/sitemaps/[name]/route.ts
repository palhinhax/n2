import {
  renderUrlset,
  xmlResponse,
  type SitemapEntry,
} from "@/lib/sitemap-xml";
import {
  sitemapEntries,
  SITEMAP_NAMES,
  type SitemapName,
} from "@/lib/sitemaps";

export const revalidate = 3600;

// /sitemaps/<nome>.xml — segmentos referenciados pelo índice /sitemap.xml.
export async function GET(
  _req: Request,
  { params }: { params: { name: string } }
) {
  const name = params.name.replace(/\.xml$/, "") as SitemapName;
  if (!SITEMAP_NAMES.includes(name))
    return new Response("Not found", { status: 404 });

  let entries: SitemapEntry[];
  try {
    entries = await sitemapEntries(name);
  } catch {
    // BD indisponível (ex.: build) — devolve segmento vazio em vez de 500
    entries = [];
  }
  return xmlResponse(renderUrlset(entries));
}
