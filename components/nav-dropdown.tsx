"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";

type Item = { href: string; label: string; badge?: number; accent?: boolean };

export default function NavDropdown({
  label,
  items,
  badge,
  withSignOut,
  align = "left",
}: {
  label: string;
  items: Item[];
  /** total no gatilho (ex.: alertas por ler) */
  badge?: number;
  withSignOut?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.95rem] font-semibold hover:bg-cream hover:text-ink ${
          open ? "bg-cream text-ink" : "text-n2muted"
        }`}
      >
        {label}
        <span
          className={`text-[0.55rem] transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
        {badge != null && badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[0.65rem] font-bold text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* fundo para fechar ao clicar fora */}
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <nav
            className={`absolute top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-outline bg-white shadow-warmlg ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
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
            {withSignOut && (
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
            )}
          </nav>
        </>
      )}
    </div>
  );
}
