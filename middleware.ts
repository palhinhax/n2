import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role;
  const { pathname } = req.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register");

  if (!isAuthRoute && !isLoggedIn) {
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

  return NextResponse.next();
});

// Matcher explícito: só corre nas rotas que precisam de auth.
// (Evita intercetar o WebSocket do HMR e assets — causava "Error handling upgrade request".)
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/garagem/:path*",
    "/admin/:path*",
    "/auth/login",
    "/auth/register",
  ],
};
