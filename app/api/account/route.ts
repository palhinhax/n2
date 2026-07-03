import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Atualiza os dados de perfil/conta do utilizador autenticado.
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });

  const b = await req.json();
  const data: any = {};

  if (b.accountType !== undefined)
    data.accountType = b.accountType === "STAND" ? "STAND" : "PARTICULAR";

  for (const k of [
    "name",
    "phone",
    "district",
    "avatarUrl",
    "bio",
    "address",
    "postalCode",
    "city",
    "standName",
    "nif",
    "website",
    "hours",
  ]) {
    if (b[k] !== undefined) data[k] = b[k] ? String(b[k]) : null;
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, accountType: true },
  });
  return NextResponse.json({ ok: true, accountType: updated.accountType });
}
