"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReportActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(next: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-1.5">
      {status !== "REVIEWED" && (
        <button
          className="btn-line btn-xs"
          disabled={busy}
          onClick={() => set("REVIEWED")}
        >
          Marcar revisto
        </button>
      )}
      {status !== "DISMISSED" && (
        <button
          className="btn-line btn-xs"
          disabled={busy}
          onClick={() => set("DISMISSED")}
        >
          Descartar
        </button>
      )}
      {status !== "NEW" && (
        <button
          className="btn-line btn-xs"
          disabled={busy}
          onClick={() => set("NEW")}
        >
          Reabrir
        </button>
      )}
    </div>
  );
}
