// Estimativa do custo total de importar um carro da Europa para Portugal.
//
// Todos os valores são ESTIMATIVAS configuráveis no painel de admin (tabela
// ImportConfig) — nada de taxas hardcoded permanentes: o ISV/IUC vem de
// lib/car-tax.ts (tabelas atualizáveis) e o resto (transporte, documentos,
// legalização, fee de serviço) vem dos pressupostos abaixo, editáveis sem
// deploy. O custo final depende sempre das Finanças/IMT e do estado real do
// carro — a UI mostra sempre um disclaimer.
//
// NOTA: imports relativos de propósito — este módulo também corre no scraper
// (tsx), fora do resolver de aliases do Next.

import { calcISV, calcIUC, type Norm, type TaxFuel } from "./car-tax";
import { countryByCode } from "./import-countries";
import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Pressupostos configuráveis
// ---------------------------------------------------------------------------

export interface ImportAssumptions {
  /** multiplicador moeda→EUR para anúncios fora da zona euro (ex.: CHF 1.06) */
  fxToEur: Record<string, number>;
  transportBase: number; // € fixos (recolha + entrega em camião)
  transportPerKm: number; // €/km de transporte por camião porta-carros
  travelPerKm: number; // €/km se fores buscar o carro (combustível+portagens, por km de ida)
  tempPlatesDocs: number; // matrícula de exportação/trânsito + documentos no país de origem
  inspectionB: number; // inspeção técnica tipo B (obrigatória para importados)
  homologation: number; // homologação / Modelo 9 (IMT)
  registration: number; // taxa de atribuição de matrícula (DAV)
  plates: number; // chapas de matrícula
  adminBuffer: number; // traduções, despachante, deslocações, pequenas taxas
  serviceFeePct: number; // fee de serviço opcional (% do preço do carro); 0 = desligado
  serviceFeeMin: number; // mínimo do fee quando ativo
  note?: string; // nota livre do admin (ex.: "valores OE2026")
}

export const DEFAULT_ASSUMPTIONS: ImportAssumptions = {
  fxToEur: {},
  transportBase: 250,
  transportPerKm: 0.55,
  travelPerKm: 0.35,
  tempPlatesDocs: 150,
  inspectionB: 55,
  homologation: 100,
  registration: 65,
  plates: 40,
  adminBuffer: 120,
  serviceFeePct: 0,
  serviceFeeMin: 0,
};

const ASSUMPTIONS_ID = "assumptions";

// cache em memória (por instância) — os pressupostos mudam raramente
let cached: { at: number; value: ImportAssumptions } | null = null;
const CACHE_MS = 60_000;

export async function getImportAssumptions(): Promise<ImportAssumptions> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  let value = DEFAULT_ASSUMPTIONS;
  try {
    const row = await prisma.importConfig.findUnique({
      where: { id: ASSUMPTIONS_ID },
    });
    if (row) {
      const parsed = JSON.parse(row.data);
      value = {
        ...DEFAULT_ASSUMPTIONS,
        ...parsed,
        fxToEur: { ...DEFAULT_ASSUMPTIONS.fxToEur, ...(parsed.fxToEur ?? {}) },
      };
    }
  } catch {
    // tabela ainda não migrada ou JSON inválido — usa defaults
  }
  cached = { at: Date.now(), value };
  return value;
}

export async function saveImportAssumptions(
  partial: Partial<ImportAssumptions>
): Promise<ImportAssumptions> {
  const current = await getImportAssumptions();
  const next: ImportAssumptions = {
    ...current,
    ...partial,
    fxToEur: { ...current.fxToEur, ...(partial.fxToEur ?? {}) },
  };
  await prisma.importConfig.upsert({
    where: { id: ASSUMPTIONS_ID },
    update: { data: JSON.stringify(next) },
    create: { id: ASSUMPTIONS_ID, data: JSON.stringify(next) },
  });
  cached = { at: Date.now(), value: next };
  return next;
}

/** Converte um preço para EUR segundo os pressupostos (1:1 para EUR). */
export function toEur(
  price: number,
  currency: string | null | undefined,
  a: ImportAssumptions
): number {
  const cur = (currency ?? "EUR").toUpperCase();
  if (cur === "EUR") return Math.round(price);
  const rate = a.fxToEur[cur];
  return rate ? Math.round(price * rate) : Math.round(price);
}

// ---------------------------------------------------------------------------
// Estimativa de CO₂ / cilindrada quando o anúncio não os traz
// ---------------------------------------------------------------------------

export function taxFuelOf(fuel?: string | null): TaxFuel {
  const f = (fuel ?? "").toLowerCase();
  if (/plug|phev/.test(f)) return "plugin";
  if (/l[ée]tric/.test(f)) return "eletrico";
  if (/h[íi]brid/.test(f)) return "hibrido";
  if (/diesel|gas[oó]leo/.test(f)) return "diesel";
  return "gasolina";
}

