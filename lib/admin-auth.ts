import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** Devolve null se o utilizador for admin; caso contrário a resposta 403. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores." },
      { status: 403 }
    );
  }
  return null;
}
