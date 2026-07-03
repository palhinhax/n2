"use client";

import { useEffect, useState } from "react";
import { EN2_KM } from "@/lib/constants";

// Barra "giro": quanto da Estrada Nacional 2 (739 km) este carro faz numa carga.
// Pode passar dos 100% — nesse caso a barra enche e mostra o excedente.
export default function En2RangeBar({ rangeKm }: { rangeKm: number }) {
  const pct = Math.round((rangeKm / EN2_KM) * 100);
  const fill = Math.min(pct, 100); // largura visível (a barra não passa do fim)
  const over = pct > 100;
  const multiple = (rangeKm / EN2_KM).toFixed(1).replace(".", ",");
  const extra = Math.max(rangeKm - EN2_KM, 0);

  // Animação de entrada: enche do 0 até à percentagem.
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(fill), 120);
    return () => clearTimeout(t);
  }, [fill]);

  return (
    <div className="n2-card mt-4 border-outline2 bg-gradient-to-b from-[#F3F6E8] to-[#FBF6EA] px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[1.15rem]">⚡</span>
          <b className="font-head text-[1.05rem] font-extrabold text-ink">
            Autonomia na Estrada Nacional 2
          </b>
        </div>
        <span
          className={`n2-tag ${over ? "bg-olive" : "bg-clay"} whitespace-nowrap`}
          title={`${rangeKm} km de autonomia · EN2 tem ${EN2_KM} km`}
        >
          {pct}% da EN2
        </span>
      </div>

      {/* barra */}
      <div className="relative h-4 overflow-hidden rounded-full bg-[#E6E9D6] ring-1 ring-outline2">
        <div
          className={`h-full rounded-full bg-gradient-to-r from-olive via-[#6B7F1E] to-clay transition-[width] duration-1000 ease-out ${over ? "shadow-[0_0_12px_2px_rgba(65,77,17,0.45)]" : ""}`}
          style={{ width: `${w}%` }}
        />
        {/* carrinho a percorrer a estrada */}
        <span
          className="absolute -top-[3px] text-[0.9rem] transition-[left] duration-1000 ease-out"
          style={{ left: `calc(${w}% - 9px)` }}
          aria-hidden
        >
          🚗
        </span>
      </div>

      {/* extremos da estrada */}
      <div className="mt-1.5 flex justify-between text-[0.72rem] font-semibold text-n2muted2">
        <span>Chaves · km 0</span>
        <span>Faro · km {EN2_KM}</span>
      </div>

      {/* legenda */}
      <p className="mt-2.5 text-[0.9rem] text-bark">
        {over ? (
          <>
            Com uma carga fazes a <b>EN2 inteira</b> e ainda sobram{" "}
            <b>{extra.toLocaleString("pt-PT")} km</b> — dá para {multiple}× a
            estrada! 🏁
          </>
        ) : (
          <>
            Com uma carga percorres cerca de{" "}
            <b>{rangeKm.toLocaleString("pt-PT")} km</b> — <b>{pct}%</b> dos{" "}
            {EN2_KM} km da EN2.
          </>
        )}
      </p>
    </div>
  );
}
