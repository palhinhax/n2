// Qualidade de dados dos anúncios (site + externos).
//
// Regras simples e explicáveis que apanham erros de parsing/scraping antes de
// eles chegarem às listagens, às estatísticas de mercado e ao Google:
//   - km implausível (ex.: Seat Arona com 18 108 372 km)
//   - ano no futuro ou pré-histórico
//   - preço fora de qualquer intervalo razoável para um carro
//
// Um anúncio "suspeito" NÃO é apagado: sai das listagens/estatísticas/sitemaps
// e a página de detalhe passa a noindex com aviso "dados por confirmar".

export const SUSPICION_REASONS = {
  km: "km_implausivel",
  year: "ano_implausivel",
  price: "preco_implausivel",
} as const;

export type SuspicionReason =
  (typeof SUSPICION_REASONS)[keyof typeof SUSPICION_REASONS];

export const REASON_LABEL: Record<SuspicionReason, string> = {
  km_implausivel: "Quilómetros por confirmar",
  ano_implausivel: "Ano por confirmar",
  preco_implausivel: "Preço por confirmar",
};

// Limites (ver feedback SEO):
export const MAX_PLAUSIBLE_KM = 1_000_000; // > 1M km — quase de certeza erro
export const MIN_PLAUSIBLE_PRICE = 500; // < 500 € — peças/entrada de leasing/erro
export const MAX_PLAUSIBLE_PRICE = 1_000_000; // > 1M € — erro de parsing
export const MIN_PLAUSIBLE_YEAR = 1900;

export interface QualityInput {
  km?: number | null;
  year?: number | null;
  price?: number | null;
}

export interface QualityResult {
  suspicious: boolean;
  reasons: SuspicionReason[];
}

/** Avalia a plausibilidade dos dados de um anúncio. */
export function assessListingQuality(l: QualityInput): QualityResult {
  const reasons: SuspicionReason[] = [];
  const currentYear = new Date().getFullYear();

  if (l.km != null && l.km > MAX_PLAUSIBLE_KM)
    reasons.push(SUSPICION_REASONS.km);

  if (
    l.year != null &&
    (l.year > currentYear + 1 || l.year < MIN_PLAUSIBLE_YEAR)
  )
    reasons.push(SUSPICION_REASONS.year);

  if (
    l.price != null &&
    (l.price < MIN_PLAUSIBLE_PRICE || l.price > MAX_PLAUSIBLE_PRICE)
  )
    reasons.push(SUSPICION_REASONS.price);

  return { suspicious: reasons.length > 0, reasons };
}

/** Lê o campo JSON `suspiciousReasons` da BD com tolerância a lixo. */
export function parseSuspiciousReasons(raw?: string | null): SuspicionReason[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter((r): r is SuspicionReason => r in REASON_LABEL)
      : [];
  } catch {
    return [];
  }
}
