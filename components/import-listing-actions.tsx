"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Botões de moderação de um anúncio estrangeiro (painel de admin). */
export default function ImportListingActions({
  listingId,
  status,
}: {
  listingId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: string) {
    setBusy(true);
    await fetch(`/api/admin/import/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      {status !== "APPROVED" && (
        <button
          className="btn-line btn-xs"
          disabled={busy}
          onClick={() => setStatus("APPROVED")}
        >
          ✓ Aprovar
        </button>
      )}
      {status !== "REJECTED" && (
        <button
          className="btn-line btn-xs"
          disabled={busy}
          onClick={() => setStatus("REJECTED")}
        >
          ✕ Rejeitar
        </button>
      )}
      {status !== "EXPIRED" && (
        <button
          className="btn-line btn-xs"
          disabled={busy}
          onClick={() => setStatus("EXPIRED")}
        >
          ⏳ Expirar
        </button>
      )}
    </div>
  );
}
