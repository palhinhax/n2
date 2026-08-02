import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseImageUrls } from "@/lib/listing-images";

export const dynamic = "force-dynamic";

// Apagar uma foto solta de um anúncio (só admin). Nos anúncios externos o
// scraper voltaria a trazê-la, por isso a URL fica registada em blockedImages
// e é filtrada em todas as escritas seguintes — e pode ser reposta.

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}) as any);
  const kind = body.kind === "car" ? "car" : "scraped";
  const id = typeof body.id === "string" ? body.id : "";
  const url = typeof body.url === "string" ? body.url : "";
  const restore = body.restore === true;

  if (!id || !url) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  // ---- anúncios do site: apaga mesmo a linha Photo ----
  if (kind === "car") {
    if (restore) {
      return NextResponse.json(
        { error: "Fotos de anúncios do site não se repõem." },
        { status: 400 }
      );
    }
    const photo = await prisma.photo.findFirst({
      where: { carId: id, url },
      select: { id: true },
    });
    if (!photo) {
      return NextResponse.json(
        { error: "Foto não encontrada." },
        { status: 404 }
      );
    }
    await prisma.photo.delete({ where: { id: photo.id } });
    // reordena para a capa não ficar num buraco
    const rest = await prisma.photo.findMany({
      where: { carId: id },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    await Promise.all(
      rest.map((p, i) =>
        prisma.photo.update({ where: { id: p.id }, data: { position: i } })
      )
    );
    return NextResponse.json({ ok: true, remaining: rest.length });
  }

  // ---- anúncios externos: tira da galeria e veta a URL ----
  const listing = await prisma.scrapedListing.findUnique({
    where: { id },
    select: { id: true, imageUrls: true, blockedImages: true },
  });
  if (!listing) {
    return NextResponse.json(
      { error: "Anúncio não encontrado." },
      { status: 404 }
    );
  }

  const images = parseImageUrls(listing.imageUrls);
  const blocked = parseImageUrls(listing.blockedImages);

  if (restore) {
    if (!blocked.includes(url)) {
      return NextResponse.json(
        { error: "Essa foto não está apagada." },
        { status: 400 }
      );
    }
    await prisma.scrapedListing.update({
      where: { id: listing.id },
      data: {
        blockedImages: JSON.stringify(blocked.filter((u) => u !== url)),
        imageUrls: JSON.stringify(
          images.includes(url) ? images : [...images, url]
        ),
      },
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.scrapedListing.update({
    where: { id: listing.id },
    data: {
      imageUrls: JSON.stringify(images.filter((u) => u !== url)),
      blockedImages: JSON.stringify(
        blocked.includes(url) ? blocked : [...blocked, url]
      ),
    },
  });
  return NextResponse.json({ ok: true, remaining: images.length - 1 });
}
