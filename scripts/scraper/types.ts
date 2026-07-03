export type Source = "OLX" | "STANDVIRTUAL" | "PISCAPISCA" | "AUTOSAPO";

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
}

/** Resultado de uma "página" de scraping. nextCursor === null => fonte terminada. */
export interface PageResult {
  items: Listing[];
  nextCursor: unknown | null;
}

export interface SiteAdapter {
  name: Source;
  /** cursor === undefined => começar do início */
  scrapePage(cursor: unknown): Promise<PageResult>;
}
