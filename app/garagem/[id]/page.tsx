import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CarArt from "@/components/car-art";
import SalePanel from "@/components/sale-panel";
import ReminderPanel from "@/components/reminder-panel";
import OffersReceived from "@/components/offers-received";
import DeleteCar from "@/components/delete-car";

export const dynamic = "force-dynamic";

export default async function ManageCar({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const car = await prisma.car.findUnique({
    where: { id: params.id },
    include: {
      brand: true,
      model: true,
      photos: { orderBy: { position: "asc" } },
      reminders: { orderBy: { dueDate: "asc" } },
      offers: { include: { buyer: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (
    !car ||
    (car.ownerId !== session!.user.id &&
      (session!.user as any).role !== "ADMIN")
  )
    notFound();

  const statusText: Record<string, string> = {
    GARAGE: "Na garagem (não está à venda)",
    PENDING: "Em validação pela equipa",
    APPROVED: "Aprovado e visível a compradores",
    REJECTED: "Rejeitado pela moderação",
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(1100px,94%)] py-7">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/garagem" className="hover:underline">
            Garagem
          </Link>{" "}
          ›{" "}
          <b className="text-ink">
            {car.brand.name} {car.model.name}
          </b>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="w-40 overflow-hidden rounded-xl border border-outline bg-gradient-to-b from-[#FCF4E2] to-[#F4E2BC]">
            {car.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={car.photos[0].url}
                alt=""
                className="aspect-[16/10] w-full object-cover"
              />
            ) : (
              <CarArt color={car.color} />
            )}
          </div>
          <div>
            <h1 className="font-head text-[1.8rem] font-extrabold text-ink">
              {car.brand.name} {car.model.name} {car.version || ""}
            </h1>
            <p className="text-n2muted">
              {car.year} · {car.km.toLocaleString("pt-PT")} km · {car.fuel} ·{" "}
              {car.gearbox}
              {car.evRange ? ` · ⚡ ${car.evRange} km` : ""}
            </p>
            <p className="mt-1 text-[0.85rem] font-semibold text-ink">
              Estado:{" "}
              <span
                className={
                  car.status === "APPROVED"
                    ? "text-olive"
                    : car.status === "PENDING"
                      ? "text-clay"
                      : car.status === "REJECTED"
                        ? "text-red-700"
                        : "text-n2muted"
                }
              >
                {statusText[car.status]}
              </span>
            </p>
          </div>
          <div className="ml-auto">
            <DeleteCar carId={car.id} />
          </div>
        </div>
        <div className="grid items-start gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <SalePanel
              car={{
                id: car.id,
                forSale: car.forSale,
                price: car.price,
                negotiable: car.negotiable,
              }}
            />
            <OffersReceived offers={car.offers} />
          </div>
          <ReminderPanel carId={car.id} reminders={car.reminders} />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
