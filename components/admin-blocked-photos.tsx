"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Fotos que um admin apagou de um anúncio externo — dá para repor. */
export default function AdminBlockedPhotos({
  id,
  photos,
}: {
  id: string;
  photos: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (photos.length === 0) return null;

  async function restore(url: string) {
    setErr(null);
    setBusy(url);
    const res = await fetch("/api/admin/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "scraped", id, url, restore: true }),
    }).catch(() => null);
    setBusy(null);
    if (!res || !res.ok) {
      const j = res ? await res.json().catch(() => ({})) : {};
      setErr((j as any).error || "Não foi possível repor a foto.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="n2-card mt-3 p-3">
      <p className="mb-2 text-[0.8rem] font-semibold text-n2muted">
        🗑️ {photos.length}{" "}
        {photos.length === 1 ? "foto apagada" : "fotos apagadas"} (só visível
        para admins) — o scraper não as volta a trazer.
      </p>
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
        {photos.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => restore(p)}
            disabled={busy === p}
            title="Repor esta foto"
            className="relative overflow-hidden rounded border border-outline disabled:opacity-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p}
              alt=""
              className="aspect-[4/3] w-full object-cover opacity-50"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-ink/40 text-[0.7rem] font-bold text-white">
              {busy === p ? "…" : "↩ repor"}
            </span>
          </button>
        ))}
      </div>
      {err && (
        <p className="mt-2 text-[0.8rem] font-semibold text-red-800">{err}</p>
      )}
    </div>
  );
}
