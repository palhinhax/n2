import { cookies } from "next/headers";
import { VISITOR_COOKIE, VISITOR_MAX_AGE } from "@/lib/constants";

export { VISITOR_COOKIE, VISITOR_MAX_AGE };

// O valor vem do cliente — só aceitamos o formato que nós próprios geramos
// (UUID e afins). Evita lixo arbitrário na BD via cookie forjado.
const VALID_ID = /^[A-Za-z0-9-]{8,64}$/;

const sanitize = (v: string | undefined) => (v && VALID_ID.test(v) ? v : null);

/** Lê o id do visitante (RSC e route handlers). */
export function getVisitorId(): string | null {
  return sanitize(cookies().get(VISITOR_COOKIE)?.value);
}

/**
 * Lê o id do visitante e, se não existir (ou for inválido), cria-o.
 * Só pode ser usado em route handlers (RSC não pode escrever cookies).
 */
export function getOrSetVisitorId(): string {
  const jar = cookies();
  let visitor = sanitize(jar.get(VISITOR_COOKIE)?.value);
  if (!visitor) {
    visitor = crypto.randomUUID();
    jar.set(VISITOR_COOKIE, visitor, {
      maxAge: VISITOR_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return visitor;
}
