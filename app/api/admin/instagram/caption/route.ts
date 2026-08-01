import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  loadSubject,
  buildCaption,
  buildHashtags,
  IG_CAPTION_MAX,
  type IgKind,
} from "@/lib/instagram";
import { fmtEur } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SYSTEM = `Escreves legendas de Instagram para o Nacional 2, um marketplace português de carros usados (anunciar é grátis, sem comissões).

Regras:
- Português de Portugal, tom próximo e direto, sem exageros de vendedor ("oportunidade única", "imperdível").
- 2 a 4 linhas curtas. No máximo 2 emojis no total.
- Usa apenas os dados fornecidos — nunca inventes estado, historial ou extras.
- Não incluas hashtags (são acrescentadas depois) nem links.
- Acaba a convidar a ver o anúncio no Nacional 2 (link na bio).

Responde só com o texto da legenda.`;

/**
 * Gera uma legenda para o post. Sem OPENAI_API_KEY (ou se a IA falhar)
 * devolve a legenda por omissão — o painel funciona na mesma.
 */
export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );
  }

  const b = await req.json().catch(() => ({}));
  const kind = b.kind as IgKind;
  if ((kind !== "car" && kind !== "listing") || !b.id) {
    return NextResponse.json(
      { error: "Parâmetros kind/id em falta." },
      { status: 400 }
    );
  }

  const s = await loadSubject(kind, b.id);
  if (!s) {
    return NextResponse.json(
      { error: "Anúncio não encontrado." },
      { status: 404 }
    );
  }

  const fallback = buildCaption(s);
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ caption: fallback, ai: false });
  }

  const facts = [
    `Carro: ${s.title}`,
    s.year ? `Ano: ${s.year}` : null,
    s.km != null ? `Quilómetros: ${s.km.toLocaleString("pt-PT")} km` : null,
    s.fuel ? `Combustível: ${s.fuel}` : null,
    s.gearbox ? `Caixa: ${s.gearbox}` : null,
    s.power ? `Potência: ${s.power} cv` : null,
    s.price ? `Preço: ${fmtEur(s.price)}` : "Preço: sob consulta",
    s.location ? `Localização: ${s.location}` : null,
    b.notas ? `Notas do admin: ${String(b.notas).slice(0, 400)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

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
          { role: "user", content: facts },
        ],
        temperature: 0.8,
        max_tokens: 220,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const text: string = (data.choices?.[0]?.message?.content ?? "").trim();
    if (!text) throw new Error("resposta vazia");

    const caption = `${text}\n\n${buildHashtags(s).join(" ")}`.slice(
      0,
      IG_CAPTION_MAX
    );
    return NextResponse.json({ caption, ai: true });
  } catch (err) {
    console.error("[instagram/caption]", err);
    return NextResponse.json({ caption: fallback, ai: false });
  }
}