function estimateDisplacement(fuel: TaxFuel, power?: number | null): number {
  if (fuel === "eletrico") return 0;
  // heurística: ~10–12 cm³ por cv, com pisos típicos por combustível
  const byPower = power ? power * (fuel === "diesel" ? 12 : 11) : 0;
  const floor = fuel === "diesel" ? 1500 : 1200;
  return Math.max(floor, Math.min(3000, Math.round(byPower) || floor));
}

function estimateCo2(fuel: TaxFuel, displacement: number, norm: Norm): number {
  if (fuel === "eletrico") return 0;
  if (fuel === "plugin") return 35;
  if (fuel === "hibrido") return 100;
  // gasolina/diesel: cresce com a cilindrada; WLTP mede mais alto que NEDC
  const base = fuel === "diesel" ? 105 : 120;
  const extra = Math.max(0, displacement - 1200) * 0.03;
  const co2 = base + extra;
  return Math.round(norm === "WLTP" ? co2 * 1.15 : co2);
}

// ---------------------------------------------------------------------------
// Cálculo do custo total
// ---------------------------------------------------------------------------

export interface ImportCostLine {
  key: string;
  label: string;
  amount: number;
  note?: string;
}

export type ImportConfidence = "alta" | "media" | "baixa";
export type ImportDifficulty = "facil" | "media" | "exigente";

export interface ImportCostBreakdown {
  priceOriginal: number;
  currency: string;
  vehiclePriceEur: number;
  lines: ImportCostLine[]; // tudo o que soma ao total (exceto o preço do carro)
  isv: number;
  isvEstimated: boolean; // true se CO₂/cilindrada foram estimados
  iucAnnual: number; // imposto ANUAL — mostrado à parte, não soma ao total
  travelOptional: number; // ir buscar o carro em vez de camião — não soma
  totalEur: number; // preço + linhas
  confidence: ImportConfidence;
  difficulty: ImportDifficulty;
  timeEstimate: string;
  assumptionsUsed: {
    co2: number;
    co2Estimated: boolean;
    displacement: number;
    displacementEstimated: boolean;
    norm: Norm;
    ageYears: number;
    distanceKm: number;
  };
}

export interface ImportCostInput {
  price: number;
  currency?: string | null;
  country?: string | null;
  fuel?: string | null;
  year?: number | null;
  firstRegistration?: string | null; // "YYYY-MM" quando disponível
  displacement?: number | null;
  power?: number | null;
  co2?: number | null;
}

function ageYearsOf(i: ImportCostInput): number {
  const now = new Date();
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(i.firstRegistration ?? "");
  const y = m ? Number(m[1]) : (i.year ?? now.getFullYear());
  const month = m && m[2] ? Number(m[2]) : 6;
  const age = now.getFullYear() - y + (now.getMonth() + 1 - month) / 12;
  return Math.max(0, age);
}

