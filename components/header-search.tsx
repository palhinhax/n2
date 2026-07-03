"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";

type Result = {
  title: string;
  href: string;
  price: number | null;
  year: number | null;
  km: number | null;
  thumb: string | null;
  origem: string;
};
type Resp = {
  brand: string | null;
  model: string | null;
  brandHref: string | null;
  results: Result[];
};

const eur = (n: number | null) =>
  n == null ? "sob consulta" : n.toLocaleString("pt-PT") + " €";

export default function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Resp | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function onChange(v: string) {
    setQ(v);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setData(null);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(v)}`);
        setData(await res.json());
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }, 220);
  }

  function goToResults() {
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    if (data?.brand && data?.model)
      router.push(`/marcas/${slugify(data.brand)}/${slugify(data.model)}`);
    else if (data?.brandHref) router.push(data.brandHref);
    else router.push(`/carros?q=${encodeURIComponent(term)}`);
  }

  return (
    <div ref={boxRef} className="relative flex-1">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToResults();
        }}
      >
        <div className="flex items-center gap-2 rounded-full border border-outline2 bg-cream px-3 py-1.5 focus-within:border-clay focus-within:bg-white">
          <span className="text-n2muted2">🔎</span>
          <input
            value={q}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => q.trim().length >= 2 && setOpen(true)}
            placeholder="Pesquisar marca ou modelo… (ex.: golf, clio, série 1)"
            className="w-full bg-transparent text-[0.92rem] text-ink outline-none placeholder:text-n2muted2"
          />
        </div>
      </form>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-outline bg-white shadow-warmlg">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={goToResults}
            className="flex w-full items-center justify-between border-b border-outline/60 px-4 py-2.5 text-left text-[0.9rem] font-semibold text-ink hover:bg-cream"
          >
            <span>
              Ver resultados para{" "}
              <span className="text-clay">“{q.trim()}”</span>
              {data?.brand && (
                <span className="text-n2muted">
                  {" "}
                  · {data.brand}
                  {data.model ? ` ${data.model}` : ""}
                </span>
              )}
            </span>
            <span className="text-clay">→</span>
          </button>

          <div className="max-h-[360px] overflow-y-auto">
            {loading && !data && (
              <div className="px-4 py-3 text-[0.88rem] text-n2muted">
                A procurar…
              </div>
            )}
            {data?.results?.length ? (
              data.results.map((r) => (
                <button
                  key={r.href}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                    router.push(r.href);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-cream"
                >
                  <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-b from-[#FCF4E2] to-[#F4E2BC]">
                    {r.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.thumb}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.9rem] font-semibold text-ink">
                      {r.title}
                    </div>
                    <div className="truncate text-[0.78rem] text-n2muted">
                      {[
                        r.year,
                        r.km != null
                          ? `${r.km.toLocaleString("pt-PT")} km`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-head text-[0.95rem] font-extrabold text-ink">
                      {eur(r.price)}
                    </div>
                    <div className="text-[0.68rem] text-n2muted2">
                      {r.origem}
                    </div>
                  </div>
                </button>
              ))
            ) : !loading ? (
              <div className="px-4 py-3 text-[0.88rem] text-n2muted">
                Sem sugestões diretas — carrega em “Ver resultados”.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
