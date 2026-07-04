"use client";
import { useState } from "react";
import { fmtEur } from "@/lib/constants";
import type {
  AnnualCosts,
  DepreciationEstimate,
  ModelReportContent,
} from "@/lib/purchase-report";

// Relatório de compra: custos anuais estimados + desvalorização (server-side,
// instantâneo) e problemas conhecidos do modelo (IA, carregado a pedido).

export default function PurchaseReport({
  brand,
  model,
  fuel,
  annualCosts,
  depreciation,
}: {
  brand: string | null;
  model: string | null;
  fuel: string | null;
  year: number | null;
  annualCosts: AnnualCosts | null;
  depreciation: DepreciationEstimate | null;
}) {
  const [report, setReport] = useState<ModelReportContent | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "empty">(
    "idle"
  );

  const canFetchReport = !!(brand && model);

  async function loadReport() {
    if (!canFetchReport || state === "loading") return;
    setState("loading");
    try {
      const p = new URLSearchParams({ marca: brand!, modelo: model! });
      if (fuel) p.set("fuel", fuel);
      const res = await fetch(`/api/model-report?${p}`);
      const j = await res.json();
      if (j.report) {
        setReport(j.report);
        setState("done");
      } else setState("empty");
    } catch {
      setState("empty");
    }
  }

  if (!annualCosts && !depreciation && !canFetchReport) return null;

  return (
    <div className="n2-card p-5">
      <h2 className="mb-1 font-head text-[1.1rem] font-bold text-ink">
        🔎 Relatório de compra
      </h2>
      <p className="mb-4 text-[0.82rem] text-n2muted">
        Estimativas para te ajudar a decidir — confirma sempre os valores exatos
        antes de comprar.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {annualCosts && (
          <div>
            <h3 className="mb-1.5 text-[0.85rem] font-bold uppercase tracking-wide text-clay">
              Custo anual estimado
            </h3>
            <ul className="space-y-1 text-[0.88rem] text-ink/90">
              {annualCosts.lines.map((l) => (
                <li key={l.label} className="flex justify-between gap-3">
                  <span className="text-n2muted">
                    {l.label}
                    {l.note && (
                      <span className="ml-1 text-[0.74rem] text-n2muted2">
                        ({l.note})
                      </span>
                    )}
                  </span>
                  <span className="whitespace-nowrap font-semibold">
                    {l.low === l.high
                      ? fmtEur(l.low)
                      : `${fmtEur(l.low)}–${fmtEur(l.high)}`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-outline pt-2 text-[0.92rem] font-bold text-ink">
              <span>Total / ano</span>
              <span>
                {fmtEur(annualCosts.totalLow)}–{fmtEur(annualCosts.totalHigh)}
              </span>
            </div>
            <p className="mt-1 text-[0.72rem] text-n2muted2">
              Pressupostos: {annualCosts.assumptions.join(" · ")}.
            </p>
          </div>
        )}

        {depreciation && (
          <div>
            <h3 className="mb-1.5 text-[0.85rem] font-bold uppercase tracking-wide text-clay">
              Valor esperado
            </h3>
            <ul className="space-y-1 text-[0.88rem] text-ink/90">
              <li className="flex justify-between gap-3">
                <span className="text-n2muted">Daqui a 3 anos</span>
                <span className="font-semibold">
                  ≈ {fmtEur(depreciation.in3Years)}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-n2muted">Daqui a 5 anos</span>
                <span className="font-semibold">
                  ≈ {fmtEur(depreciation.in5Years)}
                </span>
              </li>
            </ul>
            <p className="mt-1 text-[0.72rem] text-n2muted2">
              Desvalorização média de{" "}
              {Math.round(depreciation.ratePerYear * 100)}%/ano para a idade do
              carro; o valor real depende do estado, km e procura.
            </p>
            <p className="mt-3 text-[0.78rem] text-n2muted">
              <b>Recalls:</b> consulta campanhas de segurança no{" "}
              <a
                href="https://ec.europa.eu/safety-gate-alerts/screen/search?resetSearch=true"
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="font-semibold text-clay underline"
              >
                Safety Gate (UE)
              </a>{" "}
              ou junto do representante da marca.
            </p>
          </div>
        )}
      </div>

      {canFetchReport && (
        <div className="mt-4 border-t border-outline pt-4">
          <h3 className="mb-1.5 text-[0.85rem] font-bold uppercase tracking-wide text-clay">
            Problemas conhecidos — {brand} {model}
          </h3>

          {state === "idle" && (
            <button onClick={loadReport} className="btn-line btn-xs">
              ✨ Ver problemas conhecidos e o que verificar
            </button>
          )}
          {state === "loading" && (
            <p className="text-[0.85rem] text-n2muted">
              A preparar o relatório…
            </p>
          )}
          {state === "empty" && (
            <p className="text-[0.85rem] text-n2muted">
              De momento não conseguimos gerar este relatório. Tenta mais tarde.
            </p>
          )}
          {state === "done" && report && (
            <div className="text-[0.88rem] text-ink/90">
              {report.summary && <p className="mb-2">{report.summary}</p>}
              {report.issues.length > 0 && (
                <>
                  <p className="mb-1 font-semibold text-ink">A ter em conta:</p>
                  <ul className="mb-2 space-y-0.5">
                    {report.issues.map((x) => (
                      <li key={x} className="flex gap-1.5">
                        <span className="text-[#C6603B]">!</span>
                        {x}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {report.checks.length > 0 && (
                <>
                  <p className="mb-1 font-semibold text-ink">
                    Antes de comprar, verifica:
                  </p>
                  <ul className="space-y-0.5">
                    {report.checks.map((x) => (
                      <li key={x} className="flex gap-1.5">
                        <span className="text-olive">✓</span>
                        {x}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="mt-2 text-[0.72rem] text-n2muted2">
                Gerado por IA com base em problemas amplamente documentados —
                não substitui uma inspeção mecânica.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
