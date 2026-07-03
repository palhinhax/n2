import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { VISITOR_COOKIE, VISITOR_MAX_AGE } from "@/lib/constants";

// Rotas que exigem sessão (o resto do site é público).
const PROTECTED = ["/dashboard", "/garagem", "/admin"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role;
  const { pathname } = req.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register");
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /admin apenas para administradores
  if (pathname.startsWith("/admin") && isLoggedIn && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/garagem", req.url));
  }

  // Visitante sem cookie: cria o id agora e injeta-o também no pedido,
  // para que o cookies() das páginas/APIs o veja já neste request.
  if (!req.cookies.get(VISITOR_COOKIE)) {
    const visitor = crypto.randomUUID();
    const headers = new Headers(req.headers);
    headers.set(
      "cookie",
      [req.headers.get("cookie"), `${VISITOR_COOKIE}=${visitor}`]
        .filter(Boolean)
        .join("; ")
    );
    const res = NextResponse.next({ request: { headers } });
    res.cookies.set(VISITOR_COOKIE, visitor, {
      maxAge: VISITOR_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return res;
  }

  return NextResponse.next();
});

// Corre em todas as páginas (para o cookie de visitante), mas nunca em
// /api, assets do Next ou ficheiros estáticos (qualquer path com ".").
// (Evita intercetar o WebSocket do HMR — causava "Error handling upgrade request".)
export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
