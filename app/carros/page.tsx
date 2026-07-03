import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import Filters from "@/components/filters";
import CarGrid from "@/components/car-grid";
import { fetchListingPage } from "@/lib/car-listing";

export const dynamic = "force-dynamic";

export default async function Carros({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const ordenar = searchParams.ordenar || "recentes";

  // ----- Marcas/modelos: junta os do site (tabela Brand) com os do scraping -----
  const canonBrand = (name: string) => {
    const t = name.trim();
    if (["vw", "volkswagen"].includes(t.toLowerCase())) return "Volkswagen";
    return t;
  };

  const [brandTable, scrapedBrands, scrapedModels] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: { models: { orderBy: { name: "asc" } } },
    }),
    prisma.scrapedListing.findMany({
      where: { active: true, brand: { not: null } },
      select: { brand: true },
      distinct: ["brand"],
    }),
    prisma.scrapedListing.findMany({
      where: { active: true, brand: { not: null }, model: { not: null } },
      select: { brand: true, model: true },
      distinct: ["brand", "model"],
    }),
  ]);

  const brandMap = new Map<string, { name: string; models: Set<string> }>();
  const addBrand = (name: string) => {
    const key = name.toLowerCase();
    let e = brandMap.get(key);
    if (!e) {
      e = { name, models: new Set<string>() };
      brandMap.set(key, e);
    }
    return e;
  };
  for (const b of brandTable) {
    const e = addBrand(b.name);
    for (const m of b.models) e.models.add(m.name);
  }
  for (const r of scrapedBrands) if (r.brand) addBrand(canonBrand(r.brand));
  for (const r of scrapedModels) {
    if (!r.brand) continue;
    const e = addBrand(canonBrand(r.brand));
    if (r.model) e.models.add(r.model);
  }
  const brands = Array.from(brandMap.values())
    .map((b) => ({
      name: b.name,
      models: Array.from(b.models).sort((a, c) => a.localeCompare(c)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // ----- Filtros por NOME (funciona para carros do site e externos) -----
  // primeira página da lista combinada (o resto carrega por scroll infinito)
  const query: Record<string, string> = {};
  for (const k of [
    "marca",
    "modelo",
    "precoMax",
    "fuel",
    "caixa",
    "anoMin",
    "kmMax",
    "ordenar",
  ]) {
    const v = searchParams[k];
    if (v) query[k] = v;
  }
  const firstPage = await fetchListingPage(query, 0, 24);

  const sortLink = (v: string) => {
    const p = new URLSearchParams(searchParams as any);
    p.set("ordenar", v);
    return "/carros?" + p.toString();
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1240px,94%)] py-6">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/" className="hover:underline">
            Início
          </Link>{" "}
          › <b className="text-ink">Carros usados</b>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[272px_1fr]">
          <Filters brands={brands} />
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="font-head text-[1.3rem] font-extrabold text-ink">
                Carros usados
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ["recentes", "Recentes"],
                  ["precoAsc", "Preço ↑"],
                  ["precoDesc", "Preço ↓"],
                  ["km", "Menos km"],
                ].map(([v, l]) => (
                  <Link
                    key={v}
                    href={sortLink(v)}
                    className={`n2-chip ${ordenar === v ? "!border-clay !bg-clay !text-white" : ""}`}
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </div>
            <CarGrid
              key={JSON.stringify(query)}
              initialItems={firstPage.items}
              initialNextOffset={firstPage.nextOffset}
              query={query}
            />
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
