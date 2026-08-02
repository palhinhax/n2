"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Botão de admin para enviar uma mensagem a um utilizador (notificação in-app
 * + email). Usa-se com `carId` (vai para o dono do anúncio, com link para o
 * editar) ou com `userId` (mensagem geral).
 */
export default function AdminMessageButton({
  carId,
  userId,
  to,
  carLabel,
  label = "✉ Mensagem",
}: {
  carId?: string;
  userId?: string;
  to: string;
  carLabel?: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const carro = carLabel ? `o teu anúncio ${carLabel}` : "o teu anúncio";

  const presets: { name: string; title: string; body: string }[] = [
    {
      name: "📷 Mais fotos",
      title: "Adiciona mais fotos ao teu anúncio",
      body: `Olá! Reparámos que ${carro} tem poucas fotos — e isso é o que mais trava os contactos de quem procura carro.

Podes juntar mais algumas? O ideal são 6 a 10: frente, traseira, os dois lados, interior, painel com os km à vista e o motor. Com boa luz e sem matrícula visível, se preferires.

Abre o anúncio na tua garagem e carrega-as em menos de dois minutos. Obrigado!`,
    },
    {
      name: "✍️ Descrição",
      title: "Completa a descrição do teu anúncio",
      body: `Olá! Para ${carro} aparecer melhor nas pesquisas, ajuda muito ter uma descrição com o essencial: histórico de manutenção, extras, estado dos pneus e motivo da venda.

Podes editá-la a qualquer momento na tua garagem. Obrigado!`,
    },
    {
      name: "🔍 Dados",
      title: "Confirma os dados do teu anúncio",
      body: `Olá! Antes de publicarmos ${carro}, podes confirmar os dados (ano, quilómetros, combustível e preço)? Há um campo que nos parece estar trocado.

Obrigado!`,
    },
    {
      name: "✏️ Livre",
      title: "",
      body: "",
    },
  ];

  async function send() {
    setMsg(null);
    if (!title.trim()) {
      setMsg({ ok: false, text: "Escreve o assunto." });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId, userId, title, body, email }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const j = res ? await res.json().catch(() => ({})) : {};
      setMsg({
        ok: false,
        text: (j as any).error || "Não foi possível enviar a mensagem.",
      });
      return;
    }
    const j = await res.json().catch(() => ({}) as any);
    setMsg({
      ok: true,
      text: j.emailed ? "Enviada (notificação + email)." : "Enviada (in-app).",
    });
    setTitle("");
    setBody("");
    setTimeout(() => {
      setOpen(false);
      setMsg(null);
      router.refresh();
    }, 1400);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={`Enviar mensagem a ${to}`}
        className="btn-line btn-xs"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => {
            setOpen(false);
            setMsg(null);
          }}
        >
          <div
            role="dialog"
            aria-label="Enviar mensagem"
            onClick={(e) => e.stopPropagation()}
            className="n2-card max-h-[90vh] w-[min(520px,100%)] overflow-y-auto p-4 text-left shadow-lg"
          >
            <p className="mb-2 text-[0.78rem] text-n2muted">
              Para <b className="text-ink">{to}</b>
            </p>

            <div className="mb-2 flex flex-wrap gap-1">
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setTitle(p.title);
                    setBody(p.body);
                    setMsg(null);
                  }}
                  className="btn-line btn-xs"
                >
                  {p.name}
                </button>
              ))}
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Assunto"
              className="mb-2 w-full rounded-lg border border-outline px-3 py-2 text-[0.88rem]"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1500}
              rows={7}
              placeholder="Mensagem…"
              className="mb-2 w-full rounded-lg border border-outline px-3 py-2 text-[0.85rem]"
            />

            <label className="mb-2 flex items-center gap-2 text-[0.8rem] text-n2muted">
              <input
                type="checkbox"
                checked={email}
                onChange={(e) => setEmail(e.target.checked)}
              />
              Enviar também por email
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={send}
                disabled={busy}
                className="btn-clay btn-sm disabled:opacity-60"
              >
                {busy ? "A enviar…" : "Enviar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setMsg(null);
                }}
                className="btn-line btn-sm"
              >
                Cancelar
              </button>
              {msg && (
                <span
                  className={`text-[0.78rem] ${
                    msg.ok ? "text-olive" : "text-red-800"
                  }`}
                >
                  {msg.text}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
