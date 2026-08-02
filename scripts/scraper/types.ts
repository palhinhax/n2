export type Source = "OLX" | "STANDVIRTUAL" | "PISCAPISCA" | "AUTOSAPO";

/** Nome de um adapter no engine — as fontes reais mais a API de backup
 * (que devolve itens com `source` de qualquer uma das fontes reais). */
export type AdapterName = Source | "API";

export interface Listing {
  source: Source;
  externalId: string;
  url: string;
  title: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  km?: number | null;
  fuel?: string | null;
  gearbox?: string | null;
  power?: number | null;
  displacement?: number | null;
  price?: number | null;
  location?: string | null;
  sellerType?: string | null;
  sellerName?: string | null;
  imageUrls: string[];
  description?: string | null;
  /** "api" = veio da API de backup; default "scraper" (fonte própria).
   * Em caso de conflito, os dados do scraper próprio têm sempre precedência. */
  origin?: "scraper" | "api";
}

/** Resultado de uma "página" de scraping. nextCursor === null => fonte terminada. */
export interface PageResult {
  items: Listing[];
  nextCursor: unknown | null;
}

export interface SiteAdapter {
  name: AdapterName;
  /** cursor === undefined => começar do início */
  scrapePage(cursor: unknown): Promise<PageResult>;
}
