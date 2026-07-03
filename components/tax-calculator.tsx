"use client";

import { useMemo, useState } from "react";
import {
  calcISV,
  calcIUC,
  IMPORT_FEES_TOTAL,
  type Norm,
  type TaxFuel,
} from "@/lib/car-tax";

const eur = (n: number) =>
  n.toLocaleString("pt-PT", { maximumFractionDigits: 0 }) + " €";
const CURRENT_YEAR = 2026;

const FUELS: { v: TaxFuel; label: string }[] = [
  { v: "gasolina", label: "Gasolina" },
  { v: "diesel", label: "Diesel" },
  { v: "hibrido", label: "Híbrido" },
  { v: "plugin", label: "Híbrido Plug-in" },
  { v: "eletrico", label: "Elétrico" },
];

export default function TaxCalculator() {
  const [fuel, setFuel] = useState<TaxFuel>("gasolina");
  const [cyl, setCyl] = useState("1500");
  const [co2, setCo2] = useState("120");
  const [norm, setNorm] = useState<Norm>("WLTP");
  const [year, setYear] = useState("2019");
  const [imported, setImported] = useState(true);
  const [price, setPrice] = useState("15000");
  const [transport, setTransport] = useState("600");

  const nCyl = Number(cyl) || 0;
  const nCo2 = Number(co2) || 0;
  const nYear = Number(year) || CURRENT_YEAR;
  const age = Math.max(0, CURRENT_YEAR - nYear);
  const isEV = fuel === "eletrico";

  const isv = useMemo(
    () =>
      calcISV({
        cylinder: nCyl,
        co2: nCo2,
        fuel,
        norm,
        ageYears: age,
        importedUsedEU: imported,
      }),
    [nCyl, nCo2, fuel, norm, age, imported]
  );
  const iuc = useMemo(
    () => calcIUC({ cylinder: nCyl, co2: nCo2, fuel, norm, year: nYear }),
    [nCyl, nCo2, fuel, norm, nYear]
  );

  const nPrice = Number(price) || 0;
  const nTransport = Number(transport) || 0;
  const fees = imported ? IMPORT_FEES_TOTAL : 0;
  const totalImport = nPrice + isv.total + fees + nTransport;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      {/* ---------- Inputs ---------- */}
      <div className="n2-card flex flex-col gap-3 p-6">
        <div>
          <label className="flabel">Combustível</label>
          <div className="flex flex-wrap gap-1.5">
            {FUELS.map((f) => (
              <button
                key={f.v}
                type="button"
                onClick={() => setFuel(f.v)}
                className={`rounded-full border px-3 py-1 text-[0.82rem] font-semibold transition ${
                  fuel === f.v
                    ? "border-clay bg-clay text-white"
                    : "border-outline bg-white text-n2muted hover:border-clay"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {!isEV && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flabel">Cilindrada (cm³)</label>
              <input
                className="finput"
                type="number"
                min={0}
                value={cyl}
                onChange={(e) => setCyl(e.target.value)}
              />
            </div>
            <div>
              <label className="flabel">CO₂ (g/km)</label>
              <input
                className="finput"
                type="number"
                min={0}
                value={co2}
                onChange={(e) => setCo2(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flabel">Ano da 1ª matrícula</label>
            <input
              className="finput"
              type="number"
              min={1990}
              max={CURRENT_YEAR}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          {!isEV && (
            <div>
              <label className="flabel">Homologação</label>
              <select
                className="finput"
                value={norm}
                onChange={(e) => setNorm(e.target.value as Norm)}
              >
                <option value="WLTP">WLTP (desde ~2019)</option>
                <option value="NEDC">NEDC (até ~2019)</option>
              </select>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-[0.9rem] font-medium text-ink">
          <input
            type="checkbox"
            checked={imported}
            onChange={(e) => setImported(e.target.checked)}
            className="h-4 w-4 accent-clay"
          />
          Importado usado da UE (aplica desconto de idade)
        </label>

        <div className="mt-1 border-t border-outline pt-3">
          <label className="flabel">Preço de compra no estrangeiro (€)</label>
          <input
            className="finput"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div>
          <label className="flabel">Transporte estimado (€)</label>
          <input
            className="finput"
            type="number"
            min={0}
            value={transport}
            onChange={(e) => setTransport(e.target.value)}
          />
        </div>
      </div>

      {/* ---------- Resultados ---------- */}
      <div className="flex flex-col gap-4">
        <div className="n2-card p-6">
          <div className="flex items-baseline justify-between">
            <span className="font-head text-[0.82rem] font-bold uppercase tracking-wide text-clay">
              ISV (imposto de matrícula)
            </span>
          </div>
          <div className="my-1 font-head text-[2.2rem] font-extrabold text-ink">
            {isv.exempt ? "Isento" : eur(isv.total)}
          </div>
          {!isv.exempt && (
            <dl className="space-y-0.5 text-[0.85rem] text-n2muted">
              <div className="flex justify-between">
                <dt>Componente cilindrada</dt>
                <dd>{eur(isv.cylinderComponent)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Componente ambiental (CO₂)</dt>
                <dd>{eur(isv.environmentalComponent)}</dd>
              </div>
              {isv.particleSurcharge > 0 && (
                <div className="flex justify-between">
                  <dt>Agravamento partículas (diesel)</dt>
                  <dd>{eur(isv.particleSurcharge)}</dd>
                </div>
              )}
              {isv.reductionPct > 0 && (
                <div className="flex justify-between text-olive">
                  <dt>Desconto por idade</dt>
                  <dd>−{Math.round(isv.reductionPct * 100)}%</dd>
                </div>
              )}
            </dl>
          )}
          {isv.benefitLabel && (
            <p className="mt-2 text-[0.76rem] text-n2muted2">
              {isv.benefitLabel}
            </p>
          )}
        </div>

        <div className="n2-card p-6">
          <span className="font-head text-[0.82rem] font-bold uppercase tracking-wide text-clay">
            IUC (imposto anual)
          </span>
          <div className="my-1 font-head text-[2.2rem] font-extrabold text-ink">
            {iuc.exempt ? "Isento" : eur(iuc.total) + "/ano"}
          </div>
        </div>

        <div className="n2-card bg-[#FBF3DC] p-6">
          <span className="font-head text-[0.82rem] font-bold uppercase tracking-wide text-bark">
            Custo total estimado {imported ? "de importação" : ""}
          </span>
          <div className="my-1 font-head text-[2rem] font-extrabold text-ink">
            {eur(totalImport)}
          </div>
          <dl className="space-y-0.5 text-[0.85rem] text-n2muted">
            <div className="flex justify-between">
              <dt>Preço de compra</dt>
              <dd>{eur(nPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>ISV</dt>
              <dd>{eur(isv.total)}</dd>
            </div>
            {fees > 0 && (
              <div className="flex justify-between">
                <dt>Legalização (inspeção, matrícula, chapas)</dt>
                <dd>{eur(fees)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Transporte</dt>
              <dd>{eur(nTransport)}</dd>
            </div>
          </dl>
        </div>

        <p className="text-[0.74rem] leading-snug text-n2muted2">
          Estimativa com base nas tabelas de 2026. Não substitui o simulador
          oficial das Finanças nem cobre isenções especiais (famílias numerosas,
          mudança de residência, etc.). Confirma sempre o valor antes de
          comprar.
        </p>
      </div>
    </div>
  );
}
