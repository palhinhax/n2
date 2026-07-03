"use client";

import { useEffect, useRef } from "react";

// Dispara uma vez por carregamento da página do anúncio.
// A API trata de excluir o dono e de deduplicar visitas repetidas.
export default function TrackView({ carId }: { carId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return; // evita duplo disparo (React strict mode em dev)
    fired.current = true;
    fetch(`/api/cars/${carId}/view`, { method: "POST", keepalive: true }).catch(
      () => {}
    );
  }, [carId]);

  return null;
}
