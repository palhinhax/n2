"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/** Marcas mais procuradas no mercado PT — aparecem primeiro na lista. */
const POPULAR = [
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Volkswagen",
  "Peugeot",
  "Renault",
  "Opel",
  "Ford",
  "Nissan",
  "Toyota",
  "Citroën",
  "SEAT",
  "Fiat",
  "Kia",
  "Hyundai",
  "Tesla",
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Combobox pesquisável de marcas: escreve para filtrar, populares primeiro.
 * Funciona em formulários (input hidden com `name`) e com callback `onSelect`.
 */
export default function BrandCombobox({
  brands,
  value,
  name,
  placeholder = "Todas as marcas",
  onSelect,
  id,
}: {
  brands: string[];
  value?: string;
  name?: string;
  placeholder?: string;
  onSelect?: (brand: string) => void;
  id?: string;
}) {
  const [selected, setSelected] = useState(value ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSelected(value ?? ""), [value]);

  // fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const options = useMemo(() => {
    const set = new Set(brands);
    if (query.trim()) {
      const q = norm(query);
      const starts = brands.filter((b) => norm(b).startsWith(q));
      const contains = brands.filter(
        (b) => !norm(b).startsWith(q) && norm(b).includes(q)
      );
      return [...starts, ...contains];
    }
    const popular = POPULAR.filter((p) => set.has(p));
    const others = brands.filter((b) => !popular.includes(b));
    return [...popular, ...others];
  }, [brands, query]);

  const popularCount = query.trim()
    ? 0
    : POPULAR.filter((p) => brands.includes(p)).length;

  function choose(brand: string) {
    setSelected(brand);
    setQuery("");
    setOpen(false);
    setHighlight(-1);
    onSelect?.(brand);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0 && options[highlight]) choose(options[highlight]);
      else if (options.length === 1) choose(options[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {/* valor selecionado: lido por formulários (name) e por getElementById (id) */}
      <input type="hidden" name={name} id={id} value={selected} readOnly />
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="finput pr-7"
          placeholder={selected || placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        {selected && !query ? (
          <button
            type="button"
            aria-label="Limpar marca"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.9rem] font-bold text-n2muted hover:text-ink"
            onClick={() => choose("")}
          >
            ×
          </button>
        ) : (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.7rem] text-n2muted2">
            ▾
          </span>
        )}
      </div>
      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-outline bg-white py-1 shadow-warmlg"
        >
          <li
            role="option"
            aria-selected={selected === ""}
            className="cursor-pointer px-3 py-1.5 text-[0.9rem] font-medium text-n2muted hover:bg-cream"
            onMouseDown={(e) => {
              e.preventDefault();
              choose("");
            }}
          >
            Todas as marcas
          </li>
          {options.length === 0 && (
            <li className="px-3 py-1.5 text-[0.88rem] text-n2muted2">
              Nenhuma marca encontrada
            </li>
          )}
          {options.map((b, i) => (
            <li key={b}>
              {i === 0 && popularCount > 0 && (
                <div className="px-3 pb-0.5 pt-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-n2muted2">
                  Populares
                </div>
              )}
              {i === popularCount && popularCount > 0 && (
                <div className="border-t border-outline px-3 pb-0.5 pt-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-n2muted2">
                  Todas
                </div>
              )}
              <div
                role="option"
                aria-selected={selected === b}
                className={`cursor-pointer px-3 py-1.5 text-[0.92rem] font-medium text-ink hover:bg-cream ${
                  i === highlight ? "bg-cream" : ""
                } ${selected === b ? "font-bold text-clay" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(b);
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                {b}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
