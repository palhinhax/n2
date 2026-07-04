"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ImportCarCard from "@/components/import-car-card";

/** Grelha com scroll infinito para os anúncios estrangeiros (/api/importar). */
export default function ImportGrid({
  initialItems,
  initialNextOffset,
  query,
}: {
  initialItems: any[];
  initialNextOffset: number | null;
  query: Record<string, string>;
}) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [nextOffset, setNextOffset] = useState<number | null>(
    initialNextOffset
  );
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || nextOffset == null) return;
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams(query);
      params.set("offset", String(nextOffset));
      const res = await fetch(`/api/importar?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...data.items.filter((i: any) => !seen.has(i.id))];
      });
      setNextOffset(data.nextOffset ?? null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [loading, nextOffset, query]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || failed) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, failed]);

  if (items.length === 0) {
    return (
      <div className="n2-card p-12 text-center">
        <h3 className="font-head text-[1.3rem] font-bold text-ink">
          Ainda sem anúncios estrangeiros aqui
        </h3>
        <p className="text-n2muted">
          Experimenta alargar os filtros ou volta em breve — as fontes europeias
          são atualizadas regularmente.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => (
          <ImportCarCard key={it.id} listing={it} />
        ))}
      </div>

      <div ref={sentinel} className="h-10" />

      {loading && (
        <div className="py-6 text-center text-[0.9rem] font-medium text-n2muted">
          A carregar mais anúncios…
        </div>
      )}
      {failed && !loading && (
        <div className="py-6 text-center">
          <p className="mb-2 text-[0.9rem] font-medium text-n2muted">
            Não foi possível carregar mais anúncios.
          </p>
          <button className="btn-line btn-sm" onClick={() => loadMore()}>
            Tentar novamente
          </button>
        </div>
      )}
      {nextOffset == null && items.length > 0 && (
        <div className="py-6 text-center text-[0.85rem] text-n2muted2">
          Chegaste ao fim da lista.
        </div>
      )}
    </>
  );
}
