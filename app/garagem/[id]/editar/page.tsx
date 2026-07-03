import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import EditCarForm from "@/components/edit-car-form";

export const dynamic = "force-dynamic";

export default async function EditCar({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) notFound();

  const car = await prisma.car.findUnique({
    where: { id: params.id },
    include: {
      brand: true,
      model: true,
      photos: { orderBy: { position: "asc" } },
    },
  });
  if (
    !car ||
    (car.ownerId !== session.user.id && (session.user as any).role !== "ADMIN")
  )
    notFound();

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteHeader />
      <div className="mx-auto w-[min(820px,94%)] py-7">
        <div className="mb-3 text-[0.88rem] font-medium text-n2muted">
          <Link href="/garagem" className="hover:underline">
            Garagem
          </Link>{" "}
          ›{" "}
          <Link href={`/garagem/${car.id}`} className="hover:underline">
            {car.brand.name} {car.model.name}
          </Link>{" "}
          › <b className="text-ink">Editar</b>
        </div>
        <h1 className="mb-5 font-head text-[2rem] font-extrabold text-ink">
          Editar carro
        </h1>
        <EditCarForm car={car} />
      </div>
      <SiteFooter />
    </div>
  );
}
