"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUploader from "@/components/photo-uploader";
import AiDescriptionButton from "@/components/ai-description-button";
import { FUELS, GEARS, DISTRICTS, ELECTRIFIED } from "@/lib/constants";

export default function NewCarForm() {
  const router = useRouter();
  const [brands, setBrands] = useState<any[]>([]);
  const [f, setF] = useState<any>({
    brandId: "",
    modelId: "",
    version: "",
    year: "",
    km: "",
    fuel: "Gasolina",
    gearbox: "Manual",
    power: "",
    evRange: "",
    district: "",
    description: "",
    forSale: false,
    price: "",
    negotiable: true,
  });
  const [photos, setPhotos] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then(setBrands);
  }, []);

  const brand = brands.find((b) => String(b.id) === String(f.brandId));
  const isEV = ELECTRIFIED.includes(f.fuel);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/cars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, photos }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(j.error || "Erro ao guardar.");
      return;
    }
    router.push("/garagem");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="n2-card flex flex-col gap-4 p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="flabel">Marca *</label>
          <select
            className="finput"
            required
            value={f.brandId}
            onChange={(e) =>
              setF({ ...f, brandId: e.target.value, modelId: "" })
            }
          >
            <option value="">Escolhe…</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="flabel">Modelo *</label>
          <select
            className="finput"
            required
            value={f.modelId}
            onChange={(e) => setF({ ...f, modelId: e.target.value })}
            disabled={!brand}
          >
            <option value="">
              {brand ? "Escolhe…" : "Escolhe a marca primeiro"}
            </option>
            {(brand?.models || []).map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="flabel">Versão</label>
          <input
            className="finput"
            placeholder="ex: 1.0 TCe Techno"
            value={f.version}
            onChange={(e) => setF({ ...f, version: e.target.value })}
          />
        </div>
        <div>
          <label className="flabel">Ano *</label>
          <input
            className="finput"
            type="number"
            required
            min={1950}
            max={2026}
            value={f.year}
            onChange={(e) => setF({ ...f, year: e.target.value })}
          />
        </div>
        <div>
          <label className="flabel">Quilómetros *</label>
          <input
            className="finput"
            type="number"
            required
            min={0}
            value={f.km}
            onChange={(e) => setF({ ...f, km: e.target.value })}
          />
        </div>
        <div>
          <label className="flabel">Combustível</label>
          <select
            className="finput"
            value={f.fuel}
            onChange={(e) => setF({ ...f, fuel: e.target.value })}
          >
            {FUELS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="flabel">Caixa</label>
          <select
            className="finput"
            value={f.gearbox}
            onChange={(e) => setF({ ...f, gearbox: e.target.value })}
          >
            {GEARS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="flabel">Potência (cv)</label>
          <input
            className="finput"
            type="number"
            value={f.power}
            onChange={(e) => setF({ ...f, power: e.target.value })}
          />
        </div>
        {isEV && (
          <div>
            <label className="flabel">⚡ Autonomia WLTP (km) *</label>
            <input
              className="finput"
              type="number"
              required
              placeholder="ex: 420"
              value={f.evRange}
              onChange={(e) => setF({ ...f, evRange: e.target.value })}
            />
          </div>
        )}
        <div>
          <label className="flabel">Distrito</label>
          <select
            className="finput"
            value={f.district}
            onChange={(e) => setF({ ...f, district: e.target.value })}
          >
            <option value="">Escolhe…</option>
            {DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="flabel">Descrição</label>
          <textarea
            className="finput"
            rows={4}
            placeholder="Estado, extras, revisões, motivo da venda…"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
          <AiDescriptionButton
            data={{
              marca: brand?.name,
              modelo: (brand?.models || []).find(
                (m: any) => String(m.id) === String(f.modelId)
              )?.name,
              versao: f.version,
              ano: f.year,
              km: f.km,
              fuel: f.fuel,
              caixa: f.gearbox,
              power: f.power,
              evRange: f.evRange,
              distrito: f.district,
              negociavel: f.negotiable,
              notas: f.description,
            }}
            onResult={(text) =>
              setF((prev: any) => ({ ...prev, description: text }))
            }
          />
        </div>
      </div>

      <PhotoUploader photos={photos} onChange={setPhotos} />

      <div className="rounded-2xl border border-outline bg-cream p-4">
        <label className="flex cursor-pointer items-center gap-2 font-head text-[1.1rem] font-bold text-ink">
          <input
            type="checkbox"
            checked={f.forSale}
            onChange={(e) => setF({ ...f, forSale: e.target.checked })}
            className="h-5 w-5 accent-clay"
          />
          Colocar já à venda
        </label>
        {f.forSale && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="flabel">Preço (€) *</label>
              <input
                className="finput"
                type="number"
                required
                min={1}
                value={f.price}
                onChange={(e) => setF({ ...f, price: e.target.value })}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-[0.92rem] font-semibold text-ink">
              <input
                type="checkbox"
                checked={f.negotiable}
                onChange={(e) => setF({ ...f, negotiable: e.target.checked })}
                className="h-4 w-4 accent-clay"
              />
              Aceito ofertas
            </label>
            <p className="text-[0.82rem] text-n2muted sm:col-span-2">
              O anúncio passa por validação da equipa antes de ficar visível.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[0.9rem] font-semibold text-red-700">{error}</p>
      )}
      <button className="btn-clay py-3.5 text-[1.15rem]" disabled={busy}>
        {busy
          ? "A guardar…"
          : f.forSale
            ? "Guardar e colocar à venda ✓"
            : "Guardar na garagem ✓"}
      </button>
    </form>
  );
}
