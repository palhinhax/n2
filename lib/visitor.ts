import { cookies } from "next/headers";
import { VISITOR_COOKIE, VISITOR_MAX_AGE } from "@/lib/constants";

export { VISITOR_COOKIE, VISITOR_MAX_AGE };

/** Lê o id do visitante (RSC e route handlers). */
export function getVisitorId(): string | null {
  return cookies().get(VISITOR_COOKIE)?.value ?? null;
}

/**
 * Lê o id do visitante e, se não existir, cria-o.
 * Só pode ser usado em route handlers (RSC não pode escrever cookies).
 */
export function getOrSetVisitorId(): string {
  const jar = cookies();
  let visitor = jar.get(VISITOR_COOKIE)?.value;
  if (!visitor) {
    visitor = crypto.randomUUID();
    jar.set(VISITOR_COOKIE, visitor, {
      maxAge: VISITOR_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return visitor;
}
