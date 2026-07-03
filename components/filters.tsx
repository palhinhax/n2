"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { FUELS, GEARS } from "@/lib/constants";

export default function Filters({
  brands,
  hideFuel = false,
  basePath = "/carros",
  fixed = {},
}: {
  brands: { name: string; models: string[] }[];
  hideFuel?: boolean;
  basePath?: string;
  fixed?: Record<string, string>;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [brandName, setBrandName] = useState(sp.get("marca") || "");
  const brand = brands.find((b) => b.name === brandName);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const KEYS = [
    "marca",
    "modelo",
    "precoMax",
    "fuel",
    "caixa",
    "anoMin",
    "kmMax",
    "ordenar",
  ];

  // aplica os filtros lendo os valores atuais (com possíveis overrides)
  function applyNow(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams();
    // parâmetros fixos da página (ex. fuel=Elétrico na página de elétricos)
    for (const [k, v] of Object.entries(fixed)) if (v) params.set(k, v);
    for (const k of KEYS) {
      if (hideFuel && k === "fuel") continue; // combustível é fixo aqui
      const v =
        k in overrides
          ? overrides[k]
          : (document.getElementById("f-" + k) as HTMLInputElement)?.value ||
            "";
      if (v) params.set(k, v);
    }
    router.push(basePath + "?" + params.toString());
  }

  // números: espera o utilizador parar de escrever antes de aplicar
  function applyDebounced() {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => applyNow(), 500);
  }

  const fuel = sp.get("fuel") || "";

  return (
    <aside className="n2-card flex flex-col gap-3 p-4 lg:sticky lg:top-[86px]">
      <h3 className="font-head text-[1.1rem] font-bold text-ink">Filtros</h3>
      <div>
        <label className="flabel">Marca</label>
        <select
          id="f-marca"
          className="finput"
          value={brandName}
          onChange={(e) => {
            setBrandName(e.target.value);
            applyNow({ marca: e.target.value, modelo: "" });
          }}
        >
          <option value="">Todas</option>
          {brands.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="flabel">Modelo</label>
        <select
          id="f-modelo"
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
        <label className="flabel">Preço até (€)</label>
        <input
          id="f-precoMax"
          type="number"
          min={0}
          step={500}
          className="finput"
          placeholder="ex: 20000"
          defaultValue={sp.get("precoMax") || ""}
          onChange={applyDebounced}
        />
      </div>
      {!hideFuel && (
        <div>
          <label className="flabel">Combustível</label>
          <select
            id="f-fuel"
            className="finput"
            defaultValue={fuel}
            onChange={() => applyNow()}
          >
            <option value="">Todos</option>
            {FUELS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="flabel">Caixa</label>
        <select
          id="f-caixa"
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
            id="f-anoMin"
            type="number"
            min={1950}
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
            id="f-kmMax"
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
      <input
        type="hidden"
        id="f-ordenar"
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
