import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import WithdrawOfferButton from "@/components/withdraw-offer-button";
import { fmtEur } from "@/lib/constants";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "⏳ Pendente",
  ACCEPTED: "✓ Aceite",
  REJECTED: "✕ Recusada",
  WITHDRAWN: "Retirada",
};
const STATUS_TAG: Record<string, string> = {
  PENDING: "bg-clay",
  ACCEPTED: "bg-olive",
  REJECTED: "bg-weathered",
  WITHDRAWN: "bg-weathered",
};

export default async function Propostas() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/propostas");

  const offers = await prisma.offer.findMany({
    where: { buyerId: session.user.id },
    include: {
      car: {
        include: {
          brand: true,
          model: true,
          owner: true,
          photos: { orderBy: { position: "asc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(800px,94%)] py-7">
        <h1 className="mb-1 font-head text-[2rem] font-extrabold text-ink">
          💶 As minhas propostas
        </h1>
        <p className="mb-5 text-n2muted">
          As ofertas que enviaste e o estado de cada uma. Quando o vendedor
          aceitar, o contacto dele aparece aqui.
        </p>

        {offers.length === 0 ? (
          <div className="n2-card p-10 text-center">
            <p className="text-n2muted">
              Ainda não fizeste nenhuma proposta. Encontra um carro de que
              gostes e envia uma oferta ao vendedor.
            </p>
            <Link href="/carros" className="btn-clay btn-sm mt-4 inline-block">
              Procurar carros
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {offers.map((o) => {
              const car = o.car;
              const carName = `${car.brand.name} ${car.model.name}`;
              const stillPublic = car.forSale && car.status === "APPROVED";
              const seller = car.owner;
              return (
                <div key={o.id} className="n2-card flex gap-4 p-4">
                  {car.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={car.photos[0].url}
                      alt={carName}
                      className="hidden h-20 w-28 shrink-0 rounded-xl object-cover sm:block"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {stillPublic ? (
                        <Link
                          href={`/carros/${car.id}`}
                          className="font-head text-[1.05rem] font-bold text-ink hover:underline"
                        >
                          {carName}
                        </Link>
                      ) : (
                        <span className="font-head text-[1.05rem] font-bold text-n2muted">
                          {carName}{" "}
                          <small className="font-sans font-semibold">
                            (anúncio já não está ativo)
                          </small>
                        </span>
                      )}
                      <span
                        className={`n2-tag ${STATUS_TAG[o.status] || "bg-weathered"} ml-auto`}
                      >
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[0.9rem] text-n2muted">
                      A tua oferta:{" "}
                      <b className="text-ink">{fmtEur(o.amount)}</b>
                      {car.price ? <> · pedido: {fmtEur(car.price)}</> : null}
                      <span className="text-n2muted2">
                        {" "}
                        · {o.createdAt.toLocaleDateString("pt-PT")}
                      </span>
                    </p>
                    {o.message && (
                      <p className="mt-0.5 text-[0.85rem] text-n2muted">
                        “{o.message}”
                      </p>
                    )}
                    {o.status === "ACCEPTED" && (
                      <div className="mt-2 rounded-xl bg-olive/10 px-3 py-2 text-[0.9rem]">
                        <b className="text-olive">
                          ✓ Oferta aceite — contacta{" "}
                          {seller.name || "o vendedor"}:
                        </b>{" "}
                        <span className="font-semibold text-ink">
                          {seller.phone ? (
                            <a
                              href={`tel:${seller.phone}`}
                              className="underline underline-offset-2"
                            >
                              📞 {seller.phone}
                            </a>
                          ) : null}
                          {seller.phone && seller.email ? " · " : null}
                          <a
                            href={`mailto:${seller.email}`}
                            className="underline underline-offset-2"
                          >
                            ✉ {seller.email}
                          </a>
                        </span>
                      </div>
                    )}
                    {o.status === "PENDING" && (
                      <div className="mt-2">
                        <WithdrawOfferButton offerId={o.id} />
                      </div>
                    )}
                  </div>
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
