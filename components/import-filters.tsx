"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { BODY_TYPES, FUELS, GEARS } from "@/lib/constants";
import { IMPORT_COUNTRIES } from "@/lib/import-countries";
import BrandCombobox from "@/components/brand-combobox";

/** Filtros da área "Importar carros da Europa". */
export default function ImportFilters({
  brands,
  basePath = "/importar-carros",
  fixed = {},
}: {
  brands: { name: string; models: string[] }[];
  basePath?: string;
  fixed?: Record<string, string>; // ex.: { pais: "DE" } nas páginas por país
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [brandName, setBrandName] = useState(sp.get("marca") || "");
  const brand = brands.find((b) => b.name === brandName);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const KEYS = [
    "pais",
    "marca",
    "modelo",
    "precoMax",
    "fuel",
    "caixa",
    "anoMin",
    "kmMax",
    "cilMax",
    "co2Max",
    "potMin",
    "carroceria",
    "distMax",
    "vendedor",
    "totalMax",
    "poupancaMin",
    "ordenar",
  ];
  const NUMERIC = [
    "precoMax",
    "anoMin",
    "kmMax",
    "cilMax",
    "co2Max",
    "potMin",
    "distMax",
    "totalMax",
    "poupancaMin",
  ];

  const hasAdvanced = !!(
    sp.get("cilMax") ||
    sp.get("co2Max") ||
    sp.get("potMin") ||
    sp.get("carroceria") ||
    sp.get("distMax") ||
    sp.get("vendedor") ||
    sp.get("totalMax") ||
    sp.get("poupancaMin")
  );

  function applyNow(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(fixed)) if (v) params.set(k, v);
    for (const k of KEYS) {
      if (k in fixed) continue;
      let v =
        k in overrides
          ? overrides[k]
          : (document.getElementById("fi-" + k) as HTMLInputElement)?.value ||
            "";
      if (v && NUMERIC.includes(k)) {
        const n = Math.floor(Number(v));
        v = Number.isFinite(n) && n > 0 ? String(n) : "";
      }
      if (v) params.set(k, v);
    }
    router.push(basePath + "?" + params.toString());
  }

  function applyDebounced() {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => applyNow(), 500);
  }

  return (
    <aside className="n2-card flex flex-col gap-3 p-4 lg:sticky lg:top-[86px]">
      <h3 className="font-head text-[1.1rem] font-bold text-ink">Filtros</h3>
      {!("pais" in fixed) && (
        <div>
          <label className="flabel">País</label>
          <select
            id="fi-pais"
            className="finput"
            defaultValue={sp.get("pais") || ""}
            onChange={() => applyNow()}
          >
            <option value="">Todos</option>
            {IMPORT_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="flabel">Marca</label>
        <BrandCombobox
          id="fi-marca"
          brands={brands.map((b) => b.name)}
          value={brandName}
          onSelect={(v) => {
            setBrandName(v);
            applyNow({ marca: v, modelo: "" });
          }}
        />
      </div>
      <div>
        <label className="flabel">Modelo</label>
        <select
          id="fi-modelo"
          className="finput"
          defaultValue={sp.get("modelo") || ""}
          key={brandName}
          onChange={() => applyNow()}
        >
          <option value="">Todos</option>
          {(brand?.models || []).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="flabel">Preço do carro até (€)</label>
        <input
          id="fi-precoMax"
          type="number"
          min={0}
          step={500}
          className="finput"
          placeholder="ex: 20000"
          defaultValue={sp.get("precoMax") || ""}
          onChange={applyDebounced}
        />
      </div>
      <div>
        <label className="flabel">Combustível</label>
        <select
          id="fi-fuel"
          className="finput"
          defaultValue={sp.get("fuel") || ""}
          onChange={() => applyNow()}
        >
          <option value="">Todos</option>
          {FUELS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="flabel">Caixa</label>
        <select
          id="fi-caixa"
          className="finput"
          defaultValue={sp.get("caixa") || ""}
          onChange={() => applyNow()}
        >
          <option value="">Todas</option>
          {GEARS.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="flabel">Ano desde</label>
          <input
            id="fi-anoMin"
            type="number"
            min={1990}
            max={new Date().getFullYear() + 1}
            className="finput"
            placeholder="2018"
            defaultValue={sp.get("anoMin") || ""}
            onChange={applyDebounced}
          />
        </div>
        <div>
          <label className="flabel">Km até</label>
          <input
            id="fi-kmMax"
            type="number"
            min={0}
            step={1000}
            className="finput"
            placeholder="150000"
            defaultValue={sp.get("kmMax") || ""}
            onChange={applyDebounced}
          />
        </div>
      </div>

      <details open={hasAdvanced} className="group">
        <summary className="cursor-pointer select-none text-[0.9rem] font-semibold text-clay">
          Filtros de importação
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label className="flabel">Custo total em PT até (€)</label>
            <input
              id="fi-totalMax"
              type="number"
              min={0}
              step={500}
              className="finput"
              placeholder="preço + impostos + custos"
              defaultValue={sp.get("totalMax") || ""}
              onChange={applyDebounced}
            />
          </div>
          <div>
            <label className="flabel">Poupança mínima vs PT (€)</label>
            <input
              id="fi-poupancaMin"
              type="number"
              min={0}
              step={250}
              className="finput"
              placeholder="ex: 2000"
              defaultValue={sp.get("poupancaMin") || ""}
              onChange={applyDebounced}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="flabel">Cilindrada até (cm³)</label>
              <input
                id="fi-cilMax"
                type="number"
                min={0}
                step={100}
                className="finput"
                placeholder="2000"
                defaultValue={sp.get("cilMax") || ""}
                onChange={applyDebounced}
              />
            </div>
            <div>
              <label className="flabel">CO₂ até (g/km)</label>
              <input
                id="fi-co2Max"
                type="number"
                min={0}
                step={5}
                className="finput"
                placeholder="120"
                defaultValue={sp.get("co2Max") || ""}
                onChange={applyDebounced}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="flabel">Potência mín (cv)</label>
              <input
                id="fi-potMin"
                type="number"
                min={0}
                step={10}
                className="finput"
                placeholder="ex: 150"
                defaultValue={sp.get("potMin") || ""}
                onChange={applyDebounced}
              />
            </div>
            <div>
              <label className="flabel">Distância até (km)</label>
              <input
                id="fi-distMax"
                type="number"
                min={0}
                step={100}
                className="finput"
                placeholder="ex: 2000"
                defaultValue={sp.get("distMax") || ""}
                onChange={applyDebounced}
              />
            </div>
          </div>
          <div>
            <label className="flabel">Carroçaria</label>
            <select
              id="fi-carroceria"
              className="finput"
              defaultValue={sp.get("carroceria") || ""}
              onChange={() => applyNow()}
            >
              <option value="">Todas</option>
              {BODY_TYPES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="flabel">Vendedor</label>
            <select
              id="fi-vendedor"
              className="finput"
              defaultValue={sp.get("vendedor") || ""}
              onChange={() => applyNow()}
            >
              <option value="">Todos</option>
              <option value="Particular">Particular</option>
              <option value="Profissional">Profissional</option>
            </select>
          </div>
          <p className="text-[0.72rem] leading-snug text-n2muted2">
            O custo total e a poupança são estimativas com ISV, transporte e
            legalização incluídos.
          </p>
        </div>
      </details>

      <input
        type="hidden"
        id="fi-ordenar"
        defaultValue={sp.get("ordenar") || ""}
      />
      <button
        className="btn-line btn-xs"
        onClick={() => {
          const p = new URLSearchParams();
          for (const [k, v] of Object.entries(fixed)) if (v) p.set(k, v);
          const qs = p.toString();
          router.push(basePath + (qs ? "?" + qs : ""));
        }}
      >
        Limpar tudo
      </button>
    </aside>
  );
}
