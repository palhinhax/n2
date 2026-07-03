"use client";

import { useEffect, useRef, useState } from "react";
import AssistantMessage from "@/components/assistant-message";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Ajuda-me a escolher um carro",
  "Carros automáticos até 12.000 €",
  "Quanto pago de ISV a importar?",
  "Como vendo o meu carro?",
];

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open)
      setTimeout(
        () => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }),
        50
      );
  }, [messages, open]);

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
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro do assistente.");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || "…" },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro do assistente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        type="button"
        aria-label={open ? "Fechar assistente" : "Abrir assistente"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-clay text-[1.5rem] text-white shadow-warmlg transition hover:scale-105"
      >
        {open ? "✕" : "✨"}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-[60] flex h-[min(70vh,560px)] w-[min(400px,92vw)] flex-col overflow-hidden rounded-2xl border border-outline bg-white shadow-warmlg">
          <div className="flex items-center gap-2 border-b border-outline bg-gradient-to-br from-[#FCF4E2] to-[#F5E6C6] px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-clay text-white">
              ✨
            </span>
            <div className="flex-1">
              <h2 className="font-head text-[1rem] font-bold leading-tight text-ink">
                Assistente Nacional 2
              </h2>
              <p className="text-[0.74rem] text-n2muted">
                Encontra carros e tira dúvidas
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-n2muted hover:text-ink"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-3"
          >
            {messages.length === 0 && (
              <div className="text-[0.9rem] text-n2muted">
                Olá! Ajudo-te a encontrar carros, comparar preços, calcular ISV,
                vender, e tudo o que o Nacional 2 oferece. Experimenta:
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
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-[0.88rem] leading-relaxed [overflow-wrap:anywhere] ${
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
                <div className="rounded-2xl border border-outline bg-cream px-3 py-2 text-[0.88rem] text-n2muted">
                  A pensar…
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-clay/10 px-3 py-2 text-[0.83rem] font-medium text-clay">
                {error}
              </div>
            )}
          </div>

          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={loading}
                  className="rounded-full border border-outline2 bg-white px-2.5 py-1 text-[0.76rem] font-semibold text-n2muted transition hover:border-clay disabled:opacity-50"
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
            className="flex items-center gap-2 border-t border-outline p-2.5"
          >
            <input
              className="finput"
              placeholder="Escreve aqui…"
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
        </div>
      )}
    </>
  );
}
