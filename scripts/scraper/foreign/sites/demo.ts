// Adaptador "demo": gera anúncios estrangeiros sintéticos mas plausíveis.
// Serve para desenvolver/demonstrar a área de importação sem tocar em sites
// reais (e para testes). Determinístico por (fonte, página, índice).

import type {
  ForeignAdapter,
  ForeignPageResult,
  ForeignRawListing,
  ForeignSourceConfig,
} from "../types";

const CATALOG: {
  brand: string;
  model: string;
  fuel: string;
  body: string;
  displacement: number;
  power: number;
  co2: number;
  basePrice: number; // preço típico com 3 anos / 60.000 km no país de origem
}[] = [
  {
    brand: "Volkswagen",
    model: "Golf",
    fuel: "Diesel",
    body: "Compact",
    displacement: 1968,
    power: 150,
    co2: 118,
    basePrice: 21500,
  },
  {
    brand: "BMW",
    model: "320d",
    fuel: "Diesel",
    body: "Limousine",
    displacement: 1995,
    power: 190,
    co2: 125,
    basePrice: 30500,
  },
  {
    brand: "Mercedes-Benz",
    model: "C 220 d",
    fuel: "Diesel",
    body: "Limousine",
    displacement: 1993,
    power: 200,
    co2: 130,
    basePrice: 33000,
  },
  {
    brand: "Audi",
    model: "A4 Avant",
    fuel: "Diesel",
    body: "Kombi",
    displacement: 1968,
    power: 163,
    co2: 122,
    basePrice: 29500,
  },
  {
    brand: "Tesla",
    model: "Model 3",
    fuel: "Electric",
    body: "Limousine",
    displacement: 0,
    power: 283,
    co2: 0,
    basePrice: 28500,
  },
  {
    brand: "Renault",
    model: "Clio",
    fuel: "Benzin",
    body: "Kleinwagen",
    displacement: 999,
    power: 90,
    co2: 118,
    basePrice: 13500,
  },
  {
    brand: "Peugeot",
    model: "3008",
    fuel: "Benzin",
    body: "SUV",
    displacement: 1199,
    power: 130,
    co2: 131,
    basePrice: 22500,
  },
  {
    brand: "Volvo",
    model: "XC60",
    fuel: "Plug-in Hybrid",
    body: "SUV",
    displacement: 1969,
    power: 350,
    co2: 45,
    basePrice: 41000,
  },
  {
    brand: "Toyota",
    model: "Corolla",
    fuel: "Hybrid",
    body: "Kombi",
    displacement: 1798,
    power: 140,
    co2: 102,
    basePrice: 22000,
  },
  {
    brand: "Skoda",
    model: "Octavia",
    fuel: "Diesel",
    body: "Kombi",
    displacement: 1968,
    power: 150,
    co2: 115,
    basePrice: 21000,
  },
  {
    brand: "Hyundai",
    model: "Kona",
    fuel: "Electric",
    body: "SUV",
    displacement: 0,
    power: 204,
    co2: 0,
    basePrice: 24500,
  },
  {
    brand: "Porsche",
    model: "Macan",
    fuel: "Benzin",
    body: "SUV",
    displacement: 1984,
    power: 265,
    co2: 185,
    basePrice: 52000,
  },
];

const CITIES: Record<string, string[]> = {
  DE: ["München", "Hamburg", "Köln", "Stuttgart", "Berlin"],
  FR: ["Lyon", "Bordeaux", "Toulouse", "Paris", "Nantes"],
  BE: ["Antwerpen", "Bruxelles", "Gent", "Liège"],
  NL: ["Amsterdam", "Rotterdam", "Utrecht", "Eindhoven"],
  ES: ["Madrid", "Sevilla", "Valencia", "Barcelona"],
  IT: ["Milano", "Torino", "Roma", "Bologna"],
  LU: ["Luxembourg", "Esch-sur-Alzette"],
  AT: ["Wien", "Graz", "Salzburg", "Linz"],
};

/** PRNG determinístico (mulberry32) para dados estáveis entre execuções. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCode(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PAGES = 3;
const PER_PAGE = 16;

export const demo: ForeignAdapter = {
  name: "demo",

  async scrapePage(
    source: ForeignSourceConfig,
    cursor: unknown
  ): Promise<ForeignPageResult> {
    const page = ((cursor as { page: number }) ?? { page: 1 }).page;
    const items: ForeignRawListing[] = [];
    const cities = CITIES[source.country.toUpperCase()] ?? ["Europa"];
    const thisYear = new Date().getFullYear();

    for (let i = 0; i < PER_PAGE; i++) {
      const seed = hashCode(`${source.slug}|${page}|${i}`);
      const r = rng(seed);
      const spec = CATALOG[Math.floor(r() * CATALOG.length)];
      const age = 1 + Math.floor(r() * 7); // 1–7 anos
      const year = thisYear - age;
      const km = Math.round((12000 + r() * 18000) * age);
      // depreciação ~11%/ano face ao preço base (3 anos) + ruído
      const price = Math.max(
        4000,
        Math.round(
          (spec.basePrice * Math.pow(0.89, age - 3) * (0.92 + r() * 0.16)) / 50
        ) * 50
      );
      const month = 1 + Math.floor(r() * 12);
      const dealer = r() > 0.35;

      items.push({
        externalId: `demo-${seed.toString(16)}`,
        url: `https://example.org/demo/${source.country.toLowerCase()}/${seed.toString(16)}`,
        title: `${spec.brand} ${spec.model}`,
        brand: spec.brand,
        model: spec.model,
        version: null,
        year,
        firstRegistration: `${year}-${String(month).padStart(2, "0")}`,
        km,
        price,
        currency: "EUR",
        fuel: spec.fuel,
        gearbox: r() > 0.4 ? "Automatic" : "Manual",
        displacement: spec.displacement || null,
        power: spec.power,
        co2: spec.co2 || null,
        emissionStandard: year >= 2021 ? "Euro 6d" : "Euro 6",
        bodyType: spec.body,
        doors: 5,
        seats: 5,
        region: cities[Math.floor(r() * cities.length)],
        sellerType: dealer ? "Dealer" : "Private",
        sellerName: dealer ? `AutoHaus ${cities[0]}` : null,
        imageUrls: [],
        description:
          "Anúncio de demonstração gerado localmente (fonte demo) — não corresponde a um carro real.",
      });
    }

    return {
      items,
      nextCursor: page >= PAGES ? null : { page: page + 1 },
    };
  },
};
