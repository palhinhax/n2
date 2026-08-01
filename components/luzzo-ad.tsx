// Anúncios da Luzzo (loja de eletrónica portuguesa) — o banner é servido e
// estilizado pela Luzzo, aqui só o embebemos.
// "barra"  = barra superior fina, 970x44
// "faixa"  = faixa larga (leaderboard), 970x90
const SIZES = {
  barra: {
    src: "https://www.luzzo-eletronica.com/embed/anuncio/barra",
    height: 44,
  },
  faixa: {
    src: "https://www.luzzo-eletronica.com/embed/anuncio/faixa",
    height: 90,
  },
} as const;

export function LuzzoAd({
  variant = "faixa",
}: {
  variant?: "barra" | "faixa";
}) {
  const { src, height } = SIZES[variant];

  return (
    <iframe
      src={src}
      title="Luzzo"
      loading="lazy"
      scrolling="no"
      style={{
        border: 0,
        borderRadius: 14,
        overflow: "hidden",
        width: "100%",
        height,
        maxWidth: 970,
        display: "block",
        marginInline: "auto",
      }}
    />
  );
}

export default LuzzoAd;
