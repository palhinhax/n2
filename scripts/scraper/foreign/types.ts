// Tipos do scraping de anúncios estrangeiros (Importar carros da Europa).

/** Anúncio "cru" devolvido por um adaptador, antes da normalização. */
export interface ForeignRawListing {
  externalId: string;
  url: string;
  title: string;
  brand?: string | null;
  model?: string | null;
  version?: string | null;
  year?: number | null;
  firstRegistration?: string | null; // "YYYY-MM" quando disponível
  km?: number | null;
  price?: number | null; // na moeda de origem
  currency?: string | null; // default: moeda do país
  fuel?: string | null; // termo original do site (será normalizado)
  gearbox?: string | null;
  displacement?: number | null; // cm3
  power?: number | null; // cv (kW é convertido no adaptador)
  co2?: number | null; // g/km
  emissionStandard?: string | null; // "Euro 6d"
  bodyType?: string | null;
  doors?: number | null;
  seats?: number | null;
  region?: string | null; // cidade/região
  sellerType?: string | null; // termo original (será normalizado)
  sellerName?: string | null;
  sellerPhone?: string | null; // só se público no site de origem
  sellerEmail?: string | null; // só se público no site de origem
  imageUrls?: string[];
  description?: string | null;
}

export interface ForeignPageResult {
  items: ForeignRawListing[];
  /** null => fonte terminada neste ciclo */
  nextCursor: unknown | null;
}

/** Configuração de uma fonte (linha da tabela ImportSource). */
export interface ForeignSourceConfig {
  slug: string;
  name: string;
  adapter: string;
  country: string; // ISO-2
  baseUrl: string;
}

/**
 * Adaptador de um marketplace estrangeiro. Uma implementação serve várias
 * fontes/países — recebe a config da fonte em cada chamada.
 *
 * Regras para TODOS os adaptadores:
 *  - respeitar o robots.txt (usar `assertAllowedByRobots` antes de cada URL);
 *  - respeitar rate limits (o motor aplica politeDelay entre páginas);
 *  - guardar apenas dados publicamente visíveis (contactos só se públicos);
 *  - nunca contornar mecanismos de proteção (logins, captchas, paywalls).
 */
export interface ForeignAdapter {
  name: string; // igual ao campo ImportSource.adapter
  scrapePage(
    source: ForeignSourceConfig,
    cursor: unknown
  ): Promise<ForeignPageResult>;
}
