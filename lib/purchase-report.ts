import { prisma } from "@/lib/prisma";
import { calcIUC, type TaxFuel, type Norm } from "@/lib/car-tax";

// Relatório de compra: estimativas de custos anuais (combustível, IUC,
// seguro, manutenção), desvalorização esperada e problemas conhecidos do
// modelo (IA, cacheada por marca+modelo+combustível).
//
// Tudo isto são ESTIMATIVAS com pressupostos explícitos — a UI mostra sempre
// os pressupostos e um aviso.

// ---- Pressupostos (ajustáveis) ----
export const ASSUMED_KM_YEAR = 15000;
const PRICE_PER_LITRE: Record<string, number> = {
  gasolina: 1.75,
  diesel: 1.6,
  gpl: 0.85,
};
const PRICE_PER_KWH = 0.22; // carregamento maioritariamente em casa

type FuelKind =
  "gasolina" | "diesel" | "eletrico" | "hibrido" | "plugin" | "gpl";

export function normalizeFuel(fuel?: string | null): FuelKind | null {
  const f = (fuel ?? "").toLowerCase();
  if (!f) return null;
  if (f.includes("elé") || f.includes("ele")) return "eletrico";
  if (f.includes("plug")) return "plugin";
  if (f.includes("híb") || f.includes("hib")) return "hibrido";
  if (f.includes("diesel") || f.includes("gasó")) return "diesel";
  if (f.includes("gpl")) return "gpl";
  if (f.includes("gasolina")) return "gasolina";
  return null;
}

export interface CostLine {
  label: string;
  /** valor anual estimado em € (intervalo) */
  low: number;
  high: number;
  note?: string;
}

export interface AnnualCosts {
  lines: CostLine[];
  totalLow: number;
  totalHigh: number;
  kmYear: number;
  assumptions: string[];
}

export interface CostInput {
  fuel?: string | null;
  power?: number | null; // cv
  displacement?: number | null; // cm3
  co2?: number | null; // g/km
  year?: number | null;
  price?: number | null;
}

/** Consumo combinado estimado (L/100km ou kWh/100km para elétricos). */
function estimateConsumption(kind: FuelKind, i: CostInput): number {
  // com CO2 real, converte diretamente (fatores de emissão por litro)
  if (i.co2 != null && i.co2 > 0 && kind !== "eletrico") {
    const factor = kind === "diesel" ? 26.5 : 23.2; // g CO2 por 0.01 L
    return Math.max(3, i.co2 / factor);
  }
  const power = i.power ?? 110;
  switch (kind) {
    case "eletrico":
      return 15 + Math.max(0, power - 150) * 0.015; // kWh/100
    case "diesel":
      return 4.8 + Math.max(0, power - 100) * 0.012;
    case "hibrido":
      return 4.6 + Math.max(0, power - 100) * 0.01;
    case "plugin":
      return 3.0 + Math.max(0, power - 150) * 0.008; // uso misto
    case "gpl":
      return 7.5 + Math.max(0, power - 100) * 0.02;
    default:
      return 6.2 + Math.max(0, power - 100) * 0.018; // gasolina
  }
}

/** Cilindrada estimada quando o anúncio não indica (a partir da potência). */
function estimateDisplacement(kind: FuelKind, power?: number | null): number {
  const p = power ?? 110;
  const cc = kind === "diesel" ? p * 13 : p * 11;
  return Math.min(3000, Math.max(900, Math.round(cc)));
}

