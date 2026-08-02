import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendEmail, alertEmailHtml } from "@/lib/email";
import { fmtEur } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json(
      { error: "Inicia sessão para fazer uma oferta." },
      { status: 401 }
    );
  const { carId, amount, message } = await req.json();
  if (!carId || !(amount > 0))
    return NextResponse.json({ error: "Oferta inválida." }, { status: 400 });
  const car = await prisma.car.findUnique({
    where: { id: carId },
    include: { brand: true, model: true, owner: true },
  });
  if (!car || !car.forSale || car.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Este carro não está disponível para ofertas." },
      { status: 400 }
    );
  }
  if (car.ownerId === session.user.id) {
    return NextResponse.json(
      { error: "Não podes fazer ofertas ao teu próprio carro." },
      { status: 400 }
    );
  }
  const offer = await prisma.offer.create({
    data: {
      carId,
      buyerId: session.user.id,
      amount: +amount,
      message: message || null,
    },
  });

  // avisa o vendedor (in-app + email); nunca bloqueia a resposta
  const carName = `${car.brand.name} ${car.model.name}`;
  try {
    await createNotification({
      userId: car.ownerId,
      kind: "OFFER_RECEIVED",
      title: `Nova oferta de ${fmtEur(+amount)} no teu ${carName}`,
      body: message ? `“${message}”` : undefined,
      url: `/garagem/${car.id}`,
    });
    if (car.owner.email) {
      await sendEmail({
        to: car.owner.email,
        subject: `Nova oferta de ${fmtEur(+amount)} no teu ${carName}`,
        html: alertEmailHtml({
          title: "Recebeste uma oferta 💶",
          body:
            `Alguém ofereceu <b>${fmtEur(+amount)}</b> pelo teu ${carName}.` +
            (message ? `<br/>Mensagem: “${message}”` : "") +
            "<br/>Aceita ou recusa na tua garagem.",
          ctaLabel: "Ver oferta",
          ctaPath: `/garagem/${car.id}`,
        }),
      });
    }
  } catch (err) {
    console.error("[offers] notify", err);
  }

  return NextResponse.json({ ok: true, id: offer.id });
}
