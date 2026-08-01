"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Liga/desliga o destaque editorial de um anúncio do site (só admin). */
export default function FeatureToggle({
  carId,
  featured,
}: {
  carId: string;
  featured: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(featured);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function toggle() {
    const next = !on;
    setErr(null);
    setOn(next); // otimista
    const res = await fetch(`/api/admin/cars/${carId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: next }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setOn(!next);
      setErr(j.error || "Não foi possível alterar o destaque.");
      return;
    }
    start(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={on}
        title={on ? "Remover dos destaques" : "Destacar este anúncio"}
        className={
          on
            ? "btn-xs rounded-full border border-clay bg-clay px-3 font-semibold text-white disabled:opacity-60"
            : "btn-line btn-xs disabled:opacity-60"
        }
      >
        {on ? "★ Destacado" : "☆ Destacar"}
      </button>
      {err && <span className="text-[0.75rem] text-red-800">{err}</span>}
    </div>
  );
}