export function estimateAnnualCosts(i: CostInput): AnnualCosts | null {
  const kind = normalizeFuel(i.fuel);
  if (!kind) return null;

  const assumptions: string[] = [
    `${ASSUMED_KM_YEAR.toLocaleString("pt-PT")} km/ano`,
  ];
  const lines: CostLine[] = [];

  // --- combustível / energia ---
  const cons = estimateConsumption(kind, i);
  if (kind === "eletrico") {
    const base = (ASSUMED_KM_YEAR / 100) * cons * PRICE_PER_KWH;
    lines.push({
      label: "Energia (carregamento)",
      low: Math.round(base * 0.85),
      high: Math.round(base * 1.5), // carregamento rápido encarece
      note: `~${cons.toFixed(1)} kWh/100 km`,
    });
    assumptions.push(`eletricidade a ${PRICE_PER_KWH.toFixed(2)} €/kWh (casa)`);
  } else {
    const litre =
      PRICE_PER_LITRE[
        kind === "gpl" ? "gpl" : kind === "diesel" ? "diesel" : "gasolina"
      ];
    const base = (ASSUMED_KM_YEAR / 100) * cons * litre;
    lines.push({
      label: "Combustível",
      low: Math.round(base * 0.9),
      high: Math.round(base * 1.15),
      note: `~${cons.toFixed(1)} L/100 km`,
    });
    assumptions.push(`combustível a ${litre.toFixed(2)} €/L`);
  }

  // --- IUC ---
  if (i.year != null && i.year >= 2008) {
    // categoria B (pós-Jul/2007). Antes disso o IUC é por cilindrada/idade
    // (categoria A, geralmente baixo) — não estimamos.
    const taxFuel: TaxFuel =
      kind === "eletrico"
        ? "eletrico"
        : kind === "plugin"
          ? "plugin"
          : kind === "hibrido"
            ? "hibrido"
            : kind === "diesel"
              ? "diesel"
              : "gasolina";
    const norm: Norm = i.year >= 2020 ? "WLTP" : "NEDC";
    const cyl =
      i.displacement != null && i.displacement >= 600 && i.displacement <= 9000
        ? i.displacement
        : estimateDisplacement(kind, i.power);
    const co2 =
      i.co2 != null && i.co2 > 0
        ? i.co2
        : kind === "eletrico"
          ? 0
          : Math.round(
              estimateConsumption(kind, i) * (kind === "diesel" ? 26.5 : 23.2)
            );
    const iuc = calcIUC({
      cylinder: cyl,
      co2,
      fuel: taxFuel,
      norm,
      year: i.year,
    });
    lines.push({
      label: "IUC",
      low: iuc.total,
      high: iuc.total,
      note: iuc.exempt
        ? "isento"
        : i.co2 == null || i.displacement == null
          ? "estimado (CO₂/cilindrada aproximados)"
          : undefined,
    });
  } else if (i.year != null && i.year < 2008) {
    lines.push({
      label: "IUC",
      low: 20,
      high: 65,
      note: "categoria A (matrícula pré-Jul/2007) — tipicamente baixo",
    });
  }

  // --- seguro (responsabilidade civil, condutor típico) ---
  const power = i.power ?? 110;
  const insBase = 160 + power * 0.9;
  lines.push({
    label: "Seguro",
    low: Math.round(insBase * 0.8),
    high: Math.round(insBase * 1.6),
    note: "terceiros; danos próprios pode duplicar",
  });

  // --- manutenção (revisões + desgaste) ---
  const age =
    i.year != null ? Math.max(0, new Date().getFullYear() - i.year) : 8;
  let maintBase = age < 5 ? 280 : age < 10 ? 430 : age < 15 ? 580 : 720;
  if (kind === "eletrico") maintBase *= 0.6; // menos peças de desgaste
  lines.push({
    label: "Manutenção",
    low: Math.round(maintBase * 0.7),
    high: Math.round(maintBase * 1.4),
    note: `carro com ~${age} anos`,
  });

  const totalLow = lines.reduce((s, l) => s + l.low, 0);
  const totalHigh = lines.reduce((s, l) => s + l.high, 0);
  return { lines, totalLow, totalHigh, kmYear: ASSUMED_KM_YEAR, assumptions };
}

// ---- Desvalorização esperada ----

export interface DepreciationEstimate {
  in3Years: number;
  in5Years: number;
  ratePerYear: number; // taxa média usada
}

/**
 * Valor esperado daqui a 3/5 anos. Carros usados desvalorizam mais devagar
 * quanto mais velhos são; taxas médias do mercado europeu de usados.
 */
