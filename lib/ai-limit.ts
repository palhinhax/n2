import { prisma } from "@/lib/prisma";

/**
 * Limite diário de uso das funcionalidades de IA por utilizador.
 * Configurável por env: AI_DAILY_LIMIT_CHAT, AI_DAILY_LIMIT_AVALIAR.
 */

export type AiKind = "chat" | "avaliar";

const DEFAULTS: Record<AiKind, number> = {
  chat: 20, // mensagens/dia
  avaliar: 5, // avaliações/dia
};

export function dailyLimit(kind: AiKind): number {
  const env =
    kind === "chat"
      ? process.env.AI_DAILY_LIMIT_CHAT
      : process.env.AI_DAILY_LIMIT_AVALIAR;
  const n = Number(env);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULTS[kind];
}

/** Dia atual em Lisboa (o "reset" à meia-noite local, não UTC). */
function todayLisbon(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // "YYYY-MM-DD"
}

export interface AiQuota {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

/** Consulta o uso de hoje sem consumir. */
export async function getQuota(userId: string, kind: AiKind): Promise<AiQuota> {
  const limit = dailyLimit(kind);
  const row = await prisma.aiUsage.findUnique({
    where: { userId_day_kind: { userId, day: todayLisbon(), kind } },
    select: { count: true },
  });
  const used = row?.count ?? 0;
  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

/**
 * Tenta consumir 1 uso. Devolve a quota resultante; `allowed=false` significa
 * que o limite já estava atingido (e nada foi consumido).
 */
export async function consumeQuota(
  userId: string,
  kind: AiKind
): Promise<AiQuota> {
  const limit = dailyLimit(kind);
  const day = todayLisbon();

  // incremento condicional atómico: só conta se ainda estiver abaixo do limite
  const updated = await prisma.aiUsage.updateMany({
    where: { userId, day, kind, count: { lt: limit } },
    data: { count: { increment: 1 } },
  });
  if (updated.count > 0) {
    const q = await getQuota(userId, kind);
    return { ...q, allowed: true };
  }

  // ou não existe linha ainda, ou o limite foi atingido
  try {
    await prisma.aiUsage.create({
      data: { userId, day, kind, count: 1 },
    });
    return { allowed: true, used: 1, limit, remaining: limit - 1 };
  } catch {
    // linha já existe (corrida) e está no limite
    const q = await getQuota(userId, kind);
    return { ...q, allowed: q.used < limit };
  }
}
