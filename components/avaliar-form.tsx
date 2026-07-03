"use client";
import { useState } from "react";
import Link from "next/link";
import { FUELS, GEARS } from "@/lib/constants";
import BrandCombobox from "@/components/brand-combobox";

const eur = (n: number) => new Intl.NumberFormat("pt-PT").format(n) + " €";

const CONFIDENCE_LABEL: Record<string, string> = {
  alta: "Confiança alta",
  media: "Confiança média",
  baixa: "Confiança baixa",
};

interface Similar {
  id: string;
  title: string;
  price: number;
  year: number | null;
  km: number | null;
  url: string;
}

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
    caixa: "",
    versao: "",
    notas: "",
  });
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const brand = brands.find((b) => b.name === f.marca);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.marca || !f.modelo) {
      setErr("Escolhe a marca e o modelo para avaliar.");
      return;
    }
    if (f.ano && (Number(f.ano) < 1950 || Number(f.ano) > 2026)) {
      setErr("Indica um ano válido (entre 1950 e 2026).");
      return;
    }
    if (f.km && Number(f.km) < 0) {
      setErr("Os quilómetros não podem ser negativos.");
      return;
    }
    setErr(null);
    setLoading(true);
    setDone(false);
    try {
      const r = await fetch("/api/avaliar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error ?? "Não foi possível avaliar. Tenta outra vez.");
        setLoading(false);
        return;
      }
      setRes(j);
      setDone(true);
    } catch {
      setErr("Não foi possível avaliar. Tenta outra vez.");
    }
    setLoading(false);
  }

  const carrosLink = () => {
    const p = new URLSearchParams();
    if (f.marca) p.set("marca", f.marca);
    if (f.modelo) p.set("modelo", f.modelo);
    return "/carros?" + p.toString();
  };

  const ai = res?.ai ?? null;
  const stats = res?.stats ?? null;
  const similar: Similar[] = res?.similar ?? [];

  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      <form onSubmit={submit} className="n2-card flex flex-col gap-3 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="flabel">Marca *</label>
            <BrandCombobox
              brands={brands.map((b) => b.name)}
              value={f.marca}
              placeholder="Escolhe…"
              onSelect={(v) => setF({ ...f, marca: v, modelo: "" })}
            />
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
              min={0}
              step={1000}
              value={f.km}
              onChange={(e) => setF({ ...f, km: e.target.value })}
              placeholder="ex: 90000"
            />
          </div>
          <div>
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
          <div>
            <label className="flabel">Caixa</label>
            <select
              className="finput"
              value={f.caixa}
              onChange={(e) => setF({ ...f, caixa: e.target.value })}
            >
              <option value="">Qualquer</option>
              {GEARS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="flabel">Versão / motorização</label>
            <input
              className="finput"
              type="text"
              maxLength={60}
              value={f.versao}
              onChange={(e) => setF({ ...f, versao: e.target.value })}
              placeholder="ex: 1.5 dCi Tekna"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="flabel">Estado e extras (opcional)</label>
            <textarea
              className="finput min-h-[70px]"
              maxLength={500}
              value={f.notas}
              onChange={(e) => setF({ ...f, notas: e.target.value })}
              placeholder="ex: único dono, revisões na marca, pneus novos, risco na porta…"
            />
            <p className="mt-1 text-[0.74rem] text-n2muted2">
              Quanto mais detalhes deres, mais afinada fica a avaliação.
            </p>
          </div>
        </div>
        {err && (
          <p className="rounded-lg bg-clay/10 px-3 py-2 text-[0.85rem] font-semibold text-clay">
            {err}
          </p>
        )}
        <button className="btn-clay" disabled={loading}>
          {loading ? "A avaliar…" : "Avaliar o meu carro"}
        </button>
      </form>

      <div className="flex flex-col gap-4">
        <div className="n2-card flex min-h-[220px] flex-col justify-center p-6 text-center">
          {!done ? (
            <p className="text-n2muted">
              {loading
                ? "A analisar anúncios semelhantes e a preparar a avaliação…"
                : "Preenche os dados e mostramos-te por quanto estão à venda carros semelhantes — com análise inteligente do valor do teu carro."}
            </p>
          ) : ai ? (
            <>
              <span className="font-head text-[0.82rem] font-bold uppercase tracking-wide text-clay">
                Valor estimado do teu carro
              </span>
              <div className="my-1 font-head text-[2rem] font-extrabold text-ink">
                {eur(ai.low)} – {eur(ai.high)}
              </div>
              <p className="text-[0.95rem] text-n2muted">
                Preço de anúncio recomendado:{" "}
                <b className="text-olive">{eur(ai.recommended)}</b>
              </p>
              <span className="mx-auto mt-1.5 inline-block rounded-full bg-bark/10 px-2.5 py-0.5 text-[0.74rem] font-bold text-bark">
                {CONFIDENCE_LABEL[ai.confidence] ?? "Confiança média"}
              </span>
              <p className="mt-3 text-left text-[0.92rem] leading-relaxed text-ink/90">
                {ai.text}
              </p>
              {stats && (
                <p className="mt-2 text-[0.8rem] text-n2muted">
                  Mercado: mediana <b>{eur(stats.median)}</b> · com base em{" "}
                  {stats.count} anúncios semelhantes
                </p>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href="/garagem/novo" className="btn-clay btn-sm">
                  Criar anúncio grátis com este preço
                </Link>
                <Link href={carrosLink()} className="btn-line btn-sm">
                  Ver carros semelhantes
                </Link>
              </div>
            </>
          ) : stats ? (
            <>
              <span className="font-head text-[0.82rem] font-bold uppercase tracking-wide text-clay">
                Valor de mercado estimado
              </span>
              <div className="my-1 font-head text-[2rem] font-extrabold text-ink">
                {eur(stats.p25)} – {eur(stats.p75)}
              </div>
              <p className="text-[0.9rem] text-n2muted">
                Mediana <b className="text-ink">{eur(stats.median)}</b> · com
                base em {stats.count} anúncios semelhantes
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href="/garagem/novo" className="btn-clay btn-sm">
                  Criar anúncio grátis
                </Link>
                <Link href={carrosLink()} className="btn-line btn-sm">
                  Ver esses carros
                </Link>
              </div>
            </>
          ) : (
            <p className="text-n2muted">
              Ainda não temos anúncios suficientes deste modelo para uma
              estimativa fiável. Experimenta um modelo mais comum.
            </p>
          )}
          {done && (ai || stats) && (
            <p className="mt-3 border-t border-outline pt-2 text-[0.72rem] leading-snug text-n2muted2">
              Estimativa automática com base em anúncios ativos — não é uma
              avaliação oficial. O valor final depende do estado real do carro.
            </p>
          )}
        </div>

        {done && similar.length > 0 && (
          <div className="n2-card p-5">
            <h3 className="mb-2 font-head text-[1rem] font-bold text-ink">
              Comparáveis usados nesta avaliação
            </h3>
            <ul className="divide-y divide-outline">
              {similar.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link
                    href={s.url}
                    className="flex items-center justify-between gap-3 py-2 text-[0.88rem] hover:bg-cream"
                  >
                    <span className="min-w-0 truncate font-medium text-ink">
                      {s.title}
                      <span className="ml-1.5 font-normal text-n2muted">
                        {s.year ?? ""}
                        {s.km != null
                          ? ` · ${s.km.toLocaleString("pt-PT")} km`
                          : ""}
                      </span>
                    </span>
                    <b className="shrink-0 text-ink">{eur(s.price)}</b>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
