import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { b2Configured, uploadObject } from "@/lib/b2";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Recebe o ficheiro e envia-o para o Backblaze B2 do lado do servidor.
// Assim o browser não faz PUT direto ao B2 (sem problemas de CORS).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  if (!b2Configured()) {
    return NextResponse.json(
      { configured: false, error: "Backblaze B2 não configurado (.env)." },
      { status: 501 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ficheiro em falta." }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Imagem demasiado grande (máx. 12 MB)." },
      { status: 413 }
    );
  }

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `cars/${session.user.id}/${Date.now()}-${safe}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { publicUrl } = await uploadObject(
      key,
      buffer,
      file.type || "image/jpeg"
    );
    return NextResponse.json({ configured: true, key, publicUrl });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: "Falha no upload para o armazenamento." },
      { status: 500 }
    );
  }
}
