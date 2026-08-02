"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Passar quando o utilizador é admin: mostra um ✕ para apagar cada foto. */
export type GalleryAdmin = { kind: "car" | "scraped"; id: string };

// Galeria com lightbox, usada tanto pelos anúncios do site como pelos externos.
export default function PhotoGallery({
  photos,
  title,
  admin,
}: {
  photos: string[];
  title: string;
  admin?: GalleryAdmin;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function remove(url: string) {
    if (!admin) return;
    if (!confirm("Apagar esta foto do anúncio?")) return;
    setErr(null);
    setBusy(url);
    const res = await fetch("/api/admin/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: admin.kind, id: admin.id, url }),
    }).catch(() => null);
    setBusy(null);
    if (!res || !res.ok) {
      const j = res ? await res.json().catch(() => ({})) : {};
      setErr((j as any).error || "Não foi possível apagar a foto.");
      return;
    }
    setOpen(false);
    setIdx(0);
    router.refresh();
  }

  /** ✕ de admin sobreposto a uma foto. */
  function DeleteBadge({ url, big }: { url: string; big?: boolean }) {
    if (!admin) return null;
    return (
      <button
        type="button"
        title="Apagar esta foto"
        aria-label="Apagar esta foto"
        disabled={busy === url}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          remove(url);
        }}
        className={`absolute left-1 top-1 z-10 flex items-center justify-center rounded-full border border-outline2 bg-white/90 font-bold text-red-800 shadow hover:bg-white disabled:opacity-50 ${
          big ? "h-8 w-8 text-[1rem]" : "h-6 w-6 text-[0.75rem]"
        }`}
      >
        {busy === url ? "…" : "✕"}
      </button>
    );
  }

  const show = (i: number) => {
    setIdx(i);
    setOpen(true);
  };
  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx((i) => (i + 1) % photos.length);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="n2-card flex aspect-[16/10] items-center justify-center text-n2muted">
        Sem fotos
      </div>
    );
  }

  return (
    <>
      <div className="n2-card overflow-hidden">
        {/* foto principal */}
        <div className="relative">
          <button
            type="button"
            onClick={() => show(0)}
            className="relative block w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[0]}
              alt={title}
              className="aspect-[16/10] w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2.5 py-0.5 text-[0.75rem] font-semibold text-white">
              📷 {photos.length} fotos
            </span>
          </button>
          <DeleteBadge url={photos[0]} big />
        </div>

        {/* miniaturas — todas */}
        {photos.length > 1 && (
          <div className="grid grid-cols-4 gap-1 p-1 sm:grid-cols-5">
            {photos.slice(1).map((p, i) => (
              <div key={p} className="relative">
                <button
                  type="button"
                  onClick={() => show(i + 1)}
                  className="block w-full overflow-hidden rounded"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p}
                    alt=""
                    className="aspect-[4/3] w-full object-cover transition hover:opacity-80"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </button>
                <DeleteBadge url={p} />
              </div>
            ))}
          </div>
        )}
        {err && (
          <p className="px-3 pb-2 text-[0.8rem] font-semibold text-red-800">
            {err}
          </p>
        )}
      </div>

      {/* lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 text-3xl font-bold text-white/80 hover:text-white"
            aria-label="Fechar"
          >
            ×
          </button>

          {admin && (
            <button
              type="button"
              disabled={busy === photos[idx]}
              onClick={(e) => {
                e.stopPropagation();
                remove(photos[idx]);
              }}
              className="absolute left-4 top-4 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[0.85rem] font-semibold text-white hover:bg-white/20 disabled:opacity-50"
            >
              {busy === photos[idx] ? "A apagar…" : "✕ Apagar esta foto"}
            </button>
          )}

          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-2 text-4xl font-bold text-white/70 hover:text-white sm:left-6"
              aria-label="Anterior"
            >
              ‹
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[idx]}
            alt={`${title} — ${idx + 1}`}
            className="max-h-[86vh] max-w-[92vw] rounded object-contain"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />

          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-2 text-4xl font-bold text-white/70 hover:text-white sm:right-6"
              aria-label="Seguinte"
            >
              ›
            </button>
          )}

          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-[0.8rem] font-semibold text-white">
            {idx + 1} / {photos.length}
          </span>
        </div>
      )}
    </>
  );
}
