import {
  RATING_LABEL,
  type MarketStats,
  type PriceRating,
} from "@/lib/price-intel";
import { eur } from "@/lib/seo";

const PIN: Record<PriceRating, string> = {
  great: "#1FA37A",
  good: "#4BA65A",
  fair: "#5B6B7B",
  high: "#C6603B",
};
const TINT: Record<PriceRating, string> = {
  great: "border-[#1FA37A]/25 bg-[#1FA37A]/8",
  good: "border-[#4BA65A]/25 bg-[#4BA65A]/8",
  fair: "border-outline bg-white/70",
  high: "border-[#C6603B]/25 bg-[#C6603B]/8",
};
const ICON: Record<PriceRating, string> = {
  great: "▼",
  good: "▼",
  fair: "●",
  high: "▲",
};

// Classificação de preço + barra de posição de mercado.
export default function PriceBadge({
  rating,
  stats,
  price,
}: {
  rating: PriceRating | null;
  stats: MarketStats | null;
  price?: number | null;
}) {
  if (!rating || !stats) return null;

  const lo = Math.min(stats.min, price ?? stats.min);
  const hi = Math.max(stats.max, price ?? stats.max);
  const span = Math.max(1, hi - lo);
  const pos = (v: number) =>
    Math.max(0, Math.min(100, ((v - lo) / span) * 100));

  const pinColor = PIN[rating];
  const delta = price != null ? price - stats.median : null;

  return (
    <div className={`mt-3 rounded-2xl border p-4 ${TINT[rating]}`}>
      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.82rem] font-extrabold text-white"
          style={{ backgroundColor: pinColor }}
        >
          <span className="text-[0.72rem]">{ICON[rating]}</span>
          {RATING_LABEL[rating]}
        </span>
        {delta != null && Math.abs(delta) >= 50 && (
          <span
            className="text-[0.82rem] font-bold"
            style={{ color: pinColor }}
          >
            {delta > 0 ? "+" : "−"}
            {eur(Math.abs(delta))} vs mediana
          </span>
        )}
      </div>

      {/* barra de mercado */}
      <div className="mt-4">
        <div className="relative h-2.5 rounded-full bg-gradient-to-r from-[#4BA65A] via-[#E8C24D] to-[#C6603B]">
          {/* faixa típica p25–p75 */}
          <div
            className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full ring-2 ring-white/70"
            style={{
              left: `${pos(stats.p25)}%`,
              width: `${pos(stats.p75) - pos(stats.p25)}%`,
              background: "rgba(42,33,26,0.06)",
            }}
          />
          {/* mediana */}
          <div
            className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-ink/50"
            style={{ left: `${pos(stats.median)}%` }}
          />
          {/* marcador do preço deste anúncio */}
          {price != null && (
            <div
              className="absolute -translate-x-1/2 rounded-full border-[3px] border-white shadow-warm"
              style={{
                left: `${pos(price)}%`,
                width: 18,
                height: 18,
                top: -5,
                backgroundColor: pinColor,
              }}
            />
          )}
        </div>
        <div className="mt-2 flex justify-between text-[0.72rem] font-semibold text-n2muted2">
          <span>{eur(stats.p25)}</span>
          <span className="text-ink">mediana {eur(stats.median)}</span>
          <span>{eur(stats.p75)}</span>
        </div>
      </div>

      <p className="mt-2 text-[0.76rem] text-n2muted2">
        Com base em {stats.count} anúncios semelhantes no mercado.
      </p>
    </div>
  );
}
