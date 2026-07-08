"use client";

import { useState } from "react";
import { IMPORT_COUNTRIES } from "@/lib/import-countries";

/** Botão "Quero importar este carro" + formulário de lead. */
export default function ImportLeadButton({
  listingId,
  vehicleTitle,
  country,
  suggestedBudget,
}: {
  listingId?: string;
  vehicleTitle?: string;
  country?: string;
  suggestedBudget?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/importar/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          listingId,
          vehicleTitle,
          country: fd.get("country"),
          budget: fd.get("budget"),
          contactPref: fd.get("contactPref"),
          message: fd.get("message"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Não foi possível enviar");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button className="btn-clay w-full" onClick={() => setOpen(true)}>
        🚚 Quero importar este carro
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="n2-card max-h-[90vh] w-full max-w-md overflow-y-auto bg-cream p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="py-6 text-center">
                <div className="mb-2 text-[2rem]">✅</div>
                <h3 className="font-head text-[1.2rem] font-bold text-ink">
                  Pedido enviado!
                </h3>
                <p className="mb-4 text-[0.9rem] text-n2muted">
                  Entraremos em contacto em breve para ajudar com a importação
                  {vehicleTitle ? ` do ${vehicleTitle}` : ""}.
                </p>
                <button
                  className="btn-line btn-sm"
                  onClick={() => setOpen(false)}
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-head text-[1.2rem] font-bold text-ink">
                      Ajuda para importar
                    </h3>
                    {vehicleTitle && (
                      <p className="text-[0.85rem] text-n2muted">
                        {vehicleTitle}
                      </p>
                    )}
                  </div>
                  <button
                    className="text-n2muted hover:text-ink"
                    onClick={() => setOpen(false)}
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>
                <form className="flex flex-col gap-3" onSubmit={submit}>
                  <div>
                    <label className="flabel">Nome *</label>
                    <input name="name" required className="finput" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="flabel">Email *</label>
                      <input
                        name="email"
                        type="email"
                        required
                        className="finput"
                      />
                    </div>
                    <div>
                      <label className="flabel">Telefone</label>
                      <input name="phone" type="tel" className="finput" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="flabel">País do carro</label>
                      <select
                        name="country"
                        className="finput"
                        defaultValue={country || ""}
                      >
                        <option value="">—</option>
                        {IMPORT_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="flabel">Orçamento total (€)</label>
                      <input
                        name="budget"
                        type="number"
                        min={0}
                        step={500}
                        className="finput"
                        defaultValue={suggestedBudget ?? ""}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flabel">Contacto preferido</label>
                    <select name="contactPref" className="finput">
                      <option value="email">Email</option>
                      <option value="telefone">Telefone</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  <div>
                    <label className="flabel">Mensagem (opcional)</label>
                    <textarea
                      name="message"
                      rows={3}
                      className="finput"
                      placeholder="Dúvidas, prazos, condições do carro…"
                    />
                  </div>
                  {error && (
                    <p className="text-[0.85rem] font-semibold text-clay">
                      {error}
                    </p>
                  )}
                  <button className="btn-clay" disabled={sending}>
                    {sending ? "A enviar…" : "Pedir ajuda para importar"}
                  </button>
                  <p className="text-[0.72rem] leading-snug text-n2muted2">
                    Ao enviar aceitas ser contactado sobre este pedido. Os teus
                    dados não são partilhados com terceiros.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
