import Link from "next/link";
import CarArt from "@/components/car-art";
import FuelBadge from "@/components/fuel-badge";
import FavoriteButton from "@/components/favorite-button";
import { fmtEur, monthly } from "@/lib/constants";

export default function CarCard({ car }: { car: any }) {
  const photo = car.photos?.[0];
  return (
    <Link
      href={`/carros/${car.id}`}
      className="n2-card flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-warmlg"
    >
      <div className="relative flex aspect-[16/10] items-center justify-center bg-gradient-to-b from-[#FCF4E2] to-[#F4E2BC]">
        {car.fuel && (
          <FuelBadge fuel={car.fuel} className="absolute left-2 top-2 z-10" />
        )}
        <FavoriteButton kind="car" id={car.id} />
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <CarArt color={car.color} className="w-[86%]" />
        )}
        <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[0.72rem] font-semibold text-white">
          📷 {car.photos?.length || 0}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="font-head text-[1.1rem] font-bold leading-tight text-ink">
          {car.brand.name} {car.model.name}
          <small className="block font-barlow text-[0.8rem] font-medium text-n2muted">
            {car.version ||
              `${car.power ? car.power + " cv · " : ""}${car.gearbox}`}
          </small>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[0.8rem] font-medium text-n2muted">
          <span>{car.year}</span>
          <span>{car.km.toLocaleString("pt-PT")} km</span>
          <span>{car.fuel}</span>
          {car.evRange ? (
            <span className="font-semibold text-olive">
              ⚡ {car.evRange} km autonomia
            </span>
          ) : null}
        </div>
        <div className="mt-auto flex items-end justify-between border-t border-outline pt-2">
          <span className="font-head text-[1.35rem] font-extrabold text-ink">
            {fmtEur(car.price)}
          </span>
          {car.price ? (
            <span className="text-right text-[0.72rem] font-semibold text-n2muted">
              desde
              <br />
              <b className="text-bark">{monthly(car.price)} €/mês</b>
            </span>
          ) : null}
        </div>
        <div className="flex justify-between text-[0.74rem] font-medium text-n2muted2">
          <span>
            {car.owner?.name?.split(" ")[0] || "Vendedor"} ·{" "}
            {car.district || "Portugal"}
          </span>
          <span>
            {car._count?.offers ? `${car._count.offers} ofertas` : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
