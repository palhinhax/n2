"use client";

import { useState } from "react";
import { REPORT_REASONS } from "@/lib/constants";

// Botão "Reportar anúncio" — grava uma denúncia que vai para o painel de admin.
export default function ReportButton({
  kind,
  id,
  title,
}: {
  kind: "car" | "listing";
  id: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setErr("Escolhe um motivo.");
      return;
    }
    setErr(null);
    setSending(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, vehicleTitle: title, reason, note }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setErr("Não foi possível enviar. Tenta novamente.");
    } finally {
      setSending(false);
    }
  }

  if (done)
    return (
      <span className="text-[0.78rem] font-semibold text-olive">
        ✓ Denúncia enviada. Obrigado!
      </span>
    );

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[0.78rem] font-semibold text-n2muted2 hover:text-clay"
      >
        ⚑ Reportar anúncio
      </button>
    );

  return (
    <form onSubmit={submit} className="w-full space-y-2">
      <div className="text-[0.82rem] font-bold text-ink">Reportar anúncio</div>
      <select
        className="finput"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      >
        <option value="">Escolhe o motivo…</option>
        {REPORT_REASONS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <textarea
        className="finput"
        rows={2}
        placeholder="Detalhes (opcional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {err && <p className="text-[0.78rem] font-semibold text-clay">{err}</p>}
      <div className="flex gap-2">
        <button className="btn-clay btn-xs" disabled={sending}>
          {sending ? "A enviar…" : "Enviar denúncia"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-line btn-xs"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
