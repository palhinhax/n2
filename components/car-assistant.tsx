"use client";

import { useRef, useState } from "react";
import AssistantMessage from "@/components/assistant-message";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "O que achas deste carro?",
  "O preço é justo?",
  "Que perguntas faço ao vendedor?",
  "Mostra alternativas mais baratas",
];

export default function CarAssistant({
  kind,
  id,
  title,
}: {
  kind: "car" | "listing";
  id: string;
  title?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context: { kind, id } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro do assistente.");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || "…" },
      ]);
      setTimeout(
        () => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }),
        50
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro do assistente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="n2-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-outline bg-gradient-to-br from-[#FCF4E2] to-[#F5E6C6] px-5 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-clay text-[1rem] text-white">
          ✨
        </span>
        <div>
          <h2 className="font-head text-[1.05rem] font-bold leading-tight text-ink">
            Assistente Nacional 2
          </h2>
          <p className="text-[0.78rem] text-n2muted">
            Pergunta-me sobre {title ? `o ${title}` : "este carro"}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[420px] space-y-3 overflow-y-auto overflow-x-hidden px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="text-[0.9rem] text-n2muted">
            Olá! Posso ajudar-te a decidir sobre este carro — preço, riscos,
            perguntas ao vendedor, ou encontrar alternativas no site.
            Experimenta:
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[0.9rem] leading-relaxed [overflow-wrap:anywhere] ${
                m.role === "user"
                  ? "whitespace-pre-wrap bg-clay text-white"
                  : "border border-outline bg-cream text-ink"
              }`}
            >
              {m.role === "assistant" ? (
                <AssistantMessage text={m.content} />
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-outline bg-cream px-3.5 py-2 text-[0.9rem] text-n2muted">
              A pensar…
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-clay/10 px-3 py-2 text-[0.85rem] font-medium text-clay">
            {error}
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={loading}
              className="rounded-full border border-outline2 bg-white px-3 py-1 text-[0.8rem] font-semibold text-n2muted transition hover:border-clay disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-outline p-3"
      >
        <input
          className="finput"
          placeholder="Escreve a tua pergunta…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          className="btn-clay btn-sm shrink-0"
          disabled={loading || !input.trim()}
        >
          Enviar
        </button>
      </form>

      <p className="px-4 pb-3 text-[0.7rem] leading-snug text-n2muted2">
        Respostas geradas por IA, podem conter erros. Confirma sempre com
        inspeção, test drive e verificação de documentos.
      </p>
    </div>
  );
}
