"use client";

import { useMemo, useState } from "react";
import {
  FIN_APR,
  FIN_DEFAULT_DOWN_PCT,
  FIN_DEFAULT_MONTHS,
  FIN_MONTHS_OPTIONS,
  monthlyPayment,
} from "@/lib/finance";

const eur = (n: number) => n.toLocaleString("pt-PT") + " €";

export default function FinanceSimulator({
  price,
  carId,
  listingId,
  vehicleTitle,
}: {
  price: number;
  carId?: string;
  listingId?: string;
  vehicleTitle?: string;
}) {
  const [down, setDown] = useState(Math.round(price * FIN_DEFAULT_DOWN_PCT));
  const [months, setMonths] = useState(FIN_DEFAULT_MONTHS);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const monthly = useMemo(
    () => monthlyPayment(price, down, months),
    [price, down, months]
  );
  const financed = Math.max(price - down, 0);
  const downPct = price > 0 ? Math.round((down / price) * 100) : 0;
  const trackFill = `linear-gradient(90deg,#b4552d 0%,#b4552d ${downPct}%,#ece0c6 ${downPct}%,#ece0c6 100%)`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) {
      setErr("Indica o nome e o email para pedirmos a proposta.");
      return;
    }
    setErr(null);
    setSending(true);
    try {
      const res = await fetch("/api/finance-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          carId,
          listingId,
          vehicleTitle,
          price,
          downPayment: down,
          months,
          monthlyEstimate: monthly,
        }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setErr("Não foi possível enviar. Tenta novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="n2-card overflow-hidden">
      {/* cabeçalho */}
      <div className="flex items-center gap-2 border-b border-outline px-5 pb-3 pt-4">
        <span className="bg-clay/12 grid h-8 w-8 place-items-center rounded-full text-[1rem]">
          💶
        </span>
        <h2 className="font-head text-[1.05rem] font-bold text-ink">
          Simular financiamento
        </h2>
      </div>

      {/* hero da prestação */}
      <div className="bg-gradient-to-br from-[#FCF4E2] to-[#F5E6C6] px-5 py-5 text-center">
        <div className="font-head text-[0.72rem] font-bold uppercase tracking-widest text-clay">
          Prestação estimada
        </div>
        <div className="mt-0.5 flex items-baseline justify-center gap-1">
          <span className="font-head text-[2.6rem] font-extrabold leading-none text-ink">
            {eur(monthly)}
          </span>
          <span className="text-[1rem] font-bold text-n2muted">/mês</span>
        </div>
        <div className="mt-1.5 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 rounded-full bg-white/70 px-3 py-1 text-[0.78rem] font-semibold text-n2muted">
          <span>{months} meses</span>
          <span className="text-outline2">·</span>
          <span>entrada {eur(down)}</span>
          <span className="text-outline2">·</span>
          <span>financia {eur(financed)}</span>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div>
          <div className="mb-2 flex items-center justify-between text-[0.85rem] font-semibold text-ink">
            <span>Entrada</span>
            <span className="rounded-full bg-cream px-2 py-0.5 text-[0.78rem] text-n2muted">
              {eur(down)} · {downPct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={price}
            step={250}
            value={down}
            onChange={(e) => setDown(Number(e.target.value))}
            className="n2-range"
            style={{ background: trackFill }}
          />
        </div>

        <div>
          <label className="mb-2 block text-[0.85rem] font-semibold text-ink">
            Prazo
          </label>
          <div className="flex flex-wrap gap-1.5">
            {FIN_MONTHS_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                className={`rounded-full border px-3 py-1.5 text-[0.82rem] font-bold transition ${
                  months === m
                    ? "border-clay bg-clay text-white shadow-warm"
                    : "border-outline2 bg-white text-n2muted hover:border-clay"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        {!open && !done && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-clay w-full"
          >
            Pedir proposta grátis →
          </button>
        )}

        {open && !done && (
          <form onSubmit={submit} className="space-y-2.5">
            <input
              className="finput"
              placeholder="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="finput"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="finput"
              type="tel"
              placeholder="Telemóvel (opcional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            {err && (
              <p className="rounded-lg bg-clay/10 px-3 py-2 text-[0.82rem] font-semibold text-clay">
                {err}
              </p>
            )}
            <button className="btn-clay w-full" disabled={sending}>
              {sending ? "A enviar…" : "Enviar pedido"}
            </button>
          </form>
        )}

        {done && (
          <div className="flex items-start gap-2 rounded-xl border border-olive/30 bg-olive/10 p-3 text-[0.88rem] font-medium text-ink">
            <span className="text-olive">✓</span>
            <span>
              Pedido enviado. Entramos em contacto com uma proposta
              personalizada.
            </span>
          </div>
        )}

        <p className="text-[0.72rem] leading-snug text-n2muted2">
          Valor indicativo (TAEG estimada {(FIN_APR * 100).toFixed(1)}%).
          Sujeito a aprovação. Não é uma oferta de crédito.
        </p>
      </div>
    </div>
  );
}
