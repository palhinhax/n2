// Verificação de robots.txt para o scraping de fontes estrangeiras.
//
// Implementação simples do protocolo (grupos User-agent, Allow/Disallow com
// prefix matching e wildcards * / $), suficiente para decidir se um caminho
// pode ser pedido. Em caso de dúvida (robots.txt inacessível ou ilegível),
// assumimos que É permitido apenas quando o ficheiro não existe (404) e que
// NÃO é permitido quando o site responde com erro de bloqueio (403/429).

import { fetchText } from "../http";

interface RobotsRules {
  allow: string[];
  disallow: string[];
  crawlDelayMs: number | null;
}

const cache = new Map<string, RobotsRules | "unavailable">();

function parseRobots(txt: string, userAgent: string): RobotsRules {
  const rules: RobotsRules = { allow: [], disallow: [], crawlDelayMs: null };
  const generic: RobotsRules = { allow: [], disallow: [], crawlDelayMs: null };
  let current: RobotsRules | null = null;
  let sawSpecific = false;

  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();

    if (field === "user-agent") {
      const ua = value.toLowerCase();
      if (ua === "*") current = generic;
      else if (userAgent.toLowerCase().includes(ua)) {
        current = rules;
        sawSpecific = true;
      } else current = null;
      continue;
    }
    if (!current) continue;
    if (field === "disallow" && value) current.disallow.push(value);
    if (field === "allow" && value) current.allow.push(value);
    if (field === "crawl-delay") {
      const s = Number(value);
      if (Number.isFinite(s) && s > 0) current.crawlDelayMs = s * 1000;
    }
  }
  return sawSpecific ? rules : generic;
}

/** Converte um pattern do robots.txt (com * e $) num RegExp de prefixo. */
function patternToRegex(pattern: string): RegExp {
  const esc = pattern.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + (esc.endsWith("$") ? esc : esc + ".*"));
}

function matches(path: string, patterns: string[]): string | null {
  let best: string | null = null;
  for (const p of patterns) {
    if (patternToRegex(p).test(path)) {
      if (best == null || p.length > best.length) best = p;
    }
  }
  return best;
}

async function getRules(origin: string): Promise<RobotsRules | "unavailable"> {
  const hit = cache.get(origin);
  if (hit) return hit;
  let rules: RobotsRules | "unavailable";
  try {
    const txt = await fetchText(`${origin}/robots.txt`);
    rules = parseRobots(txt, "nacional2bot");
  } catch (err) {
    const status = (err as { status?: number }).status;
    // 404 = sem robots.txt → tudo permitido; bloqueio/erro → indisponível
    rules =
      status && status >= 400 && status < 500 && status !== 403
        ? { allow: [], disallow: [], crawlDelayMs: null }
        : "unavailable";
  }
  cache.set(origin, rules);
  return rules;
}

export class RobotsDisallowedError extends Error {
  constructor(url: string, rule: string) {
    super(
      `robots.txt proíbe o acesso a ${url} (regra: "${rule}") — fonte ignorada por respeito às regras do site.`
    );
    this.name = "RobotsDisallowedError";
  }
}

/**
 * Lança RobotsDisallowedError se o robots.txt do site proibir o URL.
 * Devolve o crawl-delay pedido pelo site (ms), se existir.
 */
export async function assertAllowedByRobots(
  url: string
): Promise<{ crawlDelayMs: number | null }> {
  const u = new URL(url);
  const rules = await getRules(u.origin);
  if (rules === "unavailable") {
    // não conseguimos ler as regras — por prudência não avançamos
    throw new RobotsDisallowedError(url, "robots.txt inacessível");
  }
  const path = u.pathname + u.search;
  const dis = matches(path, rules.disallow);
  const allow = matches(path, rules.allow);
  // regra mais específica (mais longa) ganha; Allow empata a favor do acesso
  if (dis && (!allow || allow.length < dis.length)) {
    throw new RobotsDisallowedError(url, dis);
  }
  return { crawlDelayMs: rules.crawlDelayMs };
}
