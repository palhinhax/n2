import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendEmail, alertEmailHtml } from "@/lib/email";
import { fmtEur } from "@/lib/constants";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const { status } = await req.json();
  if (!["ACCEPTED", "REJECTED", "WITHDRAWN"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  const offer = await prisma.offer.findUnique({
    where: { id: params.id },
    include: {
      car: { include: { brand: true, model: true, owner: true } },
      buyer: true,
    },
  });
  if (!offer)
    return NextResponse.json(
      { error: "Oferta não encontrada." },
      { status: 404 }
    );
  const isOwner = offer.car.ownerId === session.user.id;
  const isBuyer = offer.buyerId === session.user.id;
  const isAdmin = (session.user as any).role === "ADMIN";
  if (status === "WITHDRAWN" ? !isBuyer : !isOwner && !isAdmin) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  await prisma.offer.update({ where: { id: params.id }, data: { status } });

  // avisa o comprador do desfecho (in-app + email); nunca bloqueia a resposta
  if (status === "ACCEPTED" || status === "REJECTED") {
    const carName = `${offer.car.brand.name} ${offer.car.model.name}`;
    const seller = offer.car.owner;
    const contact = [seller.phone, seller.email].filter(Boolean).join(" · ");
    try {
      if (status === "ACCEPTED") {
        await createNotification({
          userId: offer.buyerId,
          kind: "OFFER_ACCEPTED",
          title: `Oferta aceite! ${fmtEur(offer.amount)} pelo ${carName}`,
          body: `Contacta ${seller.name || "o vendedor"}: ${contact}`,
          url: "/propostas",
        });
        if (offer.buyer.email) {
          await sendEmail({
            to: offer.buyer.email,
            subject: `A tua oferta pelo ${carName} foi aceite 🎉`,
            html: alertEmailHtml({
              title: "Oferta aceite!",
              body:
                `${seller.name || "O vendedor"} aceitou a tua oferta de <b>${fmtEur(offer.amount)}</b> pelo ${carName}.` +
                `<br/>Contacto: <b>${contact}</b>` +
                "<br/>Combina a visita e fecha o negócio em segurança.",
              ctaLabel: "Ver as minhas propostas",
              ctaPath: "/propostas",
            }),
          });
        }
      } else {
        await createNotification({
          userId: offer.buyerId,
          kind: "OFFER_REJECTED",
          title: `A tua oferta de ${fmtEur(offer.amount)} pelo ${carName} foi recusada`,
          body: "Podes fazer uma nova oferta se o anúncio continuar ativo.",
          url: `/carros/${offer.carId}`,
        });
      }
    } catch (err) {
      console.error("[offers] notify", err);
    }
  }

  return NextResponse.json({ ok: true });
}
