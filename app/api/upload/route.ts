import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { b2Configured, presignUpload } from "@/lib/b2";

// Devolve um URL pré-assinado para upload direto ao Backblaze B2.
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
  const { filename, contentType } = await req.json();
  const safe = String(filename || "foto.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `cars/${session.user.id}/${Date.now()}-${safe}`;
  const { uploadUrl, publicUrl } = await presignUpload(
    key,
    contentType || "image/jpeg"
  );
  return NextResponse.json({ configured: true, key, uploadUrl, publicUrl });
}
