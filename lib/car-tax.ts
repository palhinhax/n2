// Cálculo de ISV (Imposto Sobre Veículos) e IUC (Imposto Único de Circulação)
// para ligeiros de passageiros — tabelas de 2026 (iguais a 2024/2025).
// Fonte: Código do ISV/IUC. Valores são ESTIMATIVAS; confirmar no simulador
// oficial das Finanças. Não cobre isenções especiais nem categoria A (pré-Jul/2007).

export type TaxFuel = "gasolina" | "diesel" | "hibrido" | "plugin" | "eletrico";
export type Norm = "WLTP" | "NEDC";

type Bracket = { max: number; rate: number; abate: number };

// ---- ISV: componente cilindrada (Tabela A) ----
const ISV_CYL: Bracket[] = [
  { max: 1000, rate: 1.09, abate: 849.03 },
  { max: 1250, rate: 1.18, abate: 850.69 },
  { max: Infinity, rate: 5.61, abate: 6194.88 },
];

// ---- ISV: componente ambiental (CO2) ----
const ISV_CO2: Record<"gasolina" | "diesel", Record<Norm, Bracket[]>> = {
  gasolina: {
    WLTP: [
      { max: 110, rate: 0.44, abate: 43.02 },
      { max: 115, rate: 1.1, abate: 115.8 },
      { max: 120, rate: 1.38, abate: 147.79 },
      { max: 130, rate: 5.27, abate: 619.17 },
      { max: 145, rate: 6.38, abate: 762.73 },
      { max: 175, rate: 41.54, abate: 5819.56 },
      { max: 195, rate: 51.38, abate: 7247.39 },
      { max: 235, rate: 193.01, abate: 34190.52 },
      { max: Infinity, rate: 233.81, abate: 41910.96 },
    ],
    NEDC: [
      { max: 99, rate: 4.62, abate: 427.0 },
      { max: 115, rate: 8.09, abate: 750.99 },
      { max: 145, rate: 52.56, abate: 5903.94 },
      { max: 175, rate: 61.24, abate: 7140.17 },
      { max: 195, rate: 155.97, abate: 23627.27 },
      { max: Infinity, rate: 205.65, abate: 33390.12 },
    ],
  },
  diesel: {
    WLTP: [
      { max: 110, rate: 1.72, abate: 11.5 },
      { max: 120, rate: 18.96, abate: 1906.19 },
      { max: 140, rate: 65.04, abate: 7360.85 },
      { max: 150, rate: 127.4, abate: 16080.57 },
      { max: 160, rate: 160.81, abate: 21176.06 },
      { max: 170, rate: 221.69, abate: 29227.38 },
      { max: 190, rate: 274.08, abate: 36987.98 },
      { max: Infinity, rate: 282.35, abate: 38271.32 },
    ],
    NEDC: [
      { max: 79, rate: 5.78, abate: 439.04 },
      { max: 95, rate: 23.45, abate: 1848.58 },
      { max: 120, rate: 79.22, abate: 7195.63 },
      { max: 140, rate: 175.73, abate: 18924.92 },
      { max: 160, rate: 195.43, abate: 21720.92 },
      { max: Infinity, rate: 268.42, abate: 33447.9 },
    ],
  },
};

function bracketValue(brackets: Bracket[], value: number): number {
  const b =
    brackets.find((x) => value <= x.max) ?? brackets[brackets.length - 1];
  return Math.max(0, value * b.rate - b.abate);
}

// Redução por idade (importados usados da UE/EEE) — aplica-se ao total do ISV.
export function isvAgeReduction(ageYears: number): number {
  if (ageYears <= 1) return 0.1;
  if (ageYears <= 2) return 0.2;
  if (ageYears <= 3) return 0.28;
  if (ageYears <= 4) return 0.35;
  if (ageYears <= 5) return 0.43;
  if (ageYears <= 6) return 0.52;
  if (ageYears <= 7) return 0.6;
  if (ageYears <= 8) return 0.65;
  if (ageYears <= 9) return 0.7;
  if (ageYears <= 10) return 0.75;
  return 0.8;
}

export interface IsvInput {
  cylinder: number; // cm3
  co2: number; // g/km
  fuel: TaxFuel;
  norm: Norm;
  ageYears: number; // idade desde a 1ª matrícula
  importedUsedEU: boolean; // usado importado da UE (aplica desconto de idade)
  particleFilter?: boolean; // diesel com filtro de partículas (agravamento 500€)
}

