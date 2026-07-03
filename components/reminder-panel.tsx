"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { REMINDER_TYPES } from "@/lib/constants";

export default function ReminderPanel({
  carId,
  reminders,
}: {
  carId: string;
  reminders: any[];
}) {
  const router = useRouter();
  const [f, setF] = useState({
    type: "IPO",
    title: "",
    dueDate: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId, ...f }),
    });
    setF({ type: "IPO", title: "", dueDate: "", notes: "" });
    setBusy(false);
    router.refresh();
  }
  async function toggle(id: string, done: boolean) {
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    router.refresh();
  }
  async function remove(id: string) {
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const soon = (d: string | Date) =>
    (new Date(d).getTime() - Date.now()) / 86400000 < 30;

  return (
    <div className="n2-card p-5">
      <h3 className="mb-1 font-head text-[1.15rem] font-bold text-ink">
        🔔 Lembretes
      </h3>
      <p className="mb-3 text-[0.88rem] text-n2muted">
        IPO, seguro, manutenção, IUC — nunca mais te esqueças.
      </p>
      <ul className="mb-4 flex flex-col gap-1.5">
        {reminders.length === 0 && (
          <li className="text-[0.88rem] text-n2muted2">
            Sem lembretes para este carro.
          </li>
        )}
        {reminders.map((r) => (
          <li
            key={r.id}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.9rem] text-ink ${r.done ? "bg-cream text-n2muted2 line-through" : soon(r.dueDate) ? "bg-[#FBE9DC]" : "bg-cream"}`}
          >
            <input
              type="checkbox"
              checked={r.done}
              onChange={(e) => toggle(r.id, e.target.checked)}
              className="h-4 w-4 accent-olive"
            />
            <span className="font-semibold">{r.type}</span> · {r.title} —{" "}
            {new Date(r.dueDate).toLocaleDateString("pt-PT")}
            {!r.done && soon(r.dueDate) && (
              <span className="text-[0.7rem] font-bold uppercase text-[#8a3b12]">
                em breve
              </span>
            )}
            <button
              onClick={() => remove(r.id)}
              className="ml-auto text-n2muted2 hover:text-red-700"
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
          {REMINDER_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input
          className="finput"
          type="date"
          required
          value={f.dueDate}
          onChange={(e) => setF({ ...f, dueDate: e.target.value })}
        />
        <input
          className="finput col-span-2"
          placeholder="ex: Inspeção periódica no centro de Viseu"
          required
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
        />
        <button className="btn-olive btn-xs col-span-2" disabled={busy}>
          Adicionar lembrete
        </button>
      </form>
    </div>
  );
}
