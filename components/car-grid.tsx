"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import CarCard from "@/components/car-card";
import ExternalCarCard from "@/components/external-car-card";
import AdSlot from "@/components/ad-slot";

type Item = { kind: "car" | "ext"; id: string; data: any };

export default function CarGrid({
  initialItems,
  initialNextOffset,
  query,
}: {
  initialItems: Item[];
  initialNextOffset: number | null;
  query: Record<string, string>;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
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
      const res = await fetch(`/api/carros?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((i) => `${i.kind}-${i.id}`));
        const fresh = (data.items as Item[]).filter(
          (i) => !seen.has(`${i.kind}-${i.id}`)
        );
        return [...prev, ...fresh];
      });
      setNextOffset(data.nextOffset ?? null);
    } catch {
      // falha (ex.: 503 intermitente da BD) — mostra botão de nova tentativa
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [loading, nextOffset, query]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || failed) return; // se falhou, espera ação manual
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
          Sem resultados nesta estrada
        </h3>
        <p className="text-n2muted">Experimenta alargar os filtros.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it, idx) => (
          <Fragment key={`${it.kind}-${it.id}`}>
            {idx === 2 && <AdSlot />}
            {it.kind === "car" ? (
              <CarCard car={it.data} />
            ) : (
              <ExternalCarCard listing={it.data} />
            )}
          </Fragment>
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
