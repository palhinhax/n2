import { prisma } from "@/lib/prisma";

// Notificações in-app (alertas inteligentes + fluxo de ofertas).

export type NotificationKind =
  | "PRICE_DROP"
  | "NEW_MATCHES"
  | "OFFER_RECEIVED"
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED"
  | "DEAL_RADAR"
  | "INDEX_POST"; // lembrete mensal (admins): publicar o índice no Instagram

export async function createNotification(opts: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  url?: string;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: opts.userId,
      kind: opts.kind,
      title: opts.title,
      body: opts.body ?? null,
      url: opts.url ?? null,
    },
  });
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
