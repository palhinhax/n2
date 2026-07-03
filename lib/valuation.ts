import { prisma } from "@/lib/prisma";
import { marketStats, type MarketStats } from "@/lib/price-intel";

/**
 * Avaliação de carro com IA: junta estatísticas de mercado + anúncios
 * comparáveis reais e pede ao modelo um intervalo de valor + explicação.
 * Sem OPENAI_API_KEY (ou em falha), devolve só os dados de mercado.
 */

export interface ValuationInput {
  marca: string;
  modelo: string;
  ano?: number | null;
  km?: number | null;
  fuel?: string | null;
  caixa?: string | null;
  versao?: string | null;
  /** estado, extras, historial — texto livre do utilizador */
  notas?: string | null;
}

export interface ComparableCar {
  id: string;
  title: string;
  price: number;
  year: number | null;
  km: number | null;
  fuel: string | null;
  gearbox: string | null;
  url: string; // link interno /carros/externo/{id}
}

export interface AiValuation {
  low: number;
  high: number;
  recommended: number;
  confidence: "alta" | "media" | "baixa";
  text: string;
}

export interface ValuationResult {
  stats: MarketStats | null;
  similar: ComparableCar[];
  ai: AiValuation | null;
}

/** Anúncios comparáveis (mesma marca/modelo, ano próximo), ordenados por semelhança. */
export async function findComparables(
  input: ValuationInput,
  limit = 12
): Promise<ComparableCar[]> {
  const rows = await prisma.scrapedListing.findMany({
    where: {
      active: true,
      isDuplicate: false,
      price: { gt: 300 },
      brand: { equals: input.marca, mode: "insensitive" },
      model: { contains: input.modelo, mode: "insensitive" },
      ...(input.ano
        ? { year: { gte: input.ano - 3, lte: input.ano + 3 } }
        : {}),
      ...(input.fuel
        ? { fuel: { contains: input.fuel.slice(0, 6), mode: "insensitive" } }
        : {}),
    },
    select: {
      id: true,
      title: true,
      price: true,
      year: true,
      km: true,
      fuel: true,
      gearbox: true,
    },
    take: 200,
  });

  // pontua por proximidade de ano e km
  const scored = rows
    .filter((r) => r.price != null)
    .map((r) => {
      let score = 0;
      if (input.ano && r.year) score += Math.abs(r.year - input.ano) * 2;
      if (input.km != null && r.km != null)
        score += Math.abs(r.km - input.km) / 20000;
      return { r, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);

  return scored.map(({ r }) => ({
    id: r.id,
    title: r.title,
    price: r.price as number,
    year: r.year,
    km: r.km,
    fuel: r.fuel,
    gearbox: r.gearbox,
    url: `/carros/externo/${r.id}`,
  }));
}

const eur = (n: number) => n.toLocaleString("pt-PT") + " €";

function buildPrompt(
  input: ValuationInput,
  stats: MarketStats | null,
  similar: ComparableCar[]
): string {
  const carLines = [
    `Marca/Modelo: ${input.marca} ${input.modelo}`,
    input.versao ? `Versão: ${input.versao}` : "",
    input.ano ? `Ano: ${input.ano}` : "Ano: não indicado",
    input.km != null
      ? `Quilómetros: ${input.km.toLocaleString("pt-PT")} km`
      : "Quilómetros: não indicados",
    input.fuel ? `Combustível: ${input.fuel}` : "",
    input.caixa ? `Caixa: ${input.caixa}` : "",
    input.notas
      ? `Notas do dono (estado/extras): ${input.notas.slice(0, 500)}`
      : "",
  ].filter(Boolean);

  const statLines = stats
    ? [
        `Mediana: ${eur(stats.median)}`,
        `Intervalo típico (P25–P75): ${eur(stats.p25)} – ${eur(stats.p75)}`,
        `Amostra: ${stats.count} anúncios ativos`,
      ]
    : ["Sem amostra estatística suficiente."];

  const compLines = similar.length
    ? similar.map(
        (s) =>
          `- ${s.title} · ${s.year ?? "?"} · ${
            s.km != null ? s.km.toLocaleString("pt-PT") + " km" : "? km"
          } · ${s.fuel ?? "?"} · ${eur(s.price)}`
      )
    : ["(nenhum anúncio comparável encontrado)"];

  return [
    "CARRO A AVALIAR:",
    ...carLines,
    "",
    "ESTATÍSTICAS DE MERCADO (anúncios ativos em Portugal, no Nacional 2):",
    ...statLines,
    "",
    "ANÚNCIOS COMPARÁVEIS (reais, ativos agora):",
    ...compLines,
  ].join("\n");
}

const VALUATION_SYSTEM = `És um avaliador de carros usados em Portugal do site Nacional 2.
Recebes os dados de um carro, estatísticas de mercado e anúncios comparáveis reais.

Regras:
- Baseia o intervalo nos comparáveis e na mediana; ajusta por km (acima/abaixo do típico para o ano), caixa, versão e notas do dono.
- Preços de ANÚNCIO (pedido), não de venda final — menciona que há margem de negociação.
- Se a amostra for pequena (<10) ou os comparáveis divergirem muito do carro, baixa a confiança.
- Sê honesto: se faltar informação (ano/km), diz que a estimativa é mais incerta.
- O texto: 2 a 4 frases, em português de Portugal, tom próximo e direto ("o teu carro"). Sem listas.

Responde APENAS com JSON válido:
{"low": number, "high": number, "recommended": number, "confidence": "alta"|"media"|"baixa", "text": string}`;

/** Chama o modelo e devolve a avaliação estruturada (null em falha/sem key). */
export async function aiValuation(
  input: ValuationInput,
  stats: MarketStats | null,
  similar: ComparableCar[]
): Promise<AiValuation | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  // sem dados nenhuns, não vale a pena "adivinhar" com autoridade
  if (!stats && similar.length === 0) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: VALUATION_SYSTEM },
          { role: "user", content: buildPrompt(input, stats, similar) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 400,
      }),
    });
    if (!res.ok) {
      console.error("[avaliar] OpenAI error", res.status);
      return null;
    }
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");

    const low = Math.round(Number(parsed.low));
    const high = Math.round(Number(parsed.high));
    const recommended = Math.round(Number(parsed.recommended));
    const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
    const confidence = ["alta", "media", "baixa"].includes(parsed.confidence)
      ? parsed.confidence
      : "media";

    // sanidade: números plausíveis e coerentes entre si e com o mercado
    if (
      !Number.isFinite(low) ||
      !Number.isFinite(high) ||
      !Number.isFinite(recommended) ||
      low < 100 ||
      high <= low ||
      recommended < low ||
      recommended > high ||
      !text
    )
      return null;
    if (stats && (high < stats.p25 * 0.3 || low > stats.p75 * 3)) return null;

    return { low, high, recommended, confidence, text };
  } catch (err) {
    console.error("[avaliar] ai error", err);
    return null;
  }
}

/** Avaliação completa: stats + comparáveis + IA (com degradação graciosa). */
export async function valuate(input: ValuationInput): Promise<ValuationResult> {
  const [stats, similar] = await Promise.all([
    marketStats({ brand: input.marca, model: input.modelo, year: input.ano }),
    findComparables(input),
  ]);
  const ai = await aiValuation(input, stats, similar);
  return { stats, similar, ai };
}
