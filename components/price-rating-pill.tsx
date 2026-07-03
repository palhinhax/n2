// Pill compacto de classificação de preço para os cartões da listagem.
// Sem dependências de servidor (seguro no bundle do cliente).

const MAP: Record<string, { label: string; color: string; icon: string }> = {
  great: { label: "Excelente preço", color: "#1FA37A", icon: "▼" },
  good: { label: "Bom preço", color: "#4BA65A", icon: "▼" },
  fair: { label: "Preço de mercado", color: "#5B6B7B", icon: "●" },
  high: { label: "Acima do mercado", color: "#C6603B", icon: "▲" },
};

export default function PriceRatingPill({
  rating,
  className = "",
}: {
  rating?: string | null;
  className?: string;
}) {
  if (!rating || !MAP[rating]) return null;
  const { label, color, icon } = MAP[rating];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-bold text-white ${className}`}
      style={{ backgroundColor: color }}
    >
      <span className="text-[0.62rem]">{icon}</span>
      {label}
    </span>
  );
}
