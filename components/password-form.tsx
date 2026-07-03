"use client";
import { useState } from "react";

export default function PasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error || "Erro.");
      return;
    }
    setMsg("Palavra-passe alterada ✓");
    setCurrent("");
    setNew("");
  }

  return (
    <form onSubmit={save} className="n2-card flex flex-col gap-3 p-6">
      <h2 className="font-head text-[1.2rem] font-bold text-ink">
        Alterar palavra-passe
      </h2>
      <div>
        <label className="flabel">Palavra-passe atual</label>
        <input
          type="password"
          className="finput"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="flabel">Nova palavra-passe</label>
        <input
          type="password"
          className="finput"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          autoComplete="new-password"
          placeholder="mín. 8 caracteres"
        />
      </div>
      {msg && <p className="text-[0.9rem] font-semibold text-bark">{msg}</p>}
      <button type="submit" disabled={busy} className="btn-line">
        {busy ? "A guardar…" : "Alterar palavra-passe"}
      </button>
    </form>
  );
}
