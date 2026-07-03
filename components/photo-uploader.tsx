"use client";
import { useState } from "react";

// Upload direto para Backblaze B2 via URL pré-assinado.
// Sem B2 configurado no .env, mostra aviso e o carro usa a ilustração.
export default function PhotoUploader({
  photos,
  onChange,
}: {
  photos: any[];
  onChange: (p: any[]) => void;
}) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    setMsg("");
    const added: any[] = [];
    for (const file of files.slice(0, 8 - photos.length)) {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const j = await res.json();
      if (!res.ok || !j.configured) {
        setMsg(
          "⚠ Backblaze B2 não configurado — o anúncio usa a ilustração até configurares o .env."
        );
        break;
      }
      const up = await fetch(j.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (up.ok) added.push({ key: j.key, url: j.publicUrl });
      else setMsg("Erro no upload de " + file.name);
    }
    if (added.length) onChange([...photos, ...added]);
    setBusy(false);
  }

  return (
    <div>
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-outline2 bg-cream p-7 text-center transition hover:border-clay">
        <b className="block font-head text-[1.1rem] text-ink">
          📷 {busy ? "A enviar…" : "Adicionar fotos"}
        </b>
        <span className="text-[0.85rem] text-n2muted">
          até 8 fotos · JPG/PNG · a primeira é a capa
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={pick}
          disabled={busy}
        />
      </label>
      {photos.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {photos.map((p, i) => (
            <div key={p.key} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt=""
                className="aspect-[4/3] rounded-lg border border-outline object-cover"
              />
              {i === 0 && (
                <span className="n2-tag absolute left-1 top-1 bg-clay">
                  Capa
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(photos.filter((x) => x.key !== p.key))}
                className="absolute right-1 top-1 h-6 w-6 rounded-full border border-outline2 bg-white/90 text-[0.8rem]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {msg && (
        <p className="mt-2 text-[0.82rem] font-semibold text-bark">{msg}</p>
      )}
    </div>
  );
}
