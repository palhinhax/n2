"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function OfferPanel({
  carId,
  price,
  negotiable,
  isOwner,
}: {
  carId: string;
  price: number;
  negotiable: boolean;
  isOwner: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<string>("idle");

  if (isOwner)
    return (
      <p className="text-[0.85rem] font-semibold text-n2muted">
        Este anúncio é teu — gere as ofertas na garagem.
      </p>
    );
  if (!negotiable)
    return (
      <p className="text-[0.85rem] font-semibold text-n2muted">
        O vendedor definiu preço fixo (sem ofertas).
      </p>
    );
  if (state === "sent")
    return (
      <p className="font-semibold text-olive">
        ✓ Oferta enviada! O vendedor vai ser notificado.
      </p>
    );

  async function send() {
    if (!session) {
      router.push("/auth/login?callbackUrl=/carros/" + carId);
      return;
    }
    setState("busy");
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId, amount: +amount, message }),
    });
    const j = await res.json();
    setState(res.ok ? "sent" : j.error || "Erro ao enviar.");
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flabel">Fazer uma oferta</label>
      <div className="flex gap-2">
        <input
          type="number"
          className="finput"
          placeholder={`ex: ${Math.round((price * 0.93) / 100) * 100}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          className="btn-ink btn-xs"
          disabled={state === "busy" || !(+amount > 0)}
          onClick={send}
        >
          Enviar
        </button>
      </div>
      <input
        className="finput"
        placeholder="Mensagem (opcional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {!["idle", "busy", "sent"].includes(state) && (
        <p className="text-[0.82rem] font-semibold text-red-700">{state}</p>
      )}
      {!session && (
        <p className="text-[0.78rem] text-n2muted">
          Precisas de sessão iniciada para enviar ofertas.
        </p>
      )}
    </div>
  );
}
