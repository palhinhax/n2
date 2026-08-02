"use client";
// Página temporária de verificação do drawIndexPost — APAGAR depois do teste.
import { useEffect, useRef } from "react";
import { drawIndexPost } from "@/lib/instagram-canvas";

export default function DevIgTest() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    drawIndexPost(ref.current, {
      monthLabel: "agosto 2026",
      median: "18 900 €",
      momPct: 11.8,
      activeCount: "46 265",
      months: [
        { label: "jul", median: 16900 },
        { label: "ago", median: 18900 },
      ],
      fuels: [
        { seg: "Diesel", median: "15 900 €" },
        { seg: "Gasolina", median: "16 640 €" },
        { seg: "Elétrico", median: "29 750 €" },
        { seg: "Híbrido Plug-In", median: "32 990 €" },
        { seg: "Híbrido", median: "25 450 €" },
      ],
    });
  }, []);
  return (
    <canvas
      ref={ref}
      style={{ width: 540, display: "block", margin: "20px auto" }}
    />
  );
}
