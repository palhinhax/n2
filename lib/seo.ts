// Utilitários de SEO partilhados.

// URL de produção. Define NEXT_PUBLIC_SITE_URL no .env (ex. https://www.nacional2.pt).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.nacional2.pt"
).replace(/\/$/, "");

export const SITE_NAME = "Nacional 2";
// Variantes do nome que as pessoas escrevem no Google — ajudam o Google a
// associar a pesquisa de marca ao site (schema WebSite/Organization).
export const SITE_ALTERNATE_NAMES = ["Nacional2", "nacional2.pt", "N2"];
export const SITE_TAGLINE = "Compra e vende carros usados em Portugal. Grátis.";
export const SITE_DESCRIPTION =
  "O maior agregador de carros usados em Portugal, 100% grátis para anunciar. " +
  "Milhares de anúncios de particulares e stands num só sítio, com garagem " +
  "digital, lembretes e ofertas diretas sem comissões.";

// Imagem Open Graph por omissão (partilhas em WhatsApp/Facebook/Twitter).
export const OG_IMAGE = "/og.jpg";

// Perfis sociais oficiais — entram no sameAs do schema Organization.
// Define NEXT_PUBLIC_INSTAGRAM_URL no .env (ex. https://www.instagram.com/nacional2pt).
export const SOCIAL_LINKS = [process.env.NEXT_PUBLIC_INSTAGRAM_URL].filter(
  (u): u is string => !!u
);

/** Converte um caminho relativo num URL absoluto do site. */
export function absolute(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  return SITE_URL + (path.startsWith("/") ? path : "/" + path);
}

/** Formata um preço em euros para textos/metadata. */
export function eur(n?: number | null): string {
  if (n == null) return "sob consulta";
  return new Intl.NumberFormat("pt-PT").format(n) + " €";
}

/** Limita um texto a N caracteres, sem cortar a meio de palavra. */
export function clamp(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, t.lastIndexOf(" ", max - 1)).trim() + "…";
}