export function estimateImportCost(
  i: ImportCostInput,
  a: ImportAssumptions
): ImportCostBreakdown {
  const currency = (i.currency ?? "EUR").toUpperCase();
  const vehiclePriceEur = toEur(i.price, currency, a);
  const country = countryByCode(i.country);
  const distanceKm = country?.distanceKm ?? 2000;

  const fuel = taxFuelOf(i.fuel);
  const year = i.year ?? new Date().getFullYear();
  const norm: Norm = year >= 2019 ? "WLTP" : "NEDC";
  const ageYears = ageYearsOf(i);

  const displacementEstimated = !(i.displacement && i.displacement > 0);
  const displacement = displacementEstimated
    ? estimateDisplacement(fuel, i.power)
    : (i.displacement as number);
  const co2Estimated = !(i.co2 && i.co2 > 0) && fuel !== "eletrico";
  const co2 =
    fuel === "eletrico"
      ? 0
      : co2Estimated
        ? estimateCo2(fuel, displacement, norm)
        : (i.co2 as number);

  const isvRes = calcISV({
    cylinder: displacement,
    co2,
    fuel,
    norm,
    ageYears,
    importedUsedEU: ageYears >= 0.5, // usados UE têm redução por idade
  });
  const iucRes = calcIUC({ cylinder: displacement, co2, fuel, norm, year });

  const transport = Math.round(a.transportBase + a.transportPerKm * distanceKm);
  const legalization = Math.round(
    a.homologation + a.registration + a.plates + a.adminBuffer
  );
  const serviceFee =
    a.serviceFeePct > 0
      ? Math.max(
          a.serviceFeeMin,
          Math.round((vehiclePriceEur * a.serviceFeePct) / 100)
        )
      : 0;

  const lines: ImportCostLine[] = [
    {
      key: "transport",
      label: "Transporte para Portugal",
      amount: transport,
      note: `Camião porta-carros, ~${distanceKm.toLocaleString("pt-PT")} km desde ${country?.name ?? "a origem"}`,
    },
    {
      key: "tempPlatesDocs",
      label: "Matrícula de exportação e documentos",
      amount: Math.round(a.tempPlatesDocs),
      note: "Matrícula de trânsito/exportação, COC e papelada no país de origem",
    },
    {
      key: "inspection",
      label: "Inspeção tipo B",
      amount: Math.round(a.inspectionB),
      note: "Inspeção obrigatória para veículos importados (centro ITV)",
    },
    {
      key: "legalization",
      label: "Legalização e matrícula",
      amount: legalization,
      note: "Homologação IMT (Modelo 9), DAV, chapas e pequenas taxas",
    },
    {
      key: "isv",
      label: "ISV estimado",
      amount: isvRes.total,
      note: isvRes.exempt
        ? "Elétricos estão isentos de ISV"
        : `Redução de ${Math.round(isvRes.reductionPct * 100)}% por idade (usado UE)${co2Estimated || displacementEstimated ? " — CO₂/cilindrada estimados" : ""}`,
    },
  ];
  if (serviceFee > 0) {
    lines.push({
      key: "serviceFee",
      label: "Fee de serviço (opcional)",
      amount: serviceFee,
      note: "Acompanhamento do processo de importação",
    });
  }

  const totalEur = vehiclePriceEur + lines.reduce((s, l) => s + l.amount, 0);

  const missing = (co2Estimated ? 1 : 0) + (displacementEstimated ? 1 : 0);
  const confidence: ImportConfidence =
    fuel === "eletrico" || missing === 0
      ? "alta"
      : missing === 1
        ? "media"
        : "baixa";

  // dificuldade do processo: elétricos são simples (sem ISV); dados em falta
  // e carros antigos (homologação mais chata) sobem a fasquia.
  const difficulty: ImportDifficulty =
    fuel === "eletrico"
      ? "facil"
      : missing >= 2 || year < 2008
        ? "exigente"
        : "media";

  const timeEstimate =
    difficulty === "facil"
      ? "3 a 6 semanas"
      : difficulty === "media"
        ? "4 a 8 semanas"
        : "6 a 12 semanas";

  return {
    priceOriginal: Math.round(i.price),
    currency,
    vehiclePriceEur,
    lines,
    isv: isvRes.total,
    isvEstimated: co2Estimated || displacementEstimated,
    iucAnnual: iucRes.total,
    travelOptional: Math.round(a.travelPerKm * distanceKm * 2),
    totalEur: Math.round(totalEur),
    confidence,
    difficulty,
    timeEstimate,
    assumptionsUsed: {
      co2,
      co2Estimated,
      displacement,
      displacementEstimated,
      norm,
      ageYears: Math.round(ageYears * 10) / 10,
      distanceKm,
    },
  };
}

// ---------------------------------------------------------------------------
// Classificação do negócio face ao mercado português
// ---------------------------------------------------------------------------

export type ImportDealRating = "EXCELLENT" | "GOOD" | "NEUTRAL" | "BAD";

export const DEAL_LABEL: Record<ImportDealRating, string> = {
  EXCELLENT: "Excelente negócio de importação",
  GOOD: "Boa oportunidade",
  NEUTRAL: "Semelhante a Portugal",
  BAD: "Não compensa importar",
};

export const DEAL_STYLE: Record<ImportDealRating, string> = {
  EXCELLENT: "bg-[#1FA37A] text-white",
  GOOD: "bg-[#4BA65A] text-white",
  NEUTRAL: "bg-[#5B6B7B] text-white",
  BAD: "bg-[#C6603B] text-white",
};

export const DIFFICULTY_LABEL: Record<ImportDifficulty, string> = {
  facil: "Fácil",
  media: "Média",
  exigente: "Exigente",
};

export const CONFIDENCE_LABEL: Record<ImportConfidence, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

/**
 * Classifica a importação comparando o custo total legalizado em PT com a
 * mediana do mercado português para o mesmo carro. null = sem dados PT.
 */
export function rateImportDeal(
  totalEur: number | null | undefined,
  ptMedian: number | null | undefined
): { rating: ImportDealRating; savings: number } | null {
  if (totalEur == null || ptMedian == null || ptMedian <= 0) return null;
  const savings = Math.round(ptMedian - totalEur);
  const pct = savings / ptMedian;
  const rating: ImportDealRating =
    pct >= 0.12 || savings >= 3000
      ? "EXCELLENT"
      : pct >= 0.05 || savings >= 1200
        ? "GOOD"
        : pct >= -0.05
          ? "NEUTRAL"
          : "BAD";
  return { rating, savings };
}
