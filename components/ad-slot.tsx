// Anúncios da rede Voga (reais) — mostrados sempre, mesmo em produção.
// "card" = retângulo 336x280 (a 100% do card); "banner" = leaderboard 728x90.
export default function AdSlot({
  variant = "card",
}: {
  variant?: "card" | "banner";
}) {
  if (variant === "banner") {
    return (
      <iframe
        src="https://voga-services.com/embed/anuncios?formato=728x90&tipo=misto"
        title="Voga — anúncios"
        loading="lazy"
        scrolling="no"
        className="mx-auto block h-[90px] w-full max-w-[728px] rounded-2xl border-0"
      />
    );
  }

  return (
    <iframe
      src="https://voga-services.com/embed/anuncios?formato=336x280&tipo=misto"
      title="Voga — anúncios"
      loading="lazy"
      scrolling="no"
      className="h-full min-h-[280px] w-full rounded-2xl border-0"
    />
  );
}
