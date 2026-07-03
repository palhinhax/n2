import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CarCard from "@/components/car-card";
import ExternalCarCard from "@/components/external-car-card";
import { fmtEur } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function Favoritos() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const favs = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      car: {
        include: {
          brand: true,
          model: true,
          photos: { orderBy: { position: "asc" } },
          owner: true,
          _count: { select: { offers: true } },
        },
      },
      listing: true,
    },
  });

  const priceOf = (f: (typeof favs)[number]) =>
    f.car?.price ?? f.listing?.price ?? null;

  // marca o preço atual como "visto" (limpa as notificações ao abrir a página)
  const toUpdate = favs.filter((f) => {
    const p = priceOf(f);
    return p != null && f.seenPrice !== p;
  });
  if (toUpdate.length) {
    await prisma.$transaction(
      toUpdate.map((f) =>
        prisma.favorite.update({
          where: { id: f.id },
          data: { seenPrice: priceOf(f) },
        })
      )
    );
  }

  const visible = favs.filter((f) => f.car || f.listing);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1180px,94%)] py-7">
        <h1 className="mb-5 font-head text-[2rem] font-extrabold text-ink">
          ♥ Os meus favoritos
        </h1>

        {visible.length === 0 ? (
          <div className="n2-card p-10 text-center">
            <p className="text-n2muted">
              Ainda não guardaste nenhum carro. Carrega no ♡ nos anúncios para
              os guardares aqui.
            </p>
            <Link href="/carros" className="btn-clay btn-sm mt-4 inline-block">
              Ver carros
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((f) => {
              const priceNow = priceOf(f);
              const changed =
                priceNow != null &&
                f.seenPrice != null &&
                priceNow !== f.seenPrice;
              const dropped = changed && priceNow < (f.seenPrice as number);
              return (
                <div key={f.id}>
                  {changed && (
                    <div
                      className={`mb-1 rounded-lg px-2.5 py-1 text-[0.8rem] font-bold ${
                        dropped
                          ? "bg-olive/15 text-olive"
                          : "bg-clay/15 text-clay"
                      }`}
                    >
                      {dropped ? "▼ Baixou de preço" : "▲ Subiu de preço"}:{" "}
                      {fmtEur(f.seenPrice)} → {fmtEur(priceNow)}
                    </div>
                  )}
                  {f.car ? (
                    <CarCard car={f.car} />
                  ) : (
                    <ExternalCarCard listing={f.listing} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
