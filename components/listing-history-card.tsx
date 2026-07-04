import { fmtEur } from "@/lib/constants";
import type { ListingHistory } from "@/lib/listing-history";

// Cartão "Histórico do anúncio": dias à venda, mudanças de preço com linha
// temporal, e aviso de republicação. Componente de servidor (sem estado).

export default function ListingHistoryCard({
  history,
}: {
  history: ListingHistory;
}) {
  const { daysOnMarket, changes, points, republished } = history;

  const daysLabel =
    daysOnMarket === 0
      ? "Publicado hoje"
      : daysOnMarket === 1
        ? "À venda há 1 dia"
        : `À venda há ${daysOnMarket} dias`;

  // mais recente primeiro na lista
  const timeline = [...points].reverse();

  return (
    <div className="n2-card p-5">
      <h2 className="mb-3 font-head text-[1.05rem] font-bold text-ink">
        📅 Histórico do anúncio
      </h2>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-cream px-3 py-1 text-[0.82rem] font-bold text-ink">
          {daysLabel}
        </span>
        <span className="rounded-full bg-cream px-3 py-1 text-[0.82rem] font-bold text-ink">
          {changes === 0
            ? "Preço nunca mudou"
            : changes === 1
              ? "1 mudança de preço"
              : `${changes} mudanças de preço`}
        </span>
        {republished && (
          <span className="rounded-full bg-[#C6603B]/15 px-3 py-1 text-[0.82rem] font-bold text-[#C6603B]">
            ⟳ Republicado
          </span>
        )}
      </div>

      {points.length > 1 && (
        <ul className="mt-3 space-y-1.5 border-t border-outline pt-3">
          {timeline.map((p, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 text-[0.88rem]"
            >
              <span className="text-n2muted">
                {p.date.toLocaleDateString("pt-PT")}
              </span>
              <span className="flex items-center gap-2">
                {p.delta != null && p.delta !== 0 && (
                  <span
                    className={
                      p.delta < 0
                        ? "text-[0.78rem] font-bold text-olive"
                        : "text-[0.78rem] font-bold text-[#C6603B]"
                    }
                  >
                    {p.delta < 0 ? "▼" : "▲"} {fmtEur(Math.abs(p.delta))}
                  </span>
                )}
                <b className="text-ink">{fmtEur(p.price)}</b>
              </span>
            </li>
          ))}
        </ul>
      )}

      {republished && (
        <p className="mt-3 border-t border-outline pt-2 text-[0.76rem] leading-snug text-n2muted2">
          Este carro parece ter sido anunciado antes noutro anúncio entretanto
          removido — pode indicar que está à venda há mais tempo do que parece.
        </p>
      )}
    </div>
  );
}
