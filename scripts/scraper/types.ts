export type PortalSource = "OLX" | "STANDVIRTUAL" | "PISCAPISCA" | "AUTOSAPO";
export type BackupListingSource = `API_${PortalSource}`;
export type ListingSource = PortalSource | BackupListingSource;
export type AdapterSource = PortalSource | "CARROS_API";

export type Source = ListingSource;

const PORTAL_SOURCES = new Set<string>([
  "OLX",
  "STANDVIRTUAL",
  "PISCAPISCA",
  "AUTOSAPO",
]);

export function isBackupListingSource(source: string): boolean {
  return source.startsWith("API_");
}

export function primarySourceForBackup(source: string): PortalSource | null {
  if (!isBackupListingSource(source)) return null;
  const primary = source.slice(4);
  return PORTAL_SOURCES.has(primary) ? (primary as PortalSource) : null;
}

export interface Listing {
  source: ListingSource;
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
  firstSeenAt?: Date | null;
}

/** Resultado de uma pagina de scraping. nextCursor === null => fonte terminada. */
export interface PageResult {
  items: Listing[];
  nextCursor: unknown | null;
}

export interface SiteAdapter {
  name: AdapterSource;
  /** cursor === undefined => comecar do inicio */
  scrapePage(cursor: unknown): Promise<PageResult>;
}
