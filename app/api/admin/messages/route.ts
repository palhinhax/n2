import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendEmail, alertEmailHtml, escapeHtml } from "@/lib/email";

// Mensagens da equipa para um utilizador: notificação in-app (+ email, se o
// Resend estiver configurado). O destinatário indica-se por `userId` ou por
// `carId` — nesse caso vai para o dono do anúncio, com link para o editar.

const MAX_TITLE = 120;
const MAX_BODY = 1500;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );
  }

  const payload = await req.json().catch(() => ({}) as any);
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const message = typeof payload.body === "string" ? payload.body.trim() : "";

  if (!title) {
    return NextResponse.json(
      { error: "Falta o assunto da mensagem." },
      { status: 400 }
    );
  }
  if (title.length > MAX_TITLE) {
    return NextResponse.json(
      { error: `Assunto demasiado longo (máx. ${MAX_TITLE} caracteres).` },
      { status: 400 }
    );
  }
  if (message.length > MAX_BODY) {
    return NextResponse.json(
      { error: `Mensagem demasiado longa (máx. ${MAX_BODY} caracteres).` },
      { status: 400 }
    );
  }

  // só links internos — nunca um URL externo vindo do cliente
  let url =
    typeof payload.url === "string" &&
    payload.url.startsWith("/") &&
    !payload.url.startsWith("//")
      ? payload.url
      : "";

  let userId = typeof payload.userId === "string" ? payload.userId : "";
  const carId = typeof payload.carId === "string" ? payload.carId : "";

  if (!userId && carId) {
    const car = await prisma.car.findUnique({
      where: { id: carId },
      select: { ownerId: true },
    });
    if (!car) {
      return NextResponse.json(
        { error: "Anúncio não encontrado." },
        { status: 404 }
      );
    }
    userId = car.ownerId;
    if (!url) url = `/garagem/${carId}/editar`;
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Falta o destinatário." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Utilizador não encontrado." },
      { status: 404 }
    );
  }

  await createNotification({
    userId,
    kind: "ADMIN_MESSAGE",
    title,
    body: message || undefined,
    url: url || undefined,
  });

  // o email é um extra: falhar aqui não invalida a notificação in-app
  let emailed = false;
  if (payload.email !== false) {
    try {
      emailed = await sendEmail({
        to: user.email,
        subject: title,
        html: alertEmailHtml({
          title: escapeHtml(title),
          body: escapeHtml(message).replace(/\n/g, "<br/>"),
          ctaLabel: url ? "Abrir no Nacional 2" : "Ver notificações",
          ctaPath: url || "/notificacoes",
          footer:
            "Mensagem da equipa do Nacional 2. Podes responder a este email.",
        }),
      });
    } catch (err) {
      console.error("[admin-message] email", err);
    }
  }

  return NextResponse.json({ ok: true, emailed });
}
