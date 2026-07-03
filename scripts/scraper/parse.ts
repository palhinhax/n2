/** "141 900 km" | "19 990" | "1 199 cm3" -> número inteiro (ou null) */
export function intFrom(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number")
    return Number.isFinite(value) ? Math.round(value) : null;
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/** Devolve o primeiro valor não-vazio de um mapa de parâmetros, dado uma lista de chaves candidatas. */
export function pick(
  map: Record<string, string>,
  candidates: string[]
): string | null {
  for (const key of candidates) {
    const v = map[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

export function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Procura recursivamente o primeiro objeto que contenha a chave `key`. */
export function findDeep(obj: unknown, key: string, depth = 0): unknown {
  if (obj == null || depth > 12) return undefined;
  if (typeof obj !== "object") return undefined;
  if (!Array.isArray(obj) && key in (obj as Record<string, unknown>)) {
    return (obj as Record<string, unknown>)[key];
  }
  const values = Array.isArray(obj)
    ? obj
    : Object.values(obj as Record<string, unknown>);
  for (const v of values) {
    const found = findDeep(v, key, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}
