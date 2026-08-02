import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { b2Configured, uploadObject } from "@/lib/b2";
import {
  loadSubject,
  instagramConfigured,
  publishToInstagram,
  IG_CAPTION_MAX,
  type IgKind,
} from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// o PNG 1080x1350 vem do canvas do painel em base64; 12 MB é folgado
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/**
 * mode "manual" — o admin descarregou o PNG e publica à mão: só regista.
 * mode "api"    — recebe o PNG desenhado no painel, carrega-o para o B2 (o
 *                 Instagram vai buscar a imagem a um URL público) e publica
 *                 via Graph API.
 */
export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );
  }

  const b = await req.json().catch(() => ({}));
  const kind = b.kind as IgKind | "indice";
  const mode: "manual" | "api" = b.mode === "api" ? "api" : "manual";
  const caption = String(b.caption ?? "").slice(0, IG_CAPTION_MAX);

  // "indice" = post mensal do Índice Nacional 2 (cartão de dados, sem anúncio)
  const isIndex = kind === "indice";
  if (!isIndex && ((kind !== "car" && kind !== "listing") || !b.id)) {
    return NextResponse.json(
      { error: "Parâmetros kind/id em falta." },
      { status: 400 }
    );
  }
  if (!caption.trim()) {
    return NextResponse.json({ error: "Legenda vazia." }, { status: 400 });
  }

  const s = isIndex ? null : await loadSubject(kind as IgKind, b.id);
  if (!isIndex && !s) {
    return NextResponse.json(
      { error: "Anúncio não encontrado." },
      { status: 404 }
    );
  }

  const monthTitle = new Date().toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
  });
  const base = {
    kind,
    carId: kind === "car" && s ? s.id : null,
    listingId: kind === "listing" && s ? s.id : null,
    title: s ? s.title : `Índice Nacional 2 — ${monthTitle}`,
    caption,
  };

  if (mode === "manual") {
    const post = await prisma.instagramPost.create({
      data: { ...base, status: "DOWNLOADED" },
    });
    return NextResponse.json({
      ok: true,
      postId: post.id,
      status: post.status,
    });
  }

  // ---- publicação via Graph API ----
  if (!instagramConfigured()) {
    return NextResponse.json(
      {
        error:
          "Instagram não configurado. Define IG_USER_ID e IG_ACCESS_TOKEN no .env, ou descarrega a imagem e publica à mão.",
      },
      { status: 503 }
    );
  }
  if (!b2Configured()) {
    return NextResponse.json(
      {
        error:
          "Armazenamento (B2) não configurado — o Instagram precisa de um URL público para ir buscar a imagem.",
      },
      { status: 503 }
    );
  }

  // o content publishing do Instagram só aceita JPEG — o painel envia JPEG
  const image = typeof b.image === "string" ? b.image : "";
  if (!image.startsWith("data:image/jpeg;base64,")) {
    return NextResponse.json(
      { error: "Imagem em falta ou em formato inesperado (esperado JPEG)." },
      { status: 400 }
    );
  }

  let imageUrl: string | null = null;
  try {
    const jpeg = Buffer.from(image.split(",", 2)[1], "base64");
    if (!jpeg.length || jpeg.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Imagem inválida." }, { status: 400 });
    }
    const key = `instagram/${kind}-${s ? s.id : "mensal"}-${Date.now()}.jpg`;
    ({ publicUrl: imageUrl } = await uploadObject(key, jpeg, "image/jpeg"));
  } catch (err) {
    console.error("[instagram/publish] imagem", err);
    return NextResponse.json(
      { error: "Não foi possível gerar/guardar a imagem." },
      { status: 500 }
    );
  }

  try {
    const { mediaId, permalink } = await publishToInstagram(imageUrl, caption);
    const post = await prisma.instagramPost.create({
      data: {
        ...base,
        imageUrl,
        status: "PUBLISHED",
        mediaId,
        permalink,
        publishedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, postId: post.id, permalink });
  } catch (err: any) {
    const message = err?.message || "Falha ao publicar no Instagram.";
    console.error("[instagram/publish]", err);
    await prisma.instagramPost.create({
      data: {
        ...base,
        imageUrl,
        status: "FAILED",
        error: message.slice(0, 500),
      },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
