"use client";

import { useCompare, type CmpKind } from "@/components/compare-context";

export default function CompareButton({
  id,
  kind = "car",
}: {
  id: string;
  kind?: CmpKind;
}) {
  const { has, toggle, full } = useCompare();
  const active = has(kind, id);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(kind, id);
      }}
      disabled={!active && full}
      aria-label={active ? "Remover da comparação" : "Adicionar à comparação"}
      className={`absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-bold shadow-sm transition ${
        active
          ? "bg-ink text-white"
          : "bg-white/85 text-ink hover:bg-white disabled:opacity-40"
      }`}
    >
      {active ? "✓ A comparar" : "⇄ Comparar"}
    </button>
  );
}
