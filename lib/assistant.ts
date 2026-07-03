import { prisma } from "@/lib/prisma";
import { fetchListingPage, type ListingQuery } from "@/lib/car-listing";
import { marketStats, ratePrice, RATING_LABEL } from "@/lib/price-intel";
import { absolute } from "@/lib/seo";

const eur = (n?: number | null) =>
  n == null ? "sob consulta" : n.toLocaleString("pt-PT") + " €";

/** Descrição estruturada do carro que o utilizador está a ver, para o system prompt. */
export async function buildCarContext(
  kind: "car" | "listing",
  id: string
): Promise<{ title: string; text: string } | null> {
  if (kind === "car") {
    const c = await prisma.car.findUnique({
      where: { id },
      include: { brand: true, model: true },
    });
    if (!c) return null;
    const stats = await marketStats({
      brand: c.brand.name,
      model: c.model.name,
      year: c.year,
    });
    const rating = ratePrice(c.price, stats);
    const title = `${c.brand.name} ${c.model.name}${c.version ? " " + c.version : ""}`;
    const lines = [
      `TIPO: anúncio do próprio Nacional 2 (particular/stand), moderado pela equipa.`,
      `CARRO: ${title}`,
      `Ano: ${c.year} · Quilómetros: ${c.km?.toLocaleString("pt-PT") ?? "?"} km`,
      `Combustível: ${c.fuel} · Caixa: ${c.gearbox}${c.power ? ` · ${c.power} cv` : ""}`,
      c.evRange ? `Autonomia elétrica (WLTP): ${c.evRange} km` : "",
      `Preço: ${eur(c.price)}${c.negotiable ? " (aceita ofertas)" : " (preço fixo)"}`,
      `Localização: ${c.district ?? "não indicada"}`,
      c.description
        ? `Descrição do vendedor: ${c.description.slice(0, 600)}`
        : "",
      marketLine(stats, rating),
    ];
    return { title, text: lines.filter(Boolean).join("\n") };
  }

  const l = await prisma.scrapedListing.findUnique({ where: { id } });
  if (!l) return null;
  const stats = await marketStats({
    brand: l.brand,
    model: l.model,
    year: l.year,
  });
  const rating = ratePrice(l.price, stats);
  const lines = [
    `TIPO: anúncio EXTERNO agregado (origem: ${l.source}). O utilizador deve confirmar os detalhes e contactar no anúncio original.`,
    `CARRO: ${l.title}`,
    `Marca: ${l.brand ?? "?"} · Modelo: ${l.model ?? "?"}`,
    `Ano: ${l.year ?? "?"} · Quilómetros: ${l.km?.toLocaleString("pt-PT") ?? "?"} km`,
    `Combustível: ${l.fuel ?? "?"} · Caixa: ${l.gearbox ?? "?"}${l.power ? ` · ${l.power} cv` : ""}`,
    l.displacement ? `Cilindrada: ${l.displacement} cm³` : "",
    `Preço: ${eur(l.price)}`,
    `Localização: ${l.location ?? "não indicada"}`,
    l.previousPrice && l.price && l.previousPrice > l.price
      ? `Baixou de ${eur(l.previousPrice)} para ${eur(l.price)}.`
      : "",
    l.description ? `Descrição: ${l.description.slice(0, 600)}` : "",
    marketLine(stats, rating),
  ];
  return { title: l.title, text: lines.filter(Boolean).join("\n") };
}

function marketLine(
  stats: Awaited<ReturnType<typeof marketStats>>,
  rating: ReturnType<typeof ratePrice>
): string {
  if (!stats)
    return "DADOS DE MERCADO: não há amostra suficiente de carros semelhantes para comparar o preço.";
  return (
    `DADOS DE MERCADO (carros semelhantes no Nacional 2): ` +
    `mediana ${eur(stats.median)}, típico entre ${eur(stats.p25)} e ${eur(stats.p75)}, ` +
    `com base em ${stats.count} anúncios.` +
    (rating ? ` Classificação deste preço: ${RATING_LABEL[rating]}.` : "")
  );
}

/** Ferramenta: pesquisa carros no inventário do Nacional 2. */
export async function searchListings(args: any): Promise<string> {
  const q: ListingQuery = {
    marca: args.marca,
    modelo: args.modelo,
    precoMax: args.precoMax != null ? String(args.precoMax) : undefined,
    anoMin: args.anoMin != null ? String(args.anoMin) : undefined,
    kmMax: args.kmMax != null ? String(args.kmMax) : undefined,
    fuel: args.combustivel,
    distrito: args.distrito,
    ordenar: args.ordenar,
  };
  const page = await fetchListingPage(q, 0, 8);
  const results = page.items.map((it) => {
    const d = it.data;
    const isCar = it.kind === "car";
    return {
      titulo: isCar ? `${d.brand?.name} ${d.model?.name}` : d.title,
      ano: d.year ?? null,
      km: d.km ?? null,
      preco: d.price ?? null,
      combustivel: d.fuel ?? null,
      caixa: d.gearbox ?? null,
      potencia_cv: d.power ?? null,
      localizacao: isCar ? d.district : d.location,
      origem: isCar ? "Nacional 2" : d.source,
      classificacao_preco: d._rating ?? null,
      url: absolute(isCar ? `/carros/${it.id}` : `/carros/externo/${it.id}`),
    };
  });
  return JSON.stringify({
    total_aproximado: results.length,
    resultados: results,
  });
}

