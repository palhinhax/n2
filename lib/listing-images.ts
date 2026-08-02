// Fotos dos anúncios externos: guardadas como JSON array de URLs em
// ScrapedListing.imageUrls. Um admin pode apagar uma foto individual (fotos
// trocadas/sem sentido que o scraper apanhou) — a URL vai para blockedImages e
// tanto o scraper como o enriquecimento a filtram, senão voltaria no ciclo
// seguinte.

/** Lê um campo JSON de URLs sem rebentar com dados inválidos. */
export function parseImageUrls(json: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(json || "[]");
    return Array.isArray(arr) ? arr.filter((u) => typeof u === "string") : [];
  } catch {
    return [];
  }
}

/** Remove as fotos vetadas pelo admin, mantendo a ordem original. */
export function withoutBlocked(
  urls: string[],
  blockedJson: string | null | undefined
): string[] {
  const blocked = parseImageUrls(blockedJson);
  if (blocked.length === 0) return urls;
  const set = new Set(blocked);
  return urls.filter((u) => !set.has(u));
}
