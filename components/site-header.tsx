import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { priceAlertCount, savedSearchAlertCount } from "@/lib/favorites";
import { unreadNotificationCount } from "@/lib/notifications";
import MobileNav from "@/components/mobile-nav";
import NavDropdown from "@/components/nav-dropdown";
import HeaderSearch from "@/components/header-search";

export default async function SiteHeader() {
  const session = await auth();
  const user = session?.user as any;
  const alerts = user?.id ? await priceAlertCount(user.id) : 0;
  const searchAlerts = user?.id ? await savedSearchAlertCount(user.id) : 0;
  const unread = user?.id ? await unreadNotificationCount(user.id) : 0;

  const mobileItems = [
    { href: "/carros", label: "Carros" },
    { href: "/eletricos", label: "Elétricos" },
    { href: "/avaliar", label: "Avaliar carro" },
    { href: "/calcular-isv", label: "Calcular ISV" },
    ...(user
      ? [
          { href: "/garagem", label: "A minha garagem" },
          { href: "/propostas", label: "As minhas propostas" },
          { href: "/favoritos", label: "Favoritos", badge: alerts },
          { href: "/pesquisas", label: "Pesquisas", badge: searchAlerts },
          { href: "/notificacoes", label: "Notificações", badge: unread },
          { href: "/conta", label: "A minha conta" },
        ]
      : []),
    ...(user?.role === "ADMIN"
      ? [{ href: "/admin", label: "Admin", accent: true }]
      : []),
  ];

  return (
    <>
      <div className="bg-ink py-1 text-center text-[0.82rem] text-[#D9CBAE]">
        🎉 <b className="text-stone2">100% grátis</b> — anuncia sem pagar nada.
      </div>
      <header className="sticky top-0 z-50 border-b border-outline bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-[min(1240px,94%)] items-center gap-2 py-2 md:gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src="/brand/nacional2-logo.png"
              alt="Nacional 2"
              width={34}
              height={34}
              className="rounded-md"
            />
            <span className="whitespace-nowrap font-head text-[1.1rem] font-extrabold leading-none text-ink sm:text-[1.3rem]">
              NACIONAL 2
            </span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            <Link
              href="/carros"
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-[0.95rem] font-semibold text-n2muted hover:bg-cream hover:text-ink"
            >
              Carros
            </Link>
            <Link
              href="/eletricos"
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-[0.95rem] font-semibold text-n2muted hover:bg-cream hover:text-ink"
            >
              Elétricos
            </Link>
            <NavDropdown
              label="Ferramentas"
              items={[
                { href: "/avaliar", label: "Avaliar carro" },
                { href: "/calcular-isv", label: "Calcular ISV" },
              ]}
            />
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-[0.95rem] font-semibold text-olive hover:bg-cream"
              >
                Admin
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user && (
              <Link
                href="/notificacoes"
                aria-label="Notificações"
                className="relative hidden rounded-full px-2 py-1.5 text-[1.05rem] hover:bg-cream md:block"
              >
                🔔
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[0.65rem] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
            )}
            {user ? (
              <div className="hidden md:block">
                <NavDropdown
                  label={`Olá, ${user.name?.split(" ")[0] ?? "eu"}`}
                  align="right"
                  badge={alerts + searchAlerts}
                  withSignOut
                  items={[
                    { href: "/garagem", label: "A minha garagem" },
                    { href: "/propostas", label: "As minhas propostas" },
                    { href: "/favoritos", label: "Favoritos", badge: alerts },
                    {
                      href: "/pesquisas",
                      label: "Pesquisas",
                      badge: searchAlerts,
                    },
                    { href: "/conta", label: "A minha conta" },
                  ]}
                />
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="btn-line btn-xs hidden md:inline-flex"
              >
                Entrar
              </Link>
            )}
            <Link
              href="/garagem/novo"
              className="btn-clay btn-xs whitespace-nowrap"
            >
              <span className="sm:hidden">+ Vender</span>
              <span className="hidden sm:inline">+ Vender grátis</span>
            </Link>
            <MobileNav items={mobileItems} isLoggedIn={!!user} />
          </div>
        </div>
        <div className="border-t border-outline/60">
          <div className="mx-auto flex w-[min(1240px,94%)] justify-center py-2">
            <div className="w-full max-w-2xl">
              <HeaderSearch />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
