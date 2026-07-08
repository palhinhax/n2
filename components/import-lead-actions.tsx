"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Mudar o estado de uma lead de importação (painel de admin). */
export default function ImportLeadActions({
  leadId,
  status,
}: {
  leadId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: string) {
    setBusy(true);
    await fetch(`/api/admin/import/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <select
      className="finput !w-auto !py-1 text-[0.82rem]"
      defaultValue={status}
      disabled={busy}
      onChange={(e) => setStatus(e.target.value)}
    >
      <option value="NEW">Nova</option>
      <option value="CONTACTED">Contactada</option>
      <option value="CLOSED">Fechada</option>
    </select>
  );
}
