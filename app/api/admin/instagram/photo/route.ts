import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadSubject, type IgKind } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serve a foto do anúncio a partir do nosso domínio. Assim o <canvas> do
 * painel não fica "tainted" (e podia exportar o PNG) e contornamos os CDNs
 * que bloqueiam hotlink. O URL nunca vem do cliente — é sempre o que está
 * guardado no anúncio — para isto não virar um proxy aberto.
 */
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
  if ((kind !== "car" && kind !== "listing") || !id) {
    return NextResponse.json(
      { error: "Parâmetros kind/id em falta." },
      { status: 400 }
    );
  }

  const subject = await loadSubject(kind, id);
  if (!subject?.photoUrl) {
    return NextResponse.json({ error: "Sem foto." }, { status: 404 });
  }

  try {
    const res = await fetch(subject.photoUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        Accept: "image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `A origem devolveu ${res.status}.` },
        { status: 502 }
      );
    }
    const type = res.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) {
      return NextResponse.json(
        { error: "A origem não devolveu uma imagem." },
        { status: 502 }
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("[instagram/photo]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar a foto." },
      { status: 502 }
    );
  }
}
