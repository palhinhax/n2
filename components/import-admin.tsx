"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_ASSUMPTIONS, type ImportAssumptions } from "@/lib/import-cost";
import { IMPORT_COUNTRIES } from "@/lib/import-countries";

interface SourceRow {
  id: string;
  slug: string;
  name: string;
  adapter: string;
  country: string;
  baseUrl: string;
  enabled: boolean;
  notes: string | null;
  lastRunAt: string | null;
  lastError: string | null;
  activeListings: number;
}

/** Gestão de fontes de scraping estrangeiras + pressupostos de custo. */
export default function ImportAdmin() {
  const router = useRouter();
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [adapters, setAdapters] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/import/sources");
    if (!res.ok) return;
    const data = await res.json();
    setSources(data.sources);
    setAdapters(data.adapters);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleSource(s: SourceRow) {
    setBusy(s.id);
    await fetch(`/api/admin/import/sources/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !s.enabled }),
    });
    await load();
    setBusy(null);
  }

  async function runScrape(opts: {
    source?: string;
    reset?: boolean;
    refreshOnly?: boolean;
  }) {
    setBusy("scrape");
    setResult(null);
    try {
      const res = await fetch("/api/admin/import/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...opts, maxPages: 20 }),
      });
      const data = await res.json();
      if (!res.ok) setResult(`Erro: ${data.error ?? res.status}`);
      else if (data.comparisonsRefreshed != null && opts.refreshOnly)
        setResult(`OK — ${data.comparisonsRefreshed} comparações recalculadas`);
      else if (data.skipped)
        setResult(
          "Ciclo recente já completo — nada a fazer (ou sem fontes ativas)."
        );
      else
        setResult(
          `OK — ${data.pages} páginas · ${data.created} novos · ${data.updated} atualizados` +
            (data.cycleFinished
              ? ` · CICLO COMPLETO (${data.deactivated} expirados, ${data.comparisonsRefreshed} comparações)`
              : " · ciclo continua na próxima execução")
        );
      await load();
      router.refresh();
    } catch (err) {
      setResult(`Erro: ${err}`);
    } finally {
      setBusy(null);
    }
  }

  async function addSource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy("add");
    const res = await fetch("/api/admin/import/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: fd.get("slug"),
        name: fd.get("name"),
        adapter: fd.get("adapter"),
        country: fd.get("country"),
        baseUrl: fd.get("baseUrl"),
        notes: fd.get("notes"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setResult(res.ok ? "Fonte criada." : `Erro: ${data.error ?? res.status}`);
    if (res.ok) {
      setShowAdd(false);
      await load();
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="n2-card overflow-x-auto p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="font-head text-[1.05rem] font-bold text-ink">
            Fontes de scraping
          </h3>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              className="btn-line btn-xs"
              disabled={busy != null}
              onClick={() => setShowAdd((v) => !v)}
            >
              + Nova fonte
            </button>
            <button
              className="btn-line btn-xs"
              disabled={busy != null}
              onClick={() => runScrape({ refreshOnly: true })}
            >
              Recalcular comparações
            </button>
            <button
              className="btn-line btn-xs"
              disabled={busy != null}
              onClick={() => runScrape({ reset: true })}
            >
              Recomeçar ciclo
            </button>
            <button
              className="btn-clay btn-xs"
              disabled={busy != null}
              onClick={() => runScrape({})}
            >
              {busy === "scrape" ? "A correr…" : "▶ Correr lote agora"}
            </button>
          </div>
        </div>
        {result && (
          <p className="mb-2 rounded bg-ink/5 px-2 py-1 text-[0.82rem] font-medium text-ink">
            {result}
          </p>
        )}

        {showAdd && (
          <form
            onSubmit={addSource}
            className="mb-3 grid gap-2 rounded-xl border border-outline p-3 sm:grid-cols-2"
          >
            <input
              name="slug"
              required
              placeholder="slug (ex: mobile-de)"
              className="finput"
            />
            <input name="name" required placeholder="Nome" className="finput" />
            <select name="adapter" className="finput">
              {adapters.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <select name="country" className="finput">
              {IMPORT_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <input
              name="baseUrl"
              required
              placeholder="https://…"
              className="finput sm:col-span-2"
            />
            <input
              name="notes"
              placeholder="Notas (ToS/robots verificados?)"
              className="finput sm:col-span-2"
            />
            <button
              className="btn-clay btn-xs sm:col-span-2"
              disabled={busy != null}
            >
              Criar fonte
            </button>
          </form>
        )}

        <table className="w-full text-[0.85rem]">
          <thead>
            <tr className="border-b border-outline text-left font-head text-[0.72rem] uppercase tracking-wider text-n2muted2">
              <th className="py-2 pr-2">Fonte</th>
              <th className="py-2 pr-2">País</th>
              <th className="py-2 pr-2">Anúncios</th>
              <th className="py-2 pr-2">Última execução</th>
              <th className="py-2 pr-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-b border-outline/60 align-top">
                <td className="py-2 pr-2">
                  <b className="text-ink">{s.name}</b>
                  <div className="text-[0.75rem] text-n2muted2">
                    {s.slug} · {s.adapter}
                  </div>
                  {s.lastError && (
                    <div className="mt-0.5 max-w-md text-[0.75rem] text-clay">
                      ⚠ {s.lastError}
                    </div>
                  )}
                </td>
                <td className="py-2 pr-2">{s.country}</td>
                <td className="py-2 pr-2">
                  {s.activeListings.toLocaleString("pt-PT")}
                </td>
                <td className="py-2 pr-2 text-n2muted">
                  {s.lastRunAt
                    ? new Date(s.lastRunAt).toLocaleString("pt-PT")
                    : "—"}
                </td>
                <td className="py-2 pr-2">
                  {s.enabled ? (
                    <span className="n2-tag bg-olive">Ativa</span>
                  ) : (
                    <span className="n2-tag bg-[#8B8165]">Desativada</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      className="btn-line btn-xs"
                      disabled={busy != null}
                      onClick={() => runScrape({ source: s.slug })}
                    >
                      Correr
                    </button>
                    <button
                      className="btn-line btn-xs"
                      disabled={busy != null}
                      onClick={() => toggleSource(s)}
                    >
                      {s.enabled ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[0.75rem] leading-snug text-n2muted2">
          As fontes reais nascem desativadas: rever os termos de serviço e o
          robots.txt de cada site antes de ativar. O motor verifica o robots.txt
          em runtime e aborta a fonte se o caminho for proibido.
        </p>
      </div>

      <AssumptionsEditor />
    </div>
  );
}

function AssumptionsEditor() {
  const [a, setA] = useState<ImportAssumptions | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/import/config")
      .then((r) => r.json())
      .then((d) => setA(d.assumptions))
      .catch(() => setA(DEFAULT_ASSUMPTIONS));
  }, []);

  if (!a) return null;

  const FIELDS: [keyof ImportAssumptions, string][] = [
    ["transportBase", "Transporte: custo fixo (€)"],
    ["transportPerKm", "Transporte: €/km"],
    ["travelPerKm", "Viagem própria: €/km"],
    ["tempPlatesDocs", "Matrícula exportação + docs (€)"],
    ["inspectionB", "Inspeção tipo B (€)"],
    ["homologation", "Homologação IMT (€)"],
    ["registration", "Taxa de matrícula (€)"],
    ["plates", "Chapas (€)"],
    ["adminBuffer", "Despesas administrativas (€)"],
    ["serviceFeePct", "Fee de serviço (%)"],
    ["serviceFeeMin", "Fee de serviço mínimo (€)"],
  ];

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!a) return;
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/import/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(a),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(
      res.ok
        ? "Pressupostos guardados. Usa «Recalcular comparações» para aplicar aos anúncios existentes."
        : `Erro: ${data.error ?? res.status}`
    );
    setSaving(false);
  }

  return (
    <form onSubmit={save} className="n2-card p-4">
      <h3 className="mb-1 font-head text-[1.05rem] font-bold text-ink">
        Pressupostos do cálculo de importação
      </h3>
      <p className="mb-3 text-[0.8rem] text-n2muted">
        Valores editáveis sem deploy — as tabelas de ISV/IUC vivem em
        lib/car-tax.ts. O ISV/IUC não se ajusta aqui; estes são os custos
        logísticos e administrativos.
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {FIELDS.map(([k, label]) => (
          <div key={k}>
            <label className="flabel">{label}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="finput"
              value={String(a[k] ?? 0)}
              onChange={(e) => setA({ ...a, [k]: Number(e.target.value) || 0 })}
            />
          </div>
        ))}
        <div className="col-span-2">
          <label className="flabel">Nota (ex.: “valores OE2026”)</label>
          <input
            className="finput"
            value={a.note ?? ""}
            onChange={(e) => setA({ ...a, note: e.target.value })}
          />
        </div>
      </div>
      {msg && (
        <p className="mt-2 rounded bg-ink/5 px-2 py-1 text-[0.82rem] font-medium text-ink">
          {msg}
        </p>
      )}
      <button className="btn-clay btn-xs mt-3" disabled={saving}>
        {saving ? "A guardar…" : "Guardar pressupostos"}
      </button>
    </form>
  );
}
