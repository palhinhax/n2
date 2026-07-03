import {
  RATING_LABEL,
  RATING_STYLE,
  type MarketStats,
  type PriceRating,
} from "@/lib/price-intel";
import { eur } from "@/lib/seo";

// Mostra a classificação de preço + contexto de mercado numa página de carro.
export default function PriceBadge({
  rating,
  stats,
}: {
  rating: PriceRating | null;
  stats: MarketStats | null;
}) {
  if (!rating || !stats) return null;
  return (
    <div className="mt-3 rounded-xl border border-outline bg-white/60 p-3">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.78rem] font-bold ${RATING_STYLE[rating]}`}
      >
        {rating === "great" || rating === "good"
          ? "▼"
          : rating === "high"
            ? "▲"
            : "●"}{" "}
        {RATING_LABEL[rating]}
      </span>
      <p className="mt-1.5 text-[0.82rem] text-n2muted">
        Preço mediano de mercado para modelos semelhantes:{" "}
        <b className="text-ink">{eur(stats.median)}</b> (com base em{" "}
        {stats.count} anúncios; típico entre {eur(stats.p25)} e {eur(stats.p75)}
        ).
      </p>
    </div>
  );
}
