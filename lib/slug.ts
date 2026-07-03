// Slugs para URLs SEO (marca/modelo/distrito) — sem acentos, minúsculas, hífens.

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas diacríticas)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Encontra o valor original cujo slug corresponde (case/acentos-insensível). */
export function matchSlug<T>(
  slug: string,
  items: T[],
  toName: (item: T) => string
): T | null {
  const s = slug.toLowerCase();
  return items.find((it) => slugify(toName(it)) === s) ?? null;
}
