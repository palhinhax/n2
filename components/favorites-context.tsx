"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export type FavKind = "car" | "listing";
const keyOf = (kind: FavKind, id: string) => `${kind}:${id}`;

type FavCtx = {
  isFavorite: (kind: FavKind, id: string) => boolean;
  toggle: (kind: FavKind, id: string) => Promise<void>;
  ready: boolean;
};

const Ctx = createContext<FavCtx | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setIds(new Set());
      setReady(true);
      return;
    }
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => {
        const s = new Set<string>();
        for (const id of d.cars || []) s.add(keyOf("car", id));
        for (const id of d.listings || []) s.add(keyOf("listing", id));
        setIds(s);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [status]);

  const toggle = useCallback(
    async (kind: FavKind, id: string) => {
      const key = keyOf(kind, id);
      const has = ids.has(key);
      setIds((prev) => {
        const n = new Set(prev);
        if (has) n.delete(key);
        else n.add(key);
        return n;
      });
      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, id }),
        });
        if (!res.ok) throw new Error();
        // invalida a cache do router para /favoritos e o badge do header
        router.refresh();
      } catch {
        setIds((prev) => {
          const n = new Set(prev);
          if (has) n.add(key);
          else n.delete(key);
          return n;
        });
      }
    },
    [ids, router]
  );

  const value = useMemo<FavCtx>(
    () => ({
      isFavorite: (kind, id) => ids.has(keyOf(kind, id)),
      toggle,
      ready,
    }),
    [ids, toggle, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFavorites fora do FavoritesProvider");
  return ctx;
}
