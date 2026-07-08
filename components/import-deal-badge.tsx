import { DEAL_LABEL, DEAL_STYLE } from "@/lib/import-cost";

/** Selo do negócio de importação ("Excelente negócio…", "Não compensa…"). */
export default function ImportDealBadge({
  rating,
  className = "",
}: {
  rating?: string | null;
  className?: string;
}) {
  if (!rating || !(rating in DEAL_LABEL)) return null;
  const r = rating as keyof typeof DEAL_LABEL;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-bold ${DEAL_STYLE[r]} ${className}`}
    >
      {DEAL_LABEL[r]}
    </span>
  );
}
