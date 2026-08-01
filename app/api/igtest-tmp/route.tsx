// TEMPORÁRIO — apagar. Serve só para validar o render do PNG em dev.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadSubject } from "@/lib/instagram";
import { renderInstagramImage } from "@/lib/instagram-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "nope" }, { status: 404 });
  }
  const l = await prisma.scrapedListing.findFirst({
    where: {
      active: true,
      suspicious: false,
      price: { not: null },
      imageUrls: { not: "[]" },
    },
    orderBy: { firstSeenAt: "desc" },
  });
  if (!l) return NextResponse.json({ error: "sem anúncios" }, { status: 404 });
  const s = await loadSubject("listing", l.id);
  if (!s) return NextResponse.json({ error: "sem subject" }, { status: 404 });
  return renderInstagramImage(s);
}
