"use client";

import Link from "next/link";
import { useCompare } from "@/components/compare-context";

// Barra flutuante que aparece quando há carros selecionados para comparar.
export default function CompareTray() {
  const { keys, clear } = useCompare();
  if (keys.length === 0) return null;

  const href = `/comparar?ids=${encodeURIComponent(keys.join(","))}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-outline bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-[min(1240px,94%)] items-center gap-2 py-2 sm:gap-3 sm:py-2.5">
        <span className="text-[0.85rem] font-semibold text-ink sm:text-[0.9rem]">
          {keys.length}{" "}
          <span className="hidden sm:inline">
            {keys.length === 1 ? "carro" : "carros"} para comparar
          </span>
          <span className="sm:hidden">
            {keys.length === 1 ? "carro" : "carros"}
          </span>
        </span>
        <span className="hidden text-[0.8rem] text-n2muted2 sm:inline">
          (podes escolher até 3)
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={clear} className="btn-line btn-xs">
            Limpar
          </button>
          {keys.length >= 2 ? (
            <Link href={href} className="btn-clay btn-sm">
              Comparar →
            </Link>
          ) : (
            <span className="text-[0.78rem] font-medium text-n2muted">
              <span className="hidden sm:inline">
                Escolhe mais um para comparar
              </span>
              <span className="sm:hidden">Falta +1</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
