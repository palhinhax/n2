// Geração de XML para os sitemaps segmentados (/sitemap.xml + /sitemaps/*.xml).
// Sitemaps separados por tipo de página tornam a indexação mais legível no
// Search Console e permitem lastmod fiável por tipo de conteúdo.

export interface SitemapEntry {
  loc: string;
  lastmod?: Date | string | null;
  changefreq?:
    "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const iso = (d: Date | string) =>
  (d instanceof Date ? d : new Date(d)).toISOString();

/** <urlset> com as páginas de um segmento. */
export function renderUrlset(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const parts = [`<loc>${esc(e.loc)}</loc>`];
      if (e.lastmod) parts.push(`<lastmod>${iso(e.lastmod)}</lastmod>`);
      if (e.changefreq) parts.push(`<changefreq>${e.changefreq}</changefreq>`);
      if (e.priority != null)
        parts.push(`<priority>${e.priority.toFixed(1)}</priority>`);
      return `<url>${parts.join("")}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

/** <sitemapindex> que aponta para os sitemaps segmentados. */
export function renderIndex(
  sitemaps: { loc: string; lastmod?: Date | string | null }[]
): string {
  const items = sitemaps
    .map((s) => {
      const parts = [`<loc>${esc(s.loc)}</loc>`];
      if (s.lastmod) parts.push(`<lastmod>${iso(s.lastmod)}</lastmod>`);
      return `<sitemap>${parts.join("")}</sitemap>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}

export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
