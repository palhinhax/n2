// Simulação de financiamento automóvel (crédito clássico).
// Valores são estimativas — a TAEG real depende do banco e do perfil do cliente.

export const FIN_APR = 0.089; // TAEG estimada (crédito auto usado em PT)
export const FIN_DEFAULT_MONTHS = 72;
export const FIN_MONTHS_OPTIONS = [12, 24, 36, 48, 60, 72, 84, 96];
export const FIN_DEFAULT_DOWN_PCT = 0.2; // entrada sugerida (20%)

/** Preço máximo financiável para uma dada prestação (inverso do PMT).
 *  Usado no filtro "mensalidade até". Assume entrada 0 para dar o teto. */
export function maxPriceForMonthly(
  payment: number,
  months: number = FIN_DEFAULT_MONTHS,
  apr: number = FIN_APR
): number {
  if (payment <= 0 || months <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return Math.round(payment * months);
  return Math.round((payment * (1 - Math.pow(1 + r, -months))) / r);
}

/** Prestação mensal por amortização (fórmula PMT). */
export function monthlyPayment(
  price: number,
  down: number,
  months: number,
  apr: number = FIN_APR
): number {
  const financed = Math.max(price - down, 0);
  if (financed <= 0 || months <= 0) return 0;
  const r = apr / 12;
  if (r === 0) return Math.round(financed / months);
  return Math.round((financed * r) / (1 - Math.pow(1 + r, -months)));
}
