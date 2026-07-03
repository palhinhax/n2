import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Muda a palavra-passe do utilizador autenticado.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!newPassword || String(newPassword).length < 8) {
    return NextResponse.json(
      { error: "A nova palavra-passe deve ter pelo menos 8 caracteres." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user)
    return NextResponse.json(
      { error: "Utilizador não encontrado." },
      { status: 404 }
    );

  const ok = await bcrypt.compare(currentPassword || "", user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Palavra-passe atual incorreta." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });
  return NextResponse.json({ ok: true });
}
