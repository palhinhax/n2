"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// Guarda os filtros atuais como uma pesquisa (para alertas).
export default function SaveSearchButton() {
  const { status } = useSession();
  const router = useRouter();
  const sp = useSearchParams();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (status !== "authenticated") {
      router.push("/auth/login");
      return;
    }
    setBusy(true);
    const body: Record<string, string> = {};
    for (const k of [
      "marca",
      "modelo",
      "precoMax",
      "fuel",
      "caixa",
      "anoMin",
      "kmMax",
      "carroceria",
      "cor",
      "potMin",
      "lugares",
      "mensalMax",
    ]) {
      const v = sp.get(k);
      if (v) body[k] = v;
    }
    const res = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) setSaved(true);
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={busy || saved}
      className="n2-chip disabled:opacity-60"
      title="Recebe alertas quando entram carros novos nesta pesquisa"
    >
      {saved ? "✓ Pesquisa guardada" : "🔔 Guardar pesquisa"}
    </button>
  );
}
