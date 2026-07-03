"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SITES = [
  { key: "", label: "Todos os sites" },
  { key: "STANDVIRTUAL", label: "Standvirtual" },
  { key: "OLX", label: "OLX" },
  { key: "PISCAPISCA", label: "Pisca Pisca" },
];

const COMMANDS: [string, string][] = [
  ["Criar/atualizar tabelas na BD", "npx prisma db push"],
  ["Gerar cliente Prisma", "npx prisma generate"],
  ["Scraping — ciclo completo (todos)", "npx tsx scripts/scraper/run.ts"],
  [
    "Scraping — só um site",
    "npx tsx scripts/scraper/run.ts --site STANDVIRTUAL",
  ],
  [
    "Scraping — teste rápido (3 páginas)",
    "npx tsx scripts/scraper/run.ts --site STANDVIRTUAL --max-pages 3",
  ],
  ["Recomeçar o ciclo do zero", "npx tsx scripts/scraper/run.ts --reset"],
  ["Ver a base de dados", "npx prisma studio"],
];

function CopyRow({ label, cmd }: { label: string; cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-outline/60 py-2">
      <div className="min-w-[190px] text-[0.82rem] font-semibold text-n2muted">
        {label}
      </div>
      <code className="flex-1 rounded bg-ink/5 px-2 py-1 font-mono text-[0.82rem] text-ink">
        {cmd}
      </code>
      <button
        type="button"
        className="btn-line btn-xs"
        onClick={() => {
          navigator.clipboard.writeText(cmd);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? "Copiado ✓" : "Copiar"}
      </button>
    </div>
  );
}

export default function ScraperAdmin() {
  const router = useRouter();
  const [site, setSite] = useState("");
  const [maxPages, setMaxPages] = useState(40);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function runBatch(reset = false) {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: site || undefined, maxPages, reset }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(`Erro: ${data.error ?? res.status}`);
      } else if (data.skipped) {
        setResult("Ciclo recente já completo — nada a fazer (usa Recomeçar).");
      } else {
        setResult(
          `OK — ${data.pages} páginas · ${data.created} novos · ${data.updated} atualizados` +
            (data.cycleFinished
              ? ` · CICLO COMPLETO (${data.deactivated} desativados)`
              : "")
        );
      }
      router.refresh();
    } catch (err) {
      setResult(`Erro: ${String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* correr um lote diretamente do browser */}
      <div className="n2-card p-5">
        <h3 className="mb-1 font-head text-[1.1rem] font-bold text-ink">
          Correr scraping agora
        </h3>
        <p className="mb-3 text-[0.84rem] text-n2muted">
          Processa um lote e guarda o progresso. Corre várias vezes para
          percorrer todos os anúncios (o cron da Vercel faz isto sozinho a cada
          3 dias).
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[0.8rem] font-semibold text-n2muted">
            Site
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="rounded border border-outline bg-white px-2 py-1.5 text-ink"
            >
              {SITES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[0.8rem] font-semibold text-n2muted">
            Páginas (máx.)
            <input
              type="number"
              min={1}
              max={200}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="w-24 rounded border border-outline bg-white px-2 py-1.5 text-ink"
            />
          </label>
          <button
            type="button"
            disabled={running}
            onClick={() => runBatch(false)}
            className="btn-olive btn-sm disabled:opacity-50"
          >
            {running ? "A correr…" : "▶ Correr lote"}
          </button>
          <button
            type="button"
            disabled={running}
            onClick={() => runBatch(true)}
            className="btn-line btn-sm disabled:opacity-50"
          >
            ↻ Recomeçar ciclo
          </button>
        </div>
        {result && (
          <div className="mt-3 rounded bg-ink/5 px-3 py-2 text-[0.85rem] font-medium text-ink">
            {result}
          </div>
        )}
      </div>

      {/* comandos de terminal */}
      <div className="n2-card p-5">
        <h3 className="mb-1 font-head text-[1.1rem] font-bold text-ink">
          Comandos de terminal
        </h3>
        <p className="mb-3 text-[0.84rem] text-n2muted">
          Para correr no teu PC (mais indicado para o ciclo completo, que demora
          horas). Executa um de cada vez na pasta do projeto.
        </p>
        <div>
          {COMMANDS.map(([label, cmd]) => (
            <CopyRow key={cmd} label={label} cmd={cmd} />
          ))}
        </div>
      </div>
    </div>
  );
}