/** Ferramenta: estatísticas de mercado para marca+modelo+ano. */
export async function getMarketStats(args: any): Promise<string> {
  const stats = await marketStats({
    brand: args.marca,
    model: args.modelo,
    year: args.ano != null ? Number(args.ano) : undefined,
  });
  if (!stats)
    return JSON.stringify({
      disponivel: false,
      mensagem: "Sem amostra suficiente para este modelo/ano.",
    });
  return JSON.stringify({ disponivel: true, ...stats });
}

export const ASSISTANT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_listings",
      description:
        "Pesquisa carros à venda no Nacional 2 (anúncios do site + agregados de OLX, Standvirtual, etc.). Usa para encontrar alternativas, comparar, ou responder a pedidos do utilizador.",
      parameters: {
        type: "object",
        properties: {
          marca: { type: "string", description: "Marca, ex.: BMW" },
          modelo: { type: "string", description: "Modelo, ex.: Série 1" },
          precoMax: { type: "number", description: "Preço máximo em euros" },
          anoMin: { type: "number", description: "Ano mínimo" },
          kmMax: { type: "number", description: "Quilómetros máximos" },
          combustivel: {
            type: "string",
            description:
              "Gasolina, Diesel, Híbrido, Híbrido Plug-In, Elétrico ou GPL",
          },
          distrito: { type: "string", description: "Distrito, ex.: Lisboa" },
          ordenar: {
            type: "string",
            enum: ["recentes", "precoAsc", "precoDesc", "km"],
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_market_stats",
      description:
        "Estatísticas de preço de mercado (mediana, p25, p75) para um modelo, com base no inventário do Nacional 2.",
      parameters: {
        type: "object",
        properties: {
          marca: { type: "string" },
          modelo: { type: "string" },
          ano: { type: "number" },
        },
        required: ["marca", "modelo"],
      },
    },
  },
];

export async function runTool(name: string, args: any): Promise<string> {
  if (name === "search_listings") return searchListings(args);
  if (name === "get_market_stats") return getMarketStats(args);
  return JSON.stringify({ erro: "ferramenta desconhecida" });
}

export const ASSISTANT_SYSTEM = `És o assistente de IA do Nacional 2, dentro da página de um carro usado.
O utilizador está a ver um carro específico. Usa os dados do anúncio fornecidos para ajudar o utilizador a decidir se o carro lhe serve, se o preço é justo, que riscos verificar, que perguntas fazer ao vendedor, e como compara com carros semelhantes.
Responde SEMPRE em português de Portugal.
Sê prático, honesto e conciso. Não inventes dados em falta. Se algo for desconhecido, diz que não sabes.
Quando o utilizador perguntar "o que achas?", responde com:
1. Veredicto geral
2. Análise do preço
3. Análise de quilómetros/ano
4. Melhor caso de uso
5. Principais pontos positivos
6. Principais coisas a verificar
7. Perguntas a fazer ao vendedor
8. Recomendação: avançar, negociar, comparar, ou evitar até ter mais dados
Nunca garantas que o carro é bom. Recomenda sempre inspeção, test drive e verificação de documentos antes de comprar.
Se houver dados de comparação de mercado, usa-os. Se não houver, diz que não há dados de mercado suficientes.
Se o anúncio for externo, lembra o utilizador de confirmar os detalhes no anúncio/vendedor original.
Usa as ferramentas de pesquisa quando precisares de encontrar alternativas ou comparar preços no site. Quando listares carros, inclui o essencial (modelo, ano, km, preço) e sê breve.`;

export const ASSISTANT_SYSTEM_SITE = `És o assistente de IA do Nacional 2, um marketplace português de carros usados 100% grátis (sem comissões).
Ajudas quem procura carro a encontrar o melhor negócio e explicas tudo o que o site oferece.
Responde SEMPRE em português de Portugal. Sê prático, honesto e conciso. Não inventes dados; se não souberes, diz.

O que o Nacional 2 tem (podes orientar o utilizador para estas funcionalidades):
- Pesquisa de milhares de carros usados (anúncios do site + agregados de OLX, Standvirtual, Pisca Pisca, Auto SAPO). Usa a ferramenta search_listings para encontrar carros reais.
- Cada anúncio mostra se o preço está abaixo, dentro ou acima da mediana de mercado (usa get_market_stats para dados).
- Comparador de carros (/comparar), favoritos com alerta de descida de preço, e pesquisas guardadas com alertas (/pesquisas).
- Garagem digital com lembretes de IPO, seguro, IUC e manutenção (/garagem).
- Avaliar carro: "Quanto vale o meu carro?" (/avaliar).
- Calculadora de ISV e IUC e custo de importação (/calcular-isv).
- Simulador de financiamento em cada anúncio.
- Vender é grátis, sem comissões (/vender e /garagem/novo).
- Páginas por marca, modelo, distrito e preço (ex.: /marcas/bmw, /carros-usados/lisboa, /carros-ate/10000).
- Dicas de compra segura (/seguranca).

Quando o utilizador procura um carro, faz perguntas curtas se faltar informação (orçamento, tipo, combustível, caixa, distrito) e usa search_listings para dar exemplos concretos com preço, ano e km. Inclui os links dos carros quando os tiveres.
Recomenda sempre inspeção, test drive e verificação de documentos antes de comprar. Nunca garantas que um carro é bom.`;
