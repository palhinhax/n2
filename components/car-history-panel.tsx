"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CAR_EVENT_TYPES, fmtEur } from "@/lib/constants";

// Historial documentado do carro (garagem): revisões, IPO, reparações…
// O custo é privado; o resto pode aparecer no anúncio público como selo.
export default function CarHistoryPanel({
  carId,
  events,
}: {
  carId: string;
  events: any[];
}) {
  const router = useRouter();
  const [f, setF] = useState({
    type: "Revisão",
    date: "",
    km: "",
    cost: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/car-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId, ...f }),
    });
    setF({ type: "Revisão", date: "", km: "", cost: "", note: "" });
    setBusy(false);
    router.refresh();
  }
  async function remove(id: string) {
    await fetch(`/api/car-events/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="n2-card p-5">
      <h3 className="mb-1 font-head text-[1.15rem] font-bold text-ink">
        📋 Historial documentado
      </h3>
      <p className="mb-3 text-[0.88rem] text-n2muted">
        Regista revisões, IPO e reparações. Quando puseres o carro à venda, o
        anúncio ganha o selo <b>“Historial documentado”</b> com esta timeline —
        os custos ficam privados.
      </p>
      <ul className="mb-4 flex flex-col gap-1.5">
        {events.length === 0 && (
          <li className="text-[0.88rem] text-n2muted2">
            Ainda sem registos para este carro.
          </li>
        )}
        {events.map((ev) => (
          <li
            key={ev.id}
            className="flex items-start gap-2 rounded-lg bg-cream px-2.5 py-1.5 text-[0.9rem] text-ink"
          >
            <div className="min-w-0 flex-1">
              <b>{ev.type}</b> · {new Date(ev.date).toLocaleDateString("pt-PT")}
              {ev.km != null && <> · {ev.km.toLocaleString("pt-PT")} km</>}
              {ev.cost != null && (
                <span className="text-n2muted"> · {fmtEur(ev.cost)} 🔒</span>
              )}
              {ev.note && (
                <small className="block text-n2muted">{ev.note}</small>
              )}
            </div>
            <button
              onClick={() => remove(ev.id)}
              className="text-n2muted2 hover:text-red-700"
              title="Apagar"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="grid grid-cols-2 gap-2">
        <select
          className="finput"
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value })}
        >
          {CAR_EVENT_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input
          className="finput"
          type="date"
          required
          value={f.date}
          onChange={(e) => setF({ ...f, date: e.target.value })}
        />
        <input
          className="finput"
          type="number"
          placeholder="Km (opcional)"
          value={f.km}
          onChange={(e) => setF({ ...f, km: e.target.value })}
        />
        <input
          className="finput"
          type="number"
          placeholder="Custo € (privado)"
          value={f.cost}
          onChange={(e) => setF({ ...f, cost: e.target.value })}
        />
        <input
          className="finput col-span-2"
          placeholder="Nota — ex: revisão dos 120 000 na Bosch Service"
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
        <button className="btn-olive btn-xs col-span-2" disabled={busy}>
          Adicionar registo
        </button>
      </form>
    </div>
  );
}
