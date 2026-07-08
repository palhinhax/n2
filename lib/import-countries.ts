// Países suportados na área "Importar carros da Europa".
// Módulo sem imports para poder ser usado em client components e no scraper.

export interface ImportCountry {
  code: string; // ISO-2
  name: string; // nome PT
  slug: string; // usado nos URLs /importar-carros/[pais]
  flag: string;
  currency: string; // moeda dos anúncios (todos EUR por agora)
  distanceKm: number; // distância rodoviária típica até Lisboa (estimativa)
  marketNote: string; // frase curta usada nas páginas SEO por país
}

export const IMPORT_COUNTRIES: ImportCountry[] = [
  {
    code: "DE",
    name: "Alemanha",
    slug: "alemanha",
    flag: "🇩🇪",
    currency: "EUR",
    distanceKm: 2400,
    marketNote:
      "O maior mercado automóvel da Europa: enorme oferta, historial de manutenção rigoroso e preços competitivos em segmentos premium.",
  },
  {
    code: "FR",
    name: "França",
    slug: "franca",
    flag: "🇫🇷",
    currency: "EUR",
    distanceKm: 1700,
    marketNote:
      "Perto de Portugal e com boa oferta de citadinos e familiares diesel — o transporte é dos mais baratos da Europa.",
  },
  {
    code: "BE",
    name: "Bélgica",
    slug: "belgica",
    flag: "🇧🇪",
    currency: "EUR",
    distanceKm: 2000,
    marketNote:
      "Muitos carros de frota e de leasing com manutenção em dia, frequentemente bem equipados.",
  },
  {
    code: "NL",
    name: "Países Baixos",
    slug: "holanda",
    flag: "🇳🇱",
    currency: "EUR",
    distanceKm: 2200,
    marketNote:
      "Mercado transparente com quilometragem verificada (NAP) e boa oferta de elétricos e híbridos.",
  },
  {
    code: "ES",
    name: "Espanha",
    slug: "espanha",
    flag: "🇪🇸",
    currency: "EUR",
    distanceKm: 630,
    marketNote:
      "O país vizinho: transporte barato (ou ida e volta no próprio dia) e um mercado parecido com o português.",
  },
  {
    code: "IT",
    name: "Itália",
    slug: "italia",
    flag: "🇮🇹",
    currency: "EUR",
    distanceKm: 2100,
    marketNote:
      "Boa oferta de desportivos, citadinos e marcas italianas difíceis de encontrar em Portugal.",
  },
  {
    code: "LU",
    name: "Luxemburgo",
    slug: "luxemburgo",
    flag: "🇱🇺",
    currency: "EUR",
    distanceKm: 2000,
    marketNote:
      "Carros de gama alta com poucos quilómetros e manutenção feita na marca, num mercado pequeno mas de qualidade.",
  },
  {
    code: "AT",
    name: "Áustria",
    slug: "austria",
    flag: "🇦🇹",
    currency: "EUR",
    distanceKm: 2600,
    marketNote:
      "Frota jovem e bem mantida, com muitos 4x4 e carrinhas preparadas para clima exigente.",
  },
];

export const countryByCode = (code?: string | null) =>
  IMPORT_COUNTRIES.find(
    (c) => c.code.toLowerCase() === (code ?? "").trim().toLowerCase()
  ) ?? null;

export const countryBySlug = (slug?: string | null) =>
  IMPORT_COUNTRIES.find((c) => c.slug === (slug ?? "").trim().toLowerCase()) ??
  null;

export const countryName = (code?: string | null) =>
  countryByCode(code)?.name ?? code ?? "";

export const countryFlag = (code?: string | null) =>
  countryByCode(code)?.flag ?? "🇪🇺";
