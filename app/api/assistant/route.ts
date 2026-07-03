import { NextResponse } from "next/server";
import {
  ASSISTANT_SYSTEM,
  ASSISTANT_SYSTEM_SITE,
  ASSISTANT_TOOLS,
  buildCarContext,
  runTool,
} from "@/lib/assistant";

export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

type Msg = { role: string; content: string };

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "O assistente não está configurado (falta OPENAI_API_KEY)." },
      { status: 503 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const incoming: Msg[] = Array.isArray(body.messages) ? body.messages : [];
  const clean = incoming
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (clean.length === 0) {
    return NextResponse.json({ error: "Sem mensagem" }, { status: 400 });
  }

  // Modo carro (com contexto do anúncio) vs. modo site (assistente geral).
  const ctx = body.context;
  const hasCar = ctx?.kind && ctx?.id;
  const messages: any[] = [
    {
      role: "system",
      content: hasCar ? ASSISTANT_SYSTEM : ASSISTANT_SYSTEM_SITE,
    },
  ];
  if (hasCar) {
    try {
      const carCtx = await buildCarContext(ctx.kind, ctx.id);
      if (carCtx) {
        messages.push({
          role: "system",
          content: `CARRO QUE O UTILIZADOR ESTÁ A VER:\n${carCtx.text}`,
        });
      }
    } catch {
      /* segue sem contexto */
    }
  }
  messages.push(...clean);

  try {
    // até 4 iterações para resolver chamadas de ferramentas
    for (let i = 0; i < 4; i++) {
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          tools: ASSISTANT_TOOLS,
          tool_choice: "auto",
          temperature: 0.4,
          max_tokens: 900,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[assistant] OpenAI error", res.status, detail);
        return NextResponse.json(
          { error: "O assistente está indisponível de momento." },
          { status: 502 }
        );
      }

      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;

      if (msg.tool_calls?.length) {
        messages.push(msg);
        for (const call of msg.tool_calls) {
          let args: any = {};
          try {
            args = JSON.parse(call.function.arguments || "{}");
          } catch {
            args = {};
          }
          const result = await runTool(call.function.name, args);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: result,
          });
        }
        continue; // volta a chamar o modelo com os resultados
      }

      return NextResponse.json({ reply: msg.content ?? "" });
    }
    return NextResponse.json({
      reply:
        "Não consegui concluir o pedido. Tenta reformular a pergunta, por favor.",
    });
  } catch (err) {
    console.error("[assistant]", err);
    return NextResponse.json(
      { error: "Erro a contactar o assistente." },
      { status: 500 }
    );
  }
}
