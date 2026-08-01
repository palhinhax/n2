import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadSubject, type IgKind } from "@/lib/instagram";
import { renderInstagramImage } from "@/lib/instagram-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** PNG 1080x1350 do post, para pré-visualizar ou descarregar. Só admin. */
export async function GET(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as IgKind | null;
  const id = url.searchParams.get("id");
  const badge = url.searchParams.get("badge");

  if ((kind !== "car" && kind !== "listing") || !id) {
    return NextResponse.json(
      { error: "Parâmetros kind/id em falta." },
      { status: 400 }
    );
  }

  const subject = await loadSubject(kind, id);
  if (!subject) {
    return NextResponse.json(
      { error: "Anúncio não encontrado." },
      { status: 404 }
    );
  }

  try {
    return await renderInstagramImage(subject, { badge });
  } catch (err) {
    console.error("[instagram/image]", err);
    return NextResponse.json(
      { error: "Não foi possível gerar a imagem." },
      { status: 500 }
    );
  }
}
