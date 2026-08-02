"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawOfferButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function withdraw() {
    setBusy(true);
    await fetch(`/api/offers/${offerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "WITHDRAWN" }),
    });
    router.refresh();
  }
  return (
    <button className="btn-line btn-xs" disabled={busy} onClick={withdraw}>
      {busy ? "A retirar…" : "Retirar proposta"}
    </button>
  );
}
