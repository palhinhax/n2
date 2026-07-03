"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useFavorites, type FavKind } from "@/components/favorites-context";

export default function FavoriteButton({
  id,
  kind = "car",
  variant = "card",
  count,
}: {
  id: string;
  kind?: FavKind;
  variant?: "card" | "detail";
  count?: number;
}) {
  const router = useRouter();
  const { status } = useSession();
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(kind, id);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (status !== "authenticated") {
      router.push("/auth/login");
      return;
    }
    await toggle(kind, id);
  }

  if (variant === "detail") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[0.9rem] font-bold transition ${
          fav
            ? "border-clay bg-clay/10 text-clay"
            : "border-outline bg-white text-ink hover:border-clay"
        }`}
      >
        <span className={fav ? "text-clay" : ""}>{fav ? "♥" : "♡"}</span>
        {fav ? "Guardado" : "Guardar"}
        {count != null && count > 0 && (
          <span className="text-n2muted">· {count}</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={fav ? "Remover dos favoritos" : "Guardar nos favoritos"}
      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[1.1rem] shadow-sm transition hover:bg-white"
    >
      <span className={fav ? "text-clay" : "text-ink/60"}>
        {fav ? "♥" : "♡"}
      </span>
    </button>
  );
}