export interface IsvResult {
  cylinderComponent: number;
  environmentalComponent: number;
  particleSurcharge: number;
  benefitLabel?: string;
  reductionPct: number; // desconto por idade
  total: number;
  exempt: boolean;
}

export function calcISV(i: IsvInput): IsvResult {
  if (i.fuel === "eletrico") {
    return {
      cylinderComponent: 0,
      environmentalComponent: 0,
      particleSurcharge: 0,
      reductionPct: 0,
      total: 0,
      exempt: true,
    };
  }

  const baseFuel: "gasolina" | "diesel" =
    i.fuel === "diesel" ? "diesel" : "gasolina";

  const cyl = bracketValue(ISV_CYL, i.cylinder);
  const env = bracketValue(ISV_CO2[baseFuel][i.norm], i.co2);
  const particle =
    baseFuel === "diesel" && i.particleFilter !== false ? 500 : 0;

  let subtotal = cyl + env + particle;

  // benefícios híbrido / plug-in (percentagem de ISV a pagar)
  let benefitLabel: string | undefined;
  if (i.fuel === "hibrido") {
    subtotal *= 0.6;
    benefitLabel =
      "Híbrido: desconto 40% (requisitos: autonomia ≥50km, CO₂ <50g/km)";
  } else if (i.fuel === "plugin") {
    subtotal *= 0.25;
    benefitLabel =
      "Híbrido plug-in: desconto 75% (requisitos: autonomia ≥50km, CO₂ <50g/km)";
  }

  const reductionPct = i.importedUsedEU ? isvAgeReduction(i.ageYears) : 0;
  const total = Math.max(0, subtotal * (1 - reductionPct));

  return {
    cylinderComponent: Math.round(cyl),
    environmentalComponent: Math.round(env),
    particleSurcharge: particle,
    benefitLabel,
    reductionPct,
    total: Math.round(total),
    exempt: false,
  };
}

// ---- IUC categoria B (1ª matrícula a partir de Julho/2007) ----
function iucCylinder(cyl: number): number {
  if (cyl <= 1250) return 31.77;
  if (cyl <= 1750) return 63.74;
  if (cyl <= 2500) return 127.35;
  return 435.84;
}
function iucCo2(co2: number, norm: Norm): { taxa: number; adicional: number } {
  const t =
    norm === "WLTP"
      ? co2 <= 140
        ? [65.15, 0]
        : co2 <= 205
          ? [97.63, 0]
          : co2 <= 260
            ? [212.04, 31.77]
            : [363.25, 63.74]
      : co2 <= 120
        ? [65.15, 0]
        : co2 <= 180
          ? [97.63, 0]
          : co2 <= 250
            ? [212.04, 31.77]
            : [363.25, 63.74];
  return { taxa: t[0], adicional: t[1] };
}
function iucCoef(year: number): number {
  if (year <= 2007) return 1.0;
  if (year === 2008) return 1.05;
  if (year === 2009) return 1.1;
  return 1.15;
}
function iucDieselAdd(cyl: number): number {
  if (cyl <= 1250) return 5.02;
  if (cyl <= 1750) return 10.07;
  if (cyl <= 2500) return 20.12;
  return 68.85;
}

export interface IucInput {
  cylinder: number;
  co2: number;
  fuel: TaxFuel;
  norm: Norm;
  year: number; // ano da 1ª matrícula
}
export interface IucResult {
  total: number;
  exempt: boolean;
}

export function calcIUC(i: IucInput): IucResult {
  if (i.fuel === "eletrico") return { total: 0, exempt: true };
  const cyl = iucCylinder(i.cylinder);
  const { taxa, adicional } = iucCo2(i.co2, i.norm);
  const coef = iucCoef(i.year);
  let total = (cyl + taxa + adicional) * coef;
  if (i.fuel === "diesel") total += iucDieselAdd(i.cylinder);
  // isenção quando inferior a 10€
  if (total < 10) return { total: 0, exempt: true };
  return { total: Math.round(total), exempt: false };
}

// Custos típicos de legalização/importação (estimativa, editável na UI).
export const IMPORT_FEES = {
  inspecaoB: 55, // inspeção tipo B (importados)
  homologacao: 100, // Modelo 9 / homologação IMT
  matricula: 65, // taxa de atribuição de matrícula
  chapas: 40, // chapas de matrícula
};
export const IMPORT_FEES_TOTAL =
  IMPORT_FEES.inspecaoB +
  IMPORT_FEES.homologacao +
  IMPORT_FEES.matricula +
  IMPORT_FEES.chapas;
