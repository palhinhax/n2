"use client";

import { useEffect, useState } from "react";

export default function ExternalGallery({
  photos,
  title,
}: {
  photos: string[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

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

        {/* miniaturas — todas */}
        {photos.length > 1 && (
          <div className="grid grid-cols-4 gap-1 p-1 sm:grid-cols-5">
            {photos.slice(1).map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => show(i + 1)}
                className="overflow-hidden rounded"
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
            ))}
          </div>
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
