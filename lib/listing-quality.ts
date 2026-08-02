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
  parts: "possivel_pecas",
  nonVehicle: "nao_veiculo",
  keyword: "palavra_suspeita",
} as const;

export type SuspicionReason =
  (typeof SUSPICION_REASONS)[keyof typeof SUSPICION_REASONS];

export const REASON_LABEL: Record<SuspicionReason, string> = {
  km_implausivel: "Quilómetros por confirmar",
  ano_implausivel: "Ano por confirmar",
  preco_implausivel: "Preço por confirmar",
  possivel_pecas: "Possível anúncio de peças",
  nao_veiculo: "Anúncio não automóvel",
  palavra_suspeita: "Contém palavra suspeita",
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
  /** título original do anúncio (para detetar anúncios de peças/salvados) */
  title?: string | null;
  /** marca automóvel reconhecida — se presente, o título nunca marca
   *  não-veículo (protege "Renault Mégane c/ suporte bicicletas") */
  brand?: string | null;
  /** sinais mecânicos — quando presentes, o título nunca marca não-veículo
   *  (protege autocaravanas "Fiat Ducato com cama" e afins) */
  fuel?: string | null;
  gearbox?: string | null;
  power?: number | null;
  displacement?: number | null;
  /** descrição completa do anúncio (quando já foi enriquecido) */
  description?: string | null;
  /** palavras suspeitas geridas pelo admin (/admin/suspeitos) — pesquisadas
   *  no título E na descrição; passar [] quando o anúncio está isento */
  suspiciousKeywords?: string[];
}

// "para peças", "só peças", "salvado", "desmontagem", ou título a começar por
// "carroçaria/carroceria" — não é um carro completo à venda. Testado sobre o
// título sem acentos/minúsculas; conservador de propósito (título, não descrição).
const PARTS_TITLE_RE =
  /\b(?:para|so|p) ?pecas?\b|\bsalvado\b|\bdesmontagem\b|^\s*(?:carrocaria|carroceria)\b/;

// Mobília, eletrónica e outros artigos não automóveis que aparecem nos feeds
// (o OLX injeta "anúncios relacionados" de outras categorias nas páginas de
// resultados de carros).
const STRONG_NON_VEHICLE_TITLE_RES = [
  /^\s*(?:bicicleta|bicicletas|btt|e-?bike|trotinete|trotineta)\b/,
  /\btrek\s+(?:emonda|madone|domane|marlin|fuel|slash|rail|checkpoint|fx|x-?caliber)\b/,
];

// Só se aplicam quando o anúncio não traz nenhum sinal mecânico — protege
// autocaravanas ("Fiat Ducato com cama") e carros com extras como porta-bicicletas.
const SOFT_NON_VEHICLE_TITLE_RES = [
  // mobília
  /\bikea\b|\b(?:cama|camas|colchao|colchoes|roupeiro|armario|sofa|estante)\b/,
  /\b(?:movel|moveis|mobilia|mobiliario)\b/,
  // bicicletas e trotinetes
  /\b(?:bicicleta|bicicletas|btt|e-?bike|trotinete|trotineta)\b/,
  /\b(?:trek|emonda|domane|madone|specialized|cannondale|orbea|bianchi|canyon|merida|colnago|pinarello|lapierre)\b/,
  /\btrek\s+(?:emonda|madone|domane|marlin|fuel|slash|rail|checkpoint|fx|x-?caliber)\b/,
  // eletrónica
  /\b(?:telemovel|telemoveis|iphone|ipad|tablet|smartphone|macbook|portatil)\b/,
  /\b(?:playstation|ps[345]|xbox|nintendo|consola|drone)\b/,
];

const VEHICLE_BIKE_ACCESSORY_RE =
  /\b(?:porta|suporte|barras?|rack)\s+(?:\d+\s+)?(?:de\s+)?bicicletas?\b|\bbicicletas?\s+(?:thule|rack|suporte|barras?)\b/;

const hasStrongNonVehicleTitle = (title: string) => {
  const t = normForMatch(title);
  return STRONG_NON_VEHICLE_TITLE_RES.some((re) => re.test(t));
};

const hasSoftNonVehicleTitle = (title: string) => {
  const t = normForMatch(title);
  if (VEHICLE_BIKE_ACCESSORY_RE.test(t)) return false;
  return SOFT_NON_VEHICLE_TITLE_RES.some((re) => re.test(t));
};

// o título fala explicitamente de um automóvel — mesmo sem dados estruturados
// ("troco carro por iphone" é um anúncio de carro)
const CAR_WORD_RE =
  /\b(?:carro|carrinha|automovel|viatura|monovolume|autocaravana|camper|jipe|suv)\b/;

const normForMatch = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Palavras suspeitas do admin: devolve as que aparecem (palavra inteira,
 * sem acentos, mai\u00fasculas indiferentes) em algum dos textos. Suporta frases
 * ("cama articulada") com qualquer espa\u00e7amento entre as palavras.
 */
export function matchSuspiciousKeywords(
  keywords: string[],
  ...texts: Array<string | null | undefined>
): string[] {
  if (!keywords.length) return [];
  const haystack = texts
    .filter((t): t is string => !!t)
    .map(normForMatch)
    .join("\n");
  if (!haystack) return [];
  return keywords.filter((kw) => {
    const norm = normForMatch(kw).trim();
    if (!norm) return false;
    const pattern = norm.split(/\s+/).map(escapeRe).join("\\s+");
    return new RegExp(`(?<![a-z0-9])${pattern}(?![a-z0-9])`).test(haystack);
  });
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

  if (l.title && PARTS_TITLE_RE.test(normForMatch(l.title)))
    reasons.push(SUSPICION_REASONS.parts);

  // Sinais de que é mesmo um automóvel: dados mecânicos (só um veículo os
  // tem), ano, marca reconhecida, ou o próprio título a dizer "carro".
  const looksLikeCar =
    l.km != null ||
    l.fuel != null ||
    l.gearbox != null ||
    l.power != null ||
    l.displacement != null ||
    l.year != null ||
    l.brand != null ||
    (l.title != null && CAR_WORD_RE.test(normForMatch(l.title)));

  // NOTA: já tentámos marcar automaticamente anúncios "vazios" (sem marca,
  // ano, km…) como não-veículo — não dá: milhares de anúncios OLX reais chegam
  // só com título+preço ("vendo dacia sandero"). Daí a lista de palavras,
  // que só se aplica quando nada no anúncio aponta para um automóvel.
  if (
    l.title != null &&
    (hasStrongNonVehicleTitle(l.title) ||
      (!looksLikeCar && hasSoftNonVehicleTitle(l.title)))
  )
    reasons.push(SUSPICION_REASONS.nonVehicle);

  // Palavras do admin: aplicam-se sempre (sem gate looksLikeCar — uma mota tem
  // km/ano/combustível e mesmo assim queremos apanhá-la). Falsos positivos
  // resolvem-se com keywordExempt no /admin/suspeitos.
  if (
    l.suspiciousKeywords?.length &&
    matchSuspiciousKeywords(l.suspiciousKeywords, l.title, l.description)
      .length > 0
  )
    reasons.push(SUSPICION_REASONS.keyword);

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
