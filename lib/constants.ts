// Cookie de 1ª parte que identifica um visitante (com ou sem login).
// Aqui (módulo sem imports) para poder ser usado no middleware (edge).
export const VISITOR_COOKIE = "n2vid";
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

export const FUELS = [
  "Gasolina",
  "Diesel",
  "Híbrido",
  "Híbrido Plug-In",
  "Elétrico",
  "GPL",
];
// Estrada Nacional 2: Chaves (km 0) → Faro (km 739), a mais longa de Portugal.
export const EN2_KM = 739;
export const ELECTRIFIED = ["Elétrico", "Híbrido Plug-In"];
export const GEARS = ["Manual", "Automática"];
export const REPORT_REASONS = [
  "Preço falso ou enganador",
  "Suspeita de fraude / burla",
  "Já vendido ou indisponível",
  "Informação incorreta",
  "Conteúdo impróprio",
  "Anúncio duplicado",
  "Outro",
];
export const BODY_TYPES = [
  "Citadino",
  "Utilitário",
  "Berlina",
  "Carrinha",
  "SUV / TT",
  "Monovolume",
  "Coupé",
  "Cabrio",
  "Pick-up",
];
export const CAR_COLOR_NAMES = [
  "Branco",
  "Preto",
  "Cinzento",
  "Prateado",
  "Azul",
  "Vermelho",
  "Verde",
  "Castanho",
  "Bege",
  "Amarelo",
  "Laranja",
];
export const REMINDER_TYPES = [
  "IPO",
  "Manutenção",
  "Seguro",
  "IUC",
  "Pneus",
  "Outro",
];
export const DISTRICTS = [
  "Aveiro",
  "Beja",
  "Braga",
  "Bragança",
  "Castelo Branco",
  "Coimbra",
  "Évora",
  "Faro",
  "Guarda",
  "Leiria",
  "Lisboa",
  "Portalegre",
  "Porto",
  "Santarém",
  "Setúbal",
  "Viana do Castelo",
  "Vila Real",
  "Viseu",
  "Açores",
  "Madeira",
];
export const CAR_COLORS = [
  "#CE994B",
  "#8B8165",
  "#414D11",
  "#B4552D",
  "#2A2721",
  "#624E1C",
  "#D8B06A",
  "#556217",
  "#A34A28",
  "#7E93A0",
  "#9A6A2F",
  "#6E6759",
];

export function fmtEur(n?: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("pt-PT") + " €";
}
export function monthly(price: number, down = price * 0.15, months = 72) {
  const P = Math.max(price - down, 0),
    r = 0.065 / 12;
  if (P <= 0) return 0;
  return Math.round((P * r) / (1 - Math.pow(1 + r, -months)));
}
