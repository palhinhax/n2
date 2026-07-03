"use client";

import { useEffect, useRef } from "react";

// Filtros que dizem algo sobre o gosto do visitante (ordenar/kmMax não).
const TASTE_KEYS = ["marca", "modelo", "fuel", "caixa", "precoMax", "anoMin"];

// Regista os filtros de pesquisa usados (para o perfil de gosto).
// Dispara quando a combinação de filtros muda; o servidor deduplica.
export default function TrackSearch({
  query,
}: {
  query: Record<string, string | undefined>;
}) {
  const relevant: Record<string, string> = {};
  for (const k of TASTE_KEYS) {
    const v = query[k]?.trim();
    if (v) relevant[k] = v;
  }
  const signature = JSON.stringify(relevant);
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === signature) return;
    last.current = signature;
    if (signature === "{}") return;
    fetch("/api/track/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: signature,
      keepalive: true,
    }).catch(() => {});
  }, [signature]);

  return null;
}
