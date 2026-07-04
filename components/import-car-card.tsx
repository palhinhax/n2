import Link from "next/link";
import { fmtEur } from "@/lib/constants";
import { countryByCode } from "@/lib/import-countries";
import FuelBadge from "@/components/fuel-badge";
import ImportDealBadge from "@/components/import-deal-badge";

/** Cartão de um anúncio estrangeiro — visualmente distinto dos nacionais
 *  (bandeira do país, selo "Estrangeiro" e total estimado em Portugal). */
export default function ImportCarCard({ listing }: { listing: any }) {
  let photos: string[] = [];
  try {
    photos = JSON.parse(listing.imageUrls || "[]");
  } catch {
    photos = [];
  }
  const photo = photos[0];
  const country = countryByCode(listing.country);

  return (
    <Link
      href={`/importar-carros/anuncio/${listing.id}`}
      prefetch={false}
      className="n2-card flex flex-col overflow-hidden border-dashed transition hover:-translate-y-1 hover:shadow-warmlg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-b from-[#E9EEF4] to-[#D4DEE9]">
        <span className="absolute left-2 top-2 z-10 rounded-full bg-ink/80 px-2 py-0.5 text-[0.72rem] font-bold text-white">
          {country?.flag ?? "🇪🇺"} {country?.name ?? listing.country} ·
          Estrangeiro
        </span>
        {listing.fuel && (
          <FuelBadge
            fuel={listing.fuel}
            className="absolute left-2 top-9 z-10"
          />
        )}
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
          <span className="absolute inset-0 flex items-center justify-center text-[2.2rem]">
            {country?.flag ?? "🇪🇺"}
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
          {listing.co2 != null && <span>{listing.co2} g CO₂</span>}
        </div>
        <div className="mt-auto border-t border-outline pt-2">
          <div className="flex items-end justify-between">
            <div>
              <span className="font-head text-[1.35rem] font-extrabold text-ink">
                {listing.priceEur != null
                  ? fmtEur(listing.priceEur)
                  : "Sob consulta"}
              </span>
              <span className="ml-1 text-[0.72rem] font-semibold text-n2muted2">
                em {country?.name ?? listing.country}
              </span>
            </div>
          </div>
          {listing.importTotalEur != null && (
            <div className="mt-1 text-[0.82rem] font-semibold text-n2muted">
              Total estimado em PT:{" "}
              <b className="text-ink">{fmtEur(listing.importTotalEur)}</b>
              <span className="ml-1 text-[0.7rem] font-medium text-n2muted2">
                (impostos e custos incluídos)
              </span>
            </div>
          )}
          {listing.savingsEur != null && listing.savingsEur > 0 && (
            <div className="text-[0.82rem] font-bold text-olive">
              Poupança estimada: {fmtEur(listing.savingsEur)}
            </div>
          )}
          <ImportDealBadge rating={listing.dealRating} className="mt-1.5" />
        </div>
        <div className="flex justify-between text-[0.74rem] font-medium text-n2muted2">
          <span>{listing.sellerType ?? "Vendedor"}</span>
          <span>{listing.region ?? ""}</span>
        </div>
      </div>
    </Link>
  );
}
