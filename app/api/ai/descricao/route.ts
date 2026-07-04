import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consumeQuota } from "@/lib/ai-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * IA para o vendedor: gera a descrição do anúncio a partir dos dados do
 * carro. Requer sessão; limite diário por utilizador (kind "descrever").
 */

const SYSTEM = `Escreves descrições de anúncios de carros usados para o site Nacional 2 (Portugal).
Recebes os dados do carro e notas soltas do vendedor.

Regras:
- Português de Portugal, 1.ª pessoa (é o vendedor a falar), tom honesto e próximo, sem exageros de marketing ("oportunidade única", "imperdível") nem emojis.
- 60 a 120 palavras, em 1-2 parágrafos. Sem listas, sem títulos.
- Usa apenas a informação fornecida — NUNCA inventes extras, historial ou estado que não te foi dito.
- Se houver notas do vendedor, integra-as com naturalidade.
- Termina com uma frase simples a convidar ao contacto ou a ofertas.

Responde apenas com o texto da descrição, sem aspas.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });

  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json(
      { error: "Funcionalidade indisponível de momento." },
      { status: 503 }
    );

  const quota = await consumeQuota(session.user.id, "descrever");
  if (!quota.allowed)
    return NextResponse.json(
      { error: `Atingiste o limite diário (${quota.limit} descrições).` },
      { status: 429 }
    );

  const b = await req.json().catch(() => ({}));
  const bits = [
    b.marca && b.modelo ? `Carro: ${b.marca} ${b.modelo}` : null,
    b.versao ? `Versão: ${b.versao}` : null,
    b.ano ? `Ano: ${b.ano}` : null,
    b.km ? `Quilómetros: ${Number(b.km).toLocaleString("pt-PT")} km` : null,
    b.fuel ? `Combustível: ${b.fuel}` : null,
    b.caixa ? `Caixa: ${b.caixa}` : null,
    b.power ? `Potência: ${b.power} cv` : null,
    b.evRange ? `Autonomia WLTP: ${b.evRange} km` : null,
    b.distrito ? `Distrito: ${b.distrito}` : null,
    b.negociavel != null
      ? `Aceita ofertas: ${b.negociavel ? "sim" : "não"}`
      : null,
    b.notas
      ? `Notas do vendedor (estado, extras, historial): ${String(b.notas).slice(0, 600)}`
      : null,
  ].filter(Boolean);

  if (bits.length < 2)
    return NextResponse.json(
      { error: "Preenche pelo menos a marca e o modelo." },
      { status: 400 }
    );

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: bits.join("\n") },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const text: string = (data.choices?.[0]?.message?.content ?? "").trim();
    if (!text)
      return NextResponse.json(
        { error: "Não foi possível gerar a descrição." },
        { status: 502 }
      );
    return NextResponse.json({ text, remaining: quota.remaining });
  } catch (err) {
    console.error("[ai/descricao]", err);
    return NextResponse.json(
      { error: "Não foi possível gerar a descrição. Tenta de novo." },
      { status: 502 }
    );
  }
}
