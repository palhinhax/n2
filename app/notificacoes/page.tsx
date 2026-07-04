import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

export const dynamic = "force-dynamic";

const KIND_ICON: Record<string, string> = {
  PRICE_DROP: "▼",
  NEW_MATCHES: "🔔",
};

export default async function Notificacoes() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // marca tudo como lido ao abrir a página
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(800px,94%)] py-7">
        <h1 className="mb-1 font-head text-[2rem] font-extrabold text-ink">
          🔔 Notificações
        </h1>
        <p className="mb-5 text-n2muted">
          Descidas de preço nos favoritos e carros novos nas tuas pesquisas.
        </p>

        {notifications.length === 0 ? (
          <div className="n2-card p-10 text-center">
            <p className="text-n2muted">
              Ainda não tens notificações. Guarda favoritos e pesquisas para
              receberes alertas quando algo mudar.
            </p>
            <Link href="/carros" className="btn-clay btn-sm mt-4 inline-block">
              Procurar carros
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => {
              const inner = (
                <div
                  className={`n2-card flex items-start gap-3 px-4 py-3 ${
                    n.readAt == null ? "border-l-4 border-clay" : ""
                  }`}
                >
                  <span className="mt-0.5 text-[1.1rem]">
                    {KIND_ICON[n.kind] ?? "•"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug text-ink">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[0.88rem] text-n2muted">{n.body}</p>
                    )}
                    <p className="mt-0.5 text-[0.76rem] text-n2muted2">
                      {n.createdAt.toLocaleDateString("pt-PT")}{" "}
                      {n.createdAt.toLocaleTimeString("pt-PT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
              return n.url ? (
                <Link key={n.id} href={n.url} className="hover:opacity-90">
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
