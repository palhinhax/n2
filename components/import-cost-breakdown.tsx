import { fmtEur } from "@/lib/constants";
import {
  CONFIDENCE_LABEL,
  DIFFICULTY_LABEL,
  type ImportCostBreakdown as Breakdown,
} from "@/lib/import-cost";
import { IMPORT_DISCLAIMER } from "@/lib/import-content";
import ImportDealBadge from "@/components/import-deal-badge";

/** Decomposição completa do custo de importação (secção "Importar para PT"). */
export default function ImportCostBreakdown({
  breakdown,
  ptMedian,
  savings,
  rating,
}: {
  breakdown: Breakdown;
  ptMedian?: number | null;
  savings?: number | null;
  rating?: string | null;
}) {
  const b = breakdown;
  return (
    <div className="flex flex-col gap-3">
      <table className="w-full text-[0.92rem]">
        <tbody>
          <tr className="border-b border-outline/60">
            <td className="py-1.5 font-semibold text-ink">
              Preço do carro
              {b.currency !== "EUR" && (
                <span className="ml-1 text-[0.75rem] font-medium text-n2muted2">
                  ({b.priceOriginal.toLocaleString("pt-PT")} {b.currency}{" "}
                  convertidos)
                </span>
              )}
            </td>
            <td className="py-1.5 text-right font-semibold text-ink">
              {fmtEur(b.vehiclePriceEur)}
            </td>
          </tr>
          {b.lines.map((l) => (
            <tr key={l.key} className="border-b border-outline/60">
              <td className="py-1.5 text-n2muted">
                {l.label}
                {l.note && (
                  <span className="block text-[0.74rem] leading-snug text-n2muted2">
                    {l.note}
                  </span>
                )}
              </td>
              <td className="py-1.5 text-right align-top font-medium text-ink">
                {fmtEur(l.amount)}
              </td>
            </tr>
          ))}
          <tr>
            <td className="py-2 font-head text-[1.05rem] font-extrabold text-ink">
              Total estimado em Portugal
            </td>
            <td className="py-2 text-right font-head text-[1.25rem] font-extrabold text-ink">
              {fmtEur(b.totalEur)}
            </td>
          </tr>
        </tbody>
      </table>

      {(ptMedian != null || savings != null) && (
        <div className="rounded-xl border border-outline bg-cream p-3">
          {ptMedian != null && (
            <div className="flex items-center justify-between text-[0.92rem]">
              <span className="text-n2muted">
                Preço de mercado em Portugal (mediana)
              </span>
              <b className="text-ink">{fmtEur(ptMedian)}</b>
            </div>
          )}
          {savings != null && (
            <div className="flex items-center justify-between text-[0.95rem]">
              <span className="text-n2muted">
                {savings >= 0 ? "Poupança estimada" : "Perda estimada"}
              </span>
              <b className={savings >= 0 ? "text-olive" : "text-clay"}>
                {savings >= 0 ? "+" : "−"}
                {fmtEur(Math.abs(savings))}
              </b>
            </div>
          )}
          <div className="mt-2">
            <ImportDealBadge rating={rating} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[0.85rem] sm:grid-cols-4">
        {[
          [
            "IUC anual estimado",
            b.iucAnnual > 0 ? fmtEur(b.iucAnnual) : "Isento",
          ],
          ["Confiança da estimativa", CONFIDENCE_LABEL[b.confidence]],
          ["Dificuldade", DIFFICULTY_LABEL[b.difficulty]],
          ["Tempo estimado", b.timeEstimate],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-outline p-2.5">
            <div className="text-[0.7rem] font-bold uppercase tracking-wider text-n2muted2">
              {l}
            </div>
            <div className="font-head text-[0.98rem] font-bold text-ink">
              {v}
            </div>
          </div>
        ))}
      </div>

      <details className="text-[0.82rem] text-n2muted">
        <summary className="cursor-pointer select-none font-semibold text-clay">
          Como foi calculado?
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            ISV com base em {b.assumptionsUsed.displacement} cm³ e{" "}
            {b.assumptionsUsed.co2} g/km ({b.assumptionsUsed.norm})
            {b.isvEstimated
              ? " — valores estimados a partir do combustível/potência porque o anúncio não os indica"
              : " — valores do anúncio"}
            , com redução por idade de usado UE ({b.assumptionsUsed.ageYears}{" "}
            anos).
          </li>
          <li>
            Transporte calculado para ~
            {b.assumptionsUsed.distanceKm.toLocaleString("pt-PT")} km. Ir buscar
            o carro por estrada custaria cerca de {fmtEur(b.travelOptional)}{" "}
            (combustível e portagens, ida e volta) em vez do transporte por
            camião.
          </li>
          <li>
            O IUC é um imposto anual — não está somado ao total de importação.
          </li>
        </ul>
      </details>

      <p className="rounded-xl bg-[#F4E9D2] p-3 text-[0.78rem] leading-snug text-n2muted">
        ⚠️ {IMPORT_DISCLAIMER}
      </p>
    </div>
  );
}
