import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { countListings, type ListingQuery } from "@/lib/car-listing";
import DeleteSavedSearch from "@/components/delete-saved-search";

export const dynamic = "force-dynamic";

function toHref(query: string): string {
  try {
    const q = JSON.parse(query) as Record<string, string>;
    const p = new URLSearchParams(q);
    return "/carros?" + p.toString();
  } catch {
    return "/carros";
  }
}

export default async function Pesquisas() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const searches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // conta os resultados atuais de cada pesquisa
  const withCounts = await Promise.all(
    searches.map(async (s) => {
      let q: ListingQuery = {};
      try {
        q = JSON.parse(s.query);
      } catch {
        /* ignore */
      }
      const count = await countListings(q);
      const isNew = Math.max(0, count - s.lastCount);
      return { ...s, count, isNew };
    })
  );

  // marca como vistos (atualiza lastCount)
  const toUpdate = withCounts.filter((s) => s.count !== s.lastCount);
  if (toUpdate.length) {
    await prisma.$transaction(
      toUpdate.map((s) =>
        prisma.savedSearch.update({
          where: { id: s.id },
          data: { lastCount: s.count },
        })
      )
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1000px,94%)] py-7">
        <h1 className="mb-1 font-head text-[2rem] font-extrabold text-ink">
          🔔 Pesquisas guardadas
        </h1>
        <p className="mb-5 text-n2muted">
          Guarda pesquisas e vê aqui quando entram carros novos.
        </p>

        {withCounts.length === 0 ? (
          <div className="n2-card p-10 text-center">
            <p className="text-n2muted">
              Ainda não guardaste nenhuma pesquisa. Faz uma pesquisa em Carros e
              carrega em “🔔 Guardar pesquisa”.
            </p>
            <Link href="/carros" className="btn-clay btn-sm mt-4 inline-block">
              Procurar carros
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {withCounts.map((s) => (
              <div
                key={s.id}
                className="n2-card flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div>
                  <Link
                    href={toHref(s.query)}
                    className="font-head text-[1.1rem] font-bold text-ink hover:underline"
                  >
                    {s.label}
                  </Link>
                  <div className="text-[0.85rem] text-n2muted">
                    {s.count.toLocaleString("pt-PT")} carros
                    {s.isNew > 0 && (
                      <span className="ml-2 rounded-full bg-olive/15 px-2 py-0.5 text-[0.78rem] font-bold text-olive">
                        +{s.isNew} novos
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Link href={toHref(s.query)} className="btn-line btn-xs">
                    Ver
                  </Link>
                  <DeleteSavedSearch id={s.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
