// Conteúdo dos sitemaps segmentados. Cada função devolve as entradas de um
// segmento; app/sitemaps/[name]/route.ts faz o render em XML.

import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";
import { MIN_LISTING_PRICE } from "@/lib/car-listing";
import { DISTRICTS } from "@/lib/constants";
import { IMPORT_COUNTRIES } from "@/lib/import-countries";
import { slugify } from "@/lib/slug";
import { CATEGORY_PAGES, PRICE_BANDS } from "@/lib/seo-links";
import { GUIDES } from "@/lib/guides";
import type { SitemapEntry } from "@/lib/sitemap-xml";

export const SITEMAP_NAMES = [
  "static",
  "districts",
  "prices",
  "brands",
  "models",
  "guides",
  "cars",
  "listings",
  "stands",
  "import",
] as const;

export type SitemapName = (typeof SITEMAP_NAMES)[number];

const MAX_CARS = 5000;
const MAX_LISTINGS = 20000;

const abs = (p: string) => `${SITE_URL}${p}`;

export async function sitemapEntries(
  name: SitemapName
): Promise<SitemapEntry[]> {
  switch (name) {
    case "static":
      return [
        { loc: abs("/"), changefreq: "daily", priority: 1 },
        { loc: abs("/carros"), changefreq: "hourly", priority: 0.9 },
        { loc: abs("/eletricos"), changefreq: "daily", priority: 0.8 },
        { loc: abs("/marcas"), changefreq: "daily", priority: 0.8 },
        { loc: abs("/vender"), changefreq: "monthly", priority: 0.8 },
        { loc: abs("/avaliar"), changefreq: "monthly", priority: 0.7 },
        { loc: abs("/calcular-isv"), changefreq: "monthly", priority: 0.7 },
        { loc: abs("/simulador-isv"), changefreq: "monthly", priority: 0.7 },
        {
          loc: abs("/quanto-custa-importar-carro"),
          changefreq: "monthly",
          priority: 0.7,
        },
        { loc: abs("/sobre"), changefreq: "monthly", priority: 0.6 },
        { loc: abs("/guias"), changefreq: "weekly", priority: 0.7 },
        { loc: abs("/seguranca"), changefreq: "monthly", priority: 0.5 },
        { loc: abs("/auth/register"), changefreq: "monthly", priority: 0.3 },
        ...CATEGORY_PAGES.map((c) => ({
          loc: abs(c.href),
          changefreq: "daily" as const,
          priority: 0.7,
        })),
      ];

    case "districts":
      return DISTRICTS.map((d) => ({
        loc: abs(`/carros-usados/${slugify(d)}`),
        changefreq: "daily",
        priority: 0.6,
      }));

    case "prices":
      return PRICE_BANDS.map((p) => ({
        loc: abs(`/carros-ate/${p}`),
        changefreq: "daily",
        priority: 0.6,
      }));

    case "guides":
      return [
        { loc: abs("/guias"), changefreq: "weekly", priority: 0.7 },
        ...GUIDES.map((g) => ({
          loc: abs(`/guias/${g.slug}`),
          lastmod: g.updated,
          changefreq: "monthly" as const,
          priority: 0.7,
        })),
      ];

    case "brands": {
      const brands = await prisma.brand.findMany({
        select: { name: true },
        orderBy: { name: "asc" },
      });
      return brands.map((b) => ({
        loc: abs(`/marcas/${slugify(b.name)}`),
        changefreq: "daily",
        priority: 0.7,
      }));
    }

    case "models": {
      const brands = await prisma.brand.findMany({
        select: { name: true, models: { select: { name: true } } },
        orderBy: { name: "asc" },
      });
      const out: SitemapEntry[] = [];
      for (const b of brands)
        for (const m of b.models)
          out.push({
            loc: abs(`/marcas/${slugify(b.name)}/${slugify(m.name)}`),
            changefreq: "daily",
            priority: 0.6,
          });
      return out;
    }

    case "cars": {
      const cars = await prisma.car.findMany({
        where: { forSale: true, status: "APPROVED" },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_CARS,
      });
      return cars.map((c) => ({
        loc: abs(`/carros/${c.id}`),
        lastmod: c.updatedAt,
        changefreq: "weekly",
        priority: 0.7,
      }));
    }

    case "listings": {
      const listings = await prisma.scrapedListing.findMany({
        where: {
          active: true,
          isDuplicate: false,
          suspicious: false,
          OR: [{ price: null }, { price: { gte: MIN_LISTING_PRICE } }],
        },
        select: {
          id: true,
          firstSeenAt: true,
          priceChangedAt: true,
          detailsFetchedAt: true,
        },
        orderBy: { lastSeenAt: "desc" },
        take: MAX_LISTINGS,
      });
      // lastmod = última alteração REAL de conteúdo (preço/detalhes), não o
      // lastSeenAt (que muda a cada ciclo do scraper e tornaria o lastmod inútil).
      return listings.map((l) => {
        const lastmod = [l.priceChangedAt, l.detailsFetchedAt, l.firstSeenAt]
          .filter((d): d is Date => d != null)
          .sort((a, b) => b.getTime() - a.getTime())[0];
        return {
          loc: abs(`/carros/externo/${l.id}`),
          lastmod,
          changefreq: "weekly" as const,
          priority: 0.5,
        };
      });
    }

    case "import": {
      const foreign = await prisma.foreignListing.findMany({
        where: {
          active: true,
          status: "APPROVED",
          isDuplicate: false,
          suspicious: false,
          priceEur: { gte: MIN_LISTING_PRICE },
        },
        select: { id: true, firstSeenAt: true },
        orderBy: { lastSeenAt: "desc" },
        take: MAX_LISTINGS,
      });
      return [
        { loc: abs("/importar-carros"), changefreq: "daily", priority: 0.8 },
        { loc: abs("/carros-importados"), changefreq: "daily", priority: 0.7 },
        ...IMPORT_COUNTRIES.map((c) => ({
          loc: abs(`/importar-carros/${c.slug}`),
          changefreq: "daily" as const,
          priority: 0.7,
        })),
        ...foreign.map((l) => ({
          loc: abs(`/importar-carros/anuncio/${l.id}`),
          lastmod: l.firstSeenAt,
          changefreq: "weekly" as const,
          priority: 0.5,
        })),
      ];
    }

    case "stands": {
      const stands = await prisma.user.findMany({
        where: { accountType: "STAND" },
        select: { id: true },
      });
      return stands.map((s) => ({
        loc: abs(`/stand/${s.id}`),
        changefreq: "weekly",
        priority: 0.5,
      }));
    }
  }
}
