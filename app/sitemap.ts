import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";
import { MIN_LISTING_PRICE } from "@/lib/car-listing";

export const dynamic = "force-dynamic";
export const revalidate = 86400; // 1 dia

// Sitemap dinâmico: páginas base, marcas e anúncios (site + externos ativos).
// Limitado para não gerar um ficheiro gigante — os anúncios mais recentes.
const MAX_CARS = 5000;
const MAX_LISTINGS = 20000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/carros`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/eletricos`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/avaliar`, changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${SITE_URL}/calcular-isv`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/auth/register`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  let brands: { name: string }[] = [];
  let cars: { id: string; updatedAt: Date }[] = [];
  let listings: { id: string; lastSeenAt: Date }[] = [];
  let stands: { id: string }[] = [];
  try {
    [brands, cars, listings, stands] = await Promise.all([
      prisma.brand.findMany({
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prisma.car.findMany({
        where: { forSale: true, status: "APPROVED" },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: MAX_CARS,
      }),
      prisma.scrapedListing.findMany({
        where: {
          active: true,
          isDuplicate: false,
          OR: [{ price: null }, { price: { gte: MIN_LISTING_PRICE } }],
        },
        select: { id: true, lastSeenAt: true },
        orderBy: { lastSeenAt: "desc" },
        take: MAX_LISTINGS,
      }),
      prisma.user.findMany({
        where: { accountType: "STAND" },
        select: { id: true },
      }),
    ]);
  } catch {
    // se a BD não estiver acessível no build, devolve só as páginas base
    return base;
  }

  const brandPages: MetadataRoute.Sitemap = brands.map((b) => ({
    url: `${SITE_URL}/carros?marca=${encodeURIComponent(b.name)}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const carPages: MetadataRoute.Sitemap = cars.map((c) => ({
    url: `${SITE_URL}/carros/${c.id}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const listingPages: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${SITE_URL}/carros/externo/${l.id}`,
    lastModified: l.lastSeenAt,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const standPages: MetadataRoute.Sitemap = stands.map((s) => ({
    url: `${SITE_URL}/stand/${s.id}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...base, ...brandPages, ...standPages, ...carPages, ...listingPages];
}
