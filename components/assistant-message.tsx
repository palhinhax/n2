"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// Renderiza a resposta do assistente: torna links clicáveis (markdown [t](u) e
// URLs simples), aplica **negrito**, e converte links do próprio site em
// navegação interna. Evita overflow com quebra de palavras longas.

function normalizeHref(raw: string): { href: string; internal: boolean } {
  try {
    if (raw.startsWith("/")) return { href: raw, internal: true };
    const u = new URL(raw);
    const host = u.hostname;
    const internal =
      host === "localhost" ||
      host.endsWith("nacional-2.pt") ||
      host.endsWith("nacional2.pt") ||
      (typeof window !== "undefined" && host === window.location.hostname);
    return internal
      ? { href: u.pathname + u.search, internal: true }
      : { href: raw, internal: false };
  } catch {
    return { href: raw, internal: false };
  }
}

function LinkNode({ href, children }: { href: string; children: ReactNode }) {
  const { href: h, internal } = normalizeHref(href);
  const cls =
    "font-semibold text-clay underline underline-offset-2 [overflow-wrap:anywhere]";
  if (internal)
    return (
      <Link href={h} className={cls}>
        {children}
      </Link>
    );
  return (
    <a href={h} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  );
}

const TOKEN =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)|(https?:\/\/[^\s]+)|\*\*([^*]+)\*\*/g;

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] && m[2]) {
      nodes.push(
        <LinkNode key={`${keyBase}-${i}`} href={m[2]}>
          {m[1]}
        </LinkNode>
      );
    } else if (m[3]) {
      nodes.push(
        <LinkNode key={`${keyBase}-${i}`} href={m[3]}>
          {m[3].replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </LinkNode>
      );
    } else if (m[4]) {
      nodes.push(<strong key={`${keyBase}-${i}`}>{m[4]}</strong>);
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function AssistantMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="[overflow-wrap:anywhere]">
      {lines.map((line, i) => (
        <p key={i} className={line.trim() === "" ? "h-2" : ""}>
          {renderInline(line, String(i))}
        </p>
      ))}
    </div>
  );
}
