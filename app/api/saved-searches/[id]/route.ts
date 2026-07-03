import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  await prisma.savedSearch.deleteMany({
    where: { id: params.id, userId: session.user.id },
  });
  return NextResponse.json({ ok: true });
}
