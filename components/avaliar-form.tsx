"use client";
import { useState } from "react";
import Link from "next/link";
import { FUELS } from "@/lib/constants";

const eur = (n: number) => new Intl.NumberFormat("pt-PT").format(n) + " €";

export default function AvaliarForm({
  brands,
}: {
  brands: { name: string; models: string[] }[];
}) {
  const [f, setF] = useState({
    marca: "",
    modelo: "",
    ano: "",
    km: "",
    fuel: "",
  });
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [done, setDone] = useState(false);

  const brand = brands.find((b) => b.name === f.marca);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setDone(false);
    const p = new URLSearchParams();
    if (f.marca) p.set("marca", f.marca);
    if (f.modelo) p.set("modelo", f.modelo);
    if (f.ano) p.set("ano", f.ano);
    const r = await fetch("/api/avaliar?" + p.toString());
    const j = await r.json();
    setRes(j.stats);
    setLoading(false);
    setDone(true);
  }

  const carrosLink = () => {
    const p = new URLSearchParams();
    if (f.marca) p.set("marca", f.marca);
    if (f.modelo) p.set("modelo", f.modelo);
    return "/carros?" + p.toString();
  };

  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      <form onSubmit={submit} className="n2-card flex flex-col gap-3 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="flabel">Marca *</label>
            <select
              className="finput"
              required
              value={f.marca}
              onChange={(e) =>
                setF({ ...f, marca: e.target.value, modelo: "" })
              }
            >
              <option value="">Escolhe…</option>
              {brands.map((b) => (
                <option key={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="flabel">Modelo *</label>
            <select
              className="finput"
              required
              value={f.modelo}
              onChange={(e) => setF({ ...f, modelo: e.target.value })}
              disabled={!brand}
              key={f.marca}
            >
              <option value="">{brand ? "Escolhe…" : "Marca primeiro"}</option>
              {(brand?.models || []).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="flabel">Ano</label>
            <input
              className="finput"
              type="number"
              min={1980}
              max={2026}
              value={f.ano}
              onChange={(e) => setF({ ...f, ano: e.target.value })}
              placeholder="ex: 2019"
            />
          </div>
          <div>
            <label className="flabel">Quilómetros</label>
            <input
              className="finput"
              type="number"
              value={f.km}
              onChange={(e) => setF({ ...f, km: e.target.value })}
              placeholder="ex: 90000"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="flabel">Combustível</label>
            <select
              className="finput"
              value={f.fuel}
              onChange={(e) => setF({ ...f, fuel: e.target.value })}
            >
              <option value="">Todos</option>
              {FUELS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn-clay" disabled={loading}>
          {loading ? "A avaliar…" : "Avaliar o meu carro"}
        </button>
      </form>

      <div className="n2-card flex min-h-[220px] flex-col justify-center p-6 text-center">
        {!done ? (
          <p className="text-n2muted">
            Preenche os dados e mostramos-te por quanto estão à venda carros
            semelhantes, com base em milhares de anúncios.
          </p>
        ) : res ? (
          <>
            <span className="font-head text-[0.82rem] font-bold uppercase tracking-wide text-clay">
              Valor de mercado estimado
            </span>
            <div className="my-1 font-head text-[2rem] font-extrabold text-ink">
              {eur(res.p25)} – {eur(res.p75)}
            </div>
            <p className="text-[0.9rem] text-n2muted">
              Mediana <b className="text-ink">{eur(res.median)}</b> · com base
              em {res.count} anúncios semelhantes
            </p>
            <Link
              href={carrosLink()}
              className="btn-line btn-sm mt-4 inline-block"
            >
              Ver esses carros
            </Link>
          </>
        ) : (
          <p className="text-n2muted">
            Ainda não temos anúncios suficientes deste modelo para uma
            estimativa fiável. Experimenta um modelo mais comum.
          </p>
        )}
      </div>
    </div>
  );
}
