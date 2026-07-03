import Link from "next/link";
import { fmtEur } from "@/lib/constants";

export const SOURCE_LABEL: Record<string, string> = {
  OLX: "OLX",
  STANDVIRTUAL: "Standvirtual",
  PISCAPISCA: "Pisca Pisca",
};

export default function ExternalCarCard({ listing }: { listing: any }) {
  let photos: string[] = [];
  try {
    photos = JSON.parse(listing.imageUrls || "[]");
  } catch {
    photos = [];
  }
  const photo = photos[0];

  return (
    <Link
      href={`/carros/externo/${listing.id}`}
      className="n2-card flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-warmlg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-b from-[#FCF4E2] to-[#F4E2BC]">
        <span className="n2-tag absolute left-2 top-2 z-10 bg-bark">
          {SOURCE_LABEL[listing.source] ?? listing.source}
        </span>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[0.85rem] font-medium text-n2muted">
            Sem foto
          </span>
        )}
        {photos.length > 0 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[0.72rem] font-semibold text-white">
            📷 {photos.length}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="font-head text-[1.1rem] font-bold leading-tight text-ink">
          {listing.title}
          <small className="block font-barlow text-[0.8rem] font-medium text-n2muted">
            {listing.power ? `${listing.power} cv · ` : ""}
            {listing.gearbox ?? ""}
          </small>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[0.8rem] font-medium text-n2muted">
          {listing.year && <span>{listing.year}</span>}
          {listing.km != null && (
            <span>{listing.km.toLocaleString("pt-PT")} km</span>
          )}
          {listing.fuel && <span>{listing.fuel}</span>}
        </div>
        <div className="mt-auto flex items-end justify-between border-t border-outline pt-2">
          <span className="font-head text-[1.35rem] font-extrabold text-ink">
            {listing.price != null ? fmtEur(listing.price) : "Sob consulta"}
          </span>
          <span className="text-right text-[0.72rem] font-semibold text-n2muted">
            anúncio externo
          </span>
        </div>
        <div className="flex justify-between text-[0.74rem] font-medium text-n2muted2">
          <span>{listing.sellerType ?? "Vendedor"}</span>
          <span>{listing.location ?? ""}</span>
        </div>
      </div>
    </Link>
  );
}
