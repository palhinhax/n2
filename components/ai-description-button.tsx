"use client";
import { useState } from "react";

// Botão "Gerar descrição com IA" nos formulários da garagem.
// Envia os dados já preenchidos do formulário e devolve o texto gerado.

export default function AiDescriptionButton({
  data,
  onResult,
}: {
  /** dados do carro (marca/modelo por nome, ano, km, …, notas = descrição atual) */
  data: Record<string, unknown>;
  onResult: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ai/descricao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || "Erro ao gerar a descrição.");
        return;
      }
      onResult(j.text);
    } catch {
      setError("Erro de rede. Tenta de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="btn-line btn-xs"
      >
        {busy ? "A escrever…" : "✨ Gerar descrição com IA"}
      </button>
      {error && (
        <span className="text-[0.8rem] font-semibold text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}
