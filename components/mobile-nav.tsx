"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";

type Item = { href: string; label: string; badge?: number; accent?: boolean };

export default function MobileNav({
  items,
  isLoggedIn,
}: {
  items: Item[];
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-outline bg-white text-ink"
      >
        <span className="text-[1.2rem] leading-none">{open ? "✕" : "☰"}</span>
      </button>

      {open && (
        <>
          {/* fundo para fechar ao tocar fora */}
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-ink/20"
          />
          <nav className="absolute right-3 top-[52px] z-50 w-56 overflow-hidden rounded-2xl border border-outline bg-white shadow-warmlg">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between border-b border-outline/60 px-4 py-3 text-[0.95rem] font-semibold last:border-0 hover:bg-cream ${
                  it.accent ? "text-olive" : "text-ink"
                }`}
              >
                {it.label}
                {it.badge != null && it.badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1 text-[0.68rem] font-bold text-white">
                    {it.badge}
                  </span>
                )}
              </Link>
            ))}
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  signOut({ redirectTo: "/" });
                }}
                className="block w-full border-t border-outline/60 px-4 py-3 text-left text-[0.95rem] font-semibold text-clay hover:bg-cream"
              >
                Sair
              </button>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-[0.95rem] font-semibold text-ink hover:bg-cream"
              >
                Entrar
              </Link>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
