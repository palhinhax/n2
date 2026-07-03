"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshDetailsButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/listings/${id}/refresh`, {
        method: "POST",
      });
      const data = await res.json();
      setMsg(
        res.ok ? `Atualizado — ${data.photos} fotos` : `Erro: ${data.error}`
      );
      if (res.ok) router.refresh();
    } catch (err) {
      setMsg(`Erro: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="btn-line btn-xs disabled:opacity-50"
      >
        {loading ? "A atualizar…" : "↻ Atualizar detalhes (admin)"}
      </button>
      {msg && <span className="ml-2 text-[0.78rem] text-n2muted">{msg}</span>}
    </div>
  );
}
