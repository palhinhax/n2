"use client";
import { useRouter } from "next/navigation";
import { fmtEur } from "@/lib/constants";

export default function OffersReceived({ offers }: { offers: any[] }) {
  const router = useRouter();
  async function act(id: string, status: string) {
    await fetch(`/api/offers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }
  const LABEL: Record<string, string> = {
    PENDING: "Pendente",
    ACCEPTED: "Aceite ✓",
    REJECTED: "Recusada",
    WITHDRAWN: "Retirada",
  };
  return (
    <div className="n2-card p-5">
      <h3 className="mb-3 font-head text-[1.15rem] font-bold text-ink">
        💶 Ofertas recebidas
      </h3>
      {offers.length === 0 && (
        <p className="text-[0.88rem] text-n2muted2">Ainda sem ofertas.</p>
      )}
      <ul className="flex flex-col gap-2">
        {offers.map((o) => (
          <li key={o.id} className="rounded-xl bg-cream px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <b className="font-head text-[1.15rem] text-ink">
                {fmtEur(o.amount)}
              </b>
              <span className="text-[0.85rem] text-n2muted">
                de {o.buyer.name}
              </span>
              <span
                className={`n2-tag ${o.status === "ACCEPTED" ? "bg-olive" : o.status === "PENDING" ? "bg-clay" : "bg-weathered"} ml-auto`}
              >
                {LABEL[o.status]}
              </span>
            </div>
            {o.message && (
              <p className="mt-1 text-[0.85rem] text-n2muted">“{o.message}”</p>
            )}
            {o.status === "PENDING" && (
              <div className="mt-2 flex gap-2">
                <button
                  className="btn-olive btn-xs"
                  onClick={() => act(o.id, "ACCEPTED")}
                >
                  Aceitar
                </button>
                <button
                  className="btn-line btn-xs"
                  onClick={() => act(o.id, "REJECTED")}
                >
                  Recusar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
