"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SalePanel({ car }: { car: any }) {
  const router = useRouter();
  const [forSale, setForSale] = useState(car.forSale);
  const [price, setPrice] = useState(car.price || "");
  const [negotiable, setNegotiable] = useState(car.negotiable);
  const [showPhone, setShowPhone] = useState(!!car.showPhone);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function save(nextForSale: boolean) {
    // para colocar à venda é preciso um preço válido
    if (nextForSale && !(+price > 0)) {
      setErr("Indica o preço de venda para colocar o carro à venda.");
      setMsg("");
      return;
    }
    setErr("");
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/cars/${car.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        forSale: nextForSale,
        price: +price || null,
        negotiable,
        showPhone,
      }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error || "Erro.");
      return;
    }
    setForSale(nextForSale);
    setMsg(
      nextForSale
        ? "✓ Enviado para validação — fica online assim que for aprovado."
        : "✓ Retirado de venda. Continua na tua garagem."
    );
    router.refresh();
  }

  // grava negociação/contacto sem mexer no estado de venda (não volta à moderação)
  async function saveSettings() {
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/cars/${car.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ negotiable, showPhone }),
    });
    setBusy(false);
    setMsg(res.ok ? "✓ Guardado." : "Erro ao guardar.");
    router.refresh();
  }

  return (
    <div className="n2-card p-5">
      <h3 className="mb-1 font-head text-[1.15rem] font-bold text-ink">
        Venda
      </h3>
      <p className="mb-3 text-[0.88rem] text-n2muted">
        {forSale
          ? "Este carro está marcado para venda."
          : "Este carro está só na garagem. Coloca-o à venda quando quiseres."}
      </p>
      <div className="flex flex-col gap-2">
        <div>
          <label className="flabel">Preço (€) *</label>
          <input
            type="number"
            className="finput"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              if (err && +e.target.value > 0) setErr("");
            }}
            placeholder="ex: 15500"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[0.92rem] font-semibold text-ink">
          <input
            type="checkbox"
            checked={negotiable}
            onChange={(e) => setNegotiable(e.target.checked)}
            className="h-4 w-4 accent-clay"
          />
          Aceito ofertas / negociação
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[0.92rem] font-semibold text-ink">
          <input
            type="checkbox"
            checked={showPhone}
            onChange={(e) => setShowPhone(e.target.checked)}
            className="h-4 w-4 accent-clay"
          />
          Mostrar o meu telefone no anúncio
        </label>
        {showPhone && (
          <p className="-mt-1 text-[0.8rem] text-n2muted">
            Usa o telefone definido em{" "}
            <a href="/conta" className="underline" target="_blank">
              A minha conta
            </a>
            .
          </p>
        )}
        {forSale ? (
          <>
            <button
              className="btn-ink btn-sm"
              disabled={busy}
              onClick={saveSettings}
            >
              Guardar alterações
            </button>
            <button
              className="btn-line"
              disabled={busy}
              onClick={() => save(false)}
            >
              Retirar de venda
            </button>
          </>
        ) : (
          <button
            className="btn-clay"
            disabled={busy}
            onClick={() => save(true)}
          >
            Colocar à venda →
          </button>
        )}
        {err && (
          <p className="rounded-lg bg-clay/10 px-3 py-2 text-[0.85rem] font-semibold text-clay">
            {err}
          </p>
        )}
        {msg && (
          <p className="text-[0.85rem] font-semibold text-olive">{msg}</p>
        )}
      </div>
    </div>
  );
}
