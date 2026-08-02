"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";

export default function AdminHideListingButton({
  id,
  hidden,
}: {
  id: string;
  hidden: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const Icon = hidden ? RotateCcw : Trash2;

  async function toggle() {
    if (
      !hidden &&
      !confirm(
        "Apagar este anúncio do site? Sai de todas as listagens e o scraper não o volta a repor."
      )
    )
      return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: hidden ? "PATCH" : "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(hidden ? "Anúncio reposto." : "Anúncio apagado do site.");
        router.refresh();
      } else {
        setMsg(`Erro: ${data.error}`);
      }
    } catch (err) {
      setMsg(`Erro: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="btn-line btn-xs inline-flex items-center gap-1.5 text-[#C6603B] disabled:opacity-50"
      >
        {!loading && <Icon className="h-3.5 w-3.5" aria-hidden />}
        {loading
          ? "Aguarda..."
          : hidden
            ? "Repor anúncio (admin)"
            : "Apagar anúncio (admin)"}
      </button>
      {msg && <span className="ml-2 text-[0.78rem] text-n2muted">{msg}</span>}
    </div>
  );
}
