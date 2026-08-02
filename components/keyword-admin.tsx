"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SOURCE_LABEL } from "@/components/external-car-card";
import { fmtEur } from "@/lib/constants";

interface Keyword {
  id: string;
  word: string;
  matches: number;
}

interface FlaggedListing {
  id: string;
  source: string;
  url: string;
  title: string;
  price: number | null;
  year: number | null;
  matchedWords: string[];
  inDescription: boolean;
}

interface ExemptListing {
  id: string;
  source: string;
  url: string;
  title: string;
}

export default function KeywordAdmin({
  keywords,
  flagged,
  exempt,
}: {
  keywords: Keyword[];
  flagged: FlaggedListing[];
  exempt: ExemptListing[];
}) {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function call(input: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(input, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(`Erro: ${data.error ?? res.status}`);
        return false;
      }
      router.refresh();
      return true;
    } catch (err) {
      setMessage(`Erro: ${String(err)}`);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim()) return;
    const ok = await call("/api/admin/keywords", {
      method: "POST",
      body: JSON.stringify({ word }),
    });
    if (ok) {
      setWord("");
      setMessage(
        'Palavra adicionada. Carrega em "Analisar agora" para aplicar aos anúncios já na base de dados.'
      );
    }
  }

  async function removeWord(id: string, w: string) {
    const ok = await call("/api/admin/keywords", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    if (ok)
      setMessage(
        `"${w}" removida. A próxima análise limpa os anúncios que só tinham esta palavra.`
      );
  }

  async function runScan() {
    setScanning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/keywords/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Erro: ${data.error ?? res.status}`);
      } else {
        setMessage(
          `Análise concluída — ${data.scanned} anúncios verificados · ${data.flagged} marcados · ${data.unflagged} limpos.`
        );
      }
      router.refresh();
    } catch (err) {
      setMessage(`Erro: ${String(err)}`);
    } finally {
      setScanning(false);
    }
  }

  async function markAsCar(id: string) {
    const ok = await call(`/api/admin/listings/${id}/exempt`, {
      method: "POST",
      body: JSON.stringify({ exempt: true }),
    });
    if (ok) setMessage("Anúncio marcado como carro — deixa de ser apanhado.");
  }

  async function reevaluate(id: string) {
    const ok = await call(`/api/admin/listings/${id}/exempt`, {
      method: "POST",
      body: JSON.stringify({ exempt: false }),
    });
    if (ok)
      setMessage("Isenção removida — volta a ser avaliado na próxima análise.");
  }

  async function hideListing(id: string) {
    const ok = await call(`/api/admin/listings/${id}`, { method: "DELETE" });
    if (ok) setMessage("Anúncio removido do site.");
  }

  return (
    <div className="flex flex-col gap-5">
      {message && (
        <div className="rounded bg-ink/5 px-3 py-2 text-[0.85rem] font-medium text-ink">
          {message}
        </div>
      )}

      {/* gestão da lista de palavras */}
      <div className="n2-card p-5">
        <h3 className="mb-1 font-head text-[1.1rem] font-bold text-ink">
          Lista de palavras ({keywords.length})
        </h3>
        <p className="mb-3 text-[0.84rem] text-n2muted">
          Palavra inteira, sem distinção de acentos/maiúsculas. Também podes
          adicionar frases (ex. &quot;cama articulada&quot;).
        </p>
        <form onSubmit={addWord} className="mb-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="ex.: mota, cama, brinquedo…"
            className="w-64 rounded border border-outline bg-white px-3 py-1.5 text-[0.9rem] text-ink"
          />
          <button
            type="submit"
            disabled={busy || scanning || word.trim().length < 3}
            className="btn-olive btn-sm disabled:opacity-50"
          >
            + Adicionar
          </button>
          <button
            type="button"
            disabled={busy || scanning || keywords.length === 0}
            onClick={runScan}
            className="btn-line btn-sm disabled:opacity-50"
          >
            {scanning ? "A analisar…" : "🔍 Analisar agora"}
          </button>
        </form>
        {keywords.length === 0 ? (
          <div className="text-[0.88rem] text-n2muted">
            Ainda sem palavras. Adiciona a primeira (ex.: mota).
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span
                key={k.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-outline bg-white px-3 py-1 text-[0.85rem] font-semibold text-ink"
              >
                {k.word}
                <span className="text-[0.75rem] font-normal text-n2muted">
                  {k.matches}
                </span>
                <button
                  type="button"
                  disabled={busy || scanning}
                  onClick={() => removeWord(k.id, k.word)}
                  title="Remover palavra"
                  className="text-n2muted hover:text-clay"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* anúncios apanhados */}
      <div className="n2-card p-5">
        <h3 className="mb-1 font-head text-[1.1rem] font-bold text-ink">
          Anúncios apanhados ({flagged.length}
          {flagged.length === 100 ? "+" : ""})
        </h3>
        <p className="mb-3 text-[0.84rem] text-n2muted">
          Escondidos das listagens públicas. Se algum for mesmo um carro,
          marca-o como &quot;É carro&quot;.
        </p>
        {flagged.length === 0 ? (
          <div className="text-[0.88rem] text-n2muted">
            Nada apanhado — adiciona palavras e corre a análise.
          </div>
        ) : (
          <div className="flex flex-col">
            {flagged.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-2 border-b border-outline/60 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">
                    {l.title}
                  </div>
                  <div className="text-[0.8rem] text-n2muted">
                    {SOURCE_LABEL[l.source] ?? l.source}
                    {l.year ? ` · ${l.year}` : ""}
                    {l.price != null ? ` · ${fmtEur(l.price)}` : ""}
                    {" · apanhado por: "}
                    <b className="text-clay">
                      {l.matchedWords.join(", ") || "?"}
                    </b>
                    {l.inDescription ? " (na descrição)" : ""}
                  </div>
                </div>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-line btn-xs"
                >
                  Ver original ↗
                </a>
                <button
                  type="button"
                  disabled={busy || scanning}
                  onClick={() => markAsCar(l.id)}
                  className="btn-line btn-xs disabled:opacity-50"
                >
                  ✓ É carro
                </button>
                <button
                  type="button"
                  disabled={busy || scanning}
                  onClick={() => hideListing(l.id)}
                  className="btn-line btn-xs text-clay disabled:opacity-50"
                >
                  🗑 Remover do site
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* isentos */}
      {exempt.length > 0 && (
        <div className="n2-card p-5">
          <h3 className="mb-1 font-head text-[1.1rem] font-bold text-ink">
            Marcados como &quot;É carro&quot; ({exempt.length})
          </h3>
          <p className="mb-3 text-[0.84rem] text-n2muted">
            As palavras suspeitas não se aplicam a estes anúncios.
          </p>
          <div className="flex flex-col">
            {exempt.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-2 border-b border-outline/60 py-2"
              >
                <div className="min-w-0 flex-1 truncate font-semibold text-ink">
                  {l.title}
                  <span className="ml-2 text-[0.8rem] font-normal text-n2muted">
                    {SOURCE_LABEL[l.source] ?? l.source}
                  </span>
                </div>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-line btn-xs"
                >
                  Ver original ↗
                </a>
                <button
                  type="button"
                  disabled={busy || scanning}
                  onClick={() => reevaluate(l.id)}
                  className="btn-line btn-xs disabled:opacity-50"
                >
                  ↻ Voltar a avaliar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
