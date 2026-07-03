"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FUELS, GEARS } from "@/lib/constants";

export default function Filters({ brands }: { brands: any[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [brandId, setBrandId] = useState(sp.get("marca") || "");
  const brand = brands.find((b) => String(b.id) === brandId);

  function apply() {
    const params = new URLSearchParams();
    for (const k of [
      "marca",
      "modelo",
      "precoMax",
      "fuel",
      "caixa",
      "anoMin",
      "kmMax",
      "autonomiaMin",
      "ordenar",
    ]) {
      const v =
        (document.getElementById("f-" + k) as HTMLInputElement)?.value || "";
      if (v) params.set(k, v);
    }
    router.push("/carros?" + params.toString());
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
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
        >
          <option value="">Todas</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
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
          key={brandId}
        >
          <option value="">Todos</option>
          {(brand?.models || []).map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="flabel">Preço até (€)</label>
        <input
          id="f-precoMax"
          type="number"
          className="finput"
          placeholder="ex: 20000"
          defaultValue={sp.get("precoMax") || ""}
        />
      </div>
      <div>
        <label className="flabel">Combustível</label>
        <select id="f-fuel" className="finput" defaultValue={fuel}>
          <option value="">Todos</option>
          {FUELS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="flabel">Autonomia mín. (km) ⚡</label>
        <input
          id="f-autonomiaMin"
          type="number"
          className="finput"
          placeholder="ex: 300"
          defaultValue={sp.get("autonomiaMin") || ""}
        />
      </div>
      <div>
        <label className="flabel">Caixa</label>
        <select
          id="f-caixa"
          className="finput"
          defaultValue={sp.get("caixa") || ""}
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
            className="finput"
            placeholder="2018"
            defaultValue={sp.get("anoMin") || ""}
          />
        </div>
        <div>
          <label className="flabel">Km até</label>
          <input
            id="f-kmMax"
            type="number"
            className="finput"
            placeholder="150000"
            defaultValue={sp.get("kmMax") || ""}
          />
        </div>
      </div>
      <input
        type="hidden"
        id="f-ordenar"
        defaultValue={sp.get("ordenar") || ""}
      />
      <button className="btn-clay" onClick={apply}>
        Aplicar filtros
      </button>
      <button
        className="btn-line btn-xs"
        onClick={() => router.push("/carros")}
      >
        Limpar tudo
      </button>
    </aside>
  );
}
