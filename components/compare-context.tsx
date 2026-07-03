"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CmpKind = "car" | "listing";
export const cmpKey = (kind: CmpKind, id: string) => `${kind}:${id}`;

const MAX = 3;
const STORAGE = "n2-compare";

type CmpCtx = {
  keys: string[];
  has: (kind: CmpKind, id: string) => boolean;
  toggle: (kind: CmpKind, id: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  full: boolean;
  max: number;
  rejectedAt: number; // timestamp da última tentativa bloqueada (limite atingido)
};

const Ctx = createContext<CmpCtx | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [keys, setKeys] = useState<string[]>([]);
  const [rejectedAt, setRejectedAt] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setKeys(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: string[]) => {
    setKeys(next);
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<CmpCtx>(
    () => ({
      keys,
      has: (kind, id) => keys.includes(cmpKey(kind, id)),
      toggle: (kind, id) => {
        const k = cmpKey(kind, id);
        if (keys.includes(k)) persist(keys.filter((x) => x !== k));
        else if (keys.length < MAX) persist([...keys, k]);
        else setRejectedAt(Date.now()); // limite atingido — sinaliza à UI
      },
      remove: (k) => persist(keys.filter((x) => x !== k)),
      clear: () => persist([]),
      full: keys.length >= MAX,
      max: MAX,
      rejectedAt,
    }),
    [keys, rejectedAt]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompare() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompare fora do CompareProvider");
  return ctx;
}
