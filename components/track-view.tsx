"use client";

import { useEffect, useRef } from "react";

// Dispara uma vez por carregamento da página do anúncio (carro do site ou
// anúncio externo). A API trata de excluir o dono e deduplicar repetições.
export default function TrackView({
  kind = "car",
  id,
}: {
  kind?: "car" | "listing";
  id: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return; // evita duplo disparo (React strict mode em dev)
    fired.current = true;
    const url =
      kind === "car" ? `/api/cars/${id}/view` : `/api/listings/${id}/view`;
    fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }, [kind, id]);

  return null;
}