export function estimateDepreciation(
  price?: number | null,
  year?: number | null
): DepreciationEstimate | null {
  if (price == null || price <= 0) return null;
  const age = year != null ? Math.max(0, new Date().getFullYear() - year) : 8;
  const rate = age < 3 ? 0.13 : age < 8 ? 0.09 : age < 13 ? 0.06 : 0.04;
  return {
    in3Years: Math.round((price * Math.pow(1 - rate, 3)) / 50) * 50,
    in5Years: Math.round((price * Math.pow(1 - rate, 5)) / 50) * 50,
    ratePerYear: rate,
  };
}

// ---- Problemas conhecidos do modelo (IA, cacheado) ----

export interface ModelReportContent {
  summary: string; // 1-2 frases sobre a fiabilidade geral
  issues: string[]; // problemas conhecidos (motor/caixa/eletrónica)
  checks: string[]; // o que verificar antes de comprar
}

const REPORT_TTL_DAYS = 180;

const reportKey = (brand: string, model: string, fuel?: string | null) =>
  [
    brand.trim().toLowerCase(),
    model.trim().toLowerCase(),
    normalizeFuel(fuel) ?? "",
  ].join("|");

const MODEL_REPORT_SYSTEM = `És um mecânico experiente e consultor de compra de carros usados em Portugal.
Recebes marca, modelo e combustível. Responde com os problemas conhecidos TÍPICOS dessa combinação (motor, caixa, eletrónica, corrosão) e o que verificar antes de comprar.

Regras:
- Baseia-te apenas em problemas amplamente conhecidos/documentados para esse modelo; se não conheceres problemas específicos, di-lo e dá conselhos gerais para o tipo de motorização.
- Português de Portugal, direto, sem alarmismo.
- "issues": 3 a 6 itens curtos (1 frase cada). "checks": 3 a 6 itens curtos e acionáveis.
- "summary": 1-2 frases sobre a reputação de fiabilidade.

Responde APENAS com JSON válido:
{"summary": string, "issues": string[], "checks": string[]}`;

/**
 * Relatório de problemas conhecidos por marca+modelo+combustível.
 * Cacheado na BD (ModelReport) — 1 chamada de IA por modelo a cada 180 dias,
 * partilhada por todos os anúncios. Null sem OPENAI_API_KEY ou em falha.
 */
export async function getModelReport(
  brand?: string | null,
  model?: string | null,
  fuel?: string | null
): Promise<ModelReportContent | null> {
  const b = brand?.trim();
  const m = model?.trim();
  if (!b || !m) return null;
  const key = reportKey(b, m, fuel);

  const cached = await prisma.modelReport.findUnique({ where: { key } });
  if (cached) {
    const ageDays = (Date.now() - cached.updatedAt.getTime()) / 86_400_000;
    if (ageDays < REPORT_TTL_DAYS) {
      try {
        return JSON.parse(cached.content) as ModelReportContent;
      } catch {
        /* regenera */
      }
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: MODEL_REPORT_SYSTEM },
          {
            role: "user",
            content: `Marca: ${b}\nModelo: ${m}${fuel ? `\nCombustível: ${fuel}` : ""}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 600,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const content: ModelReportContent = {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      issues: Array.isArray(parsed.issues)
        ? parsed.issues
            .filter((x: unknown) => typeof x === "string")
            .slice(0, 6)
        : [],
      checks: Array.isArray(parsed.checks)
        ? parsed.checks
            .filter((x: unknown) => typeof x === "string")
            .slice(0, 6)
        : [],
    };
    if (!content.summary && !content.issues.length) return null;

    await prisma.modelReport.upsert({
      where: { key },
      update: { content: JSON.stringify(content) },
      create: {
        key,
        brand: b,
        model: m,
        fuel: fuel ?? null,
        content: JSON.stringify(content),
      },
    });
    return content;
  } catch (err) {
    console.error("[model-report]", err);
    return null;
  }
}
