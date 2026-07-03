"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUploader from "@/components/photo-uploader";
import { FUELS, GEARS, DISTRICTS, ELECTRIFIED } from "@/lib/constants";

export default function EditCarForm({ car }: { car: any }) {
  const router = useRouter();
  const [brands, setBrands] = useState<any[]>([]);
  const [f, setF] = useState<any>({
    brandId: String(car.brandId),
    modelId: String(car.modelId),
    version: car.version || "",
    year: String(car.year),
    km: String(car.km),
    fuel: car.fuel,
    gearbox: car.gearbox,
    power: car.power != null ? String(car.power) : "",
    evRange: car.evRange != null ? String(car.evRange) : "",
    district: car.district || "",
    description: car.description || "",
  });
  const [photos, setPhotos] = useState<any[]>(
    (car.photos || []).map((p: any) => ({ key: p.key, url: p.url }))
  );
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
    const res = await fetch(`/api/cars/${car.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, photos }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(j.error || "Erro ao guardar.");
      return;
    }
    router.push(`/garagem/${car.id}`);
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
        </div>
      </div>

      <PhotoUploader photos={photos} onChange={setPhotos} />

      {error && (
        <p className="text-[0.88rem] font-semibold text-red-700">{error}</p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-clay flex-1">
          {busy ? "A guardar…" : "Guardar alterações ✓"}
        </button>
        <button
          type="button"
          className="btn-line"
          onClick={() => router.push(`/garagem/${car.id}`)}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
