// Anúncios da Luzzo (loja de eletrónica portuguesa) — o banner é servido e
// estilizado pela Luzzo, aqui só o embebemos.
// "barra"     = barra superior fina, 970x44
// "faixa"     = faixa larga (leaderboard), 970x90
// "retangulo" = retângulo 300x250, para ocupar uma célula da grelha de cards
const SIZES = {
  barra: {
    src: "https://www.luzzo-eletronica.com/embed/anuncio/barra",
    width: 970,
    height: 44,
  },
  faixa: {
    src: "https://www.luzzo-eletronica.com/embed/anuncio/faixa",
    width: 970,
    height: 90,
  },
  retangulo: {
    src: "https://www.luzzo-eletronica.com/embed/anuncio/retangulo",
    width: 300,
    height: 250,
  },
} as const;

const DEFAULT_TEMA = "automovel-e-2-rodas";

export function LuzzoAd({
  variant = "faixa",
  tema = DEFAULT_TEMA,
}: {
  variant?: keyof typeof SIZES;
  tema?: string;
}) {
  const { src, width, height } = SIZES[variant];
  const embedSrc = tema ? `${src}?tema=${encodeURIComponent(tema)}` : src;
  // o retângulo ocupa a célula da grelha por inteiro — mesma largura e mesma
  // altura dos cards de carros ao lado. O embed é fluido, adapta-se ao
  // tamanho do iframe. As barras são banners de altura fixa.
  const fills = variant === "retangulo";

  return (
    <iframe
      src={embedSrc}
      title="Luzzo"
      loading="lazy"
      scrolling="no"
      style={{
        border: 0,
        borderRadius: 14,
        overflow: "hidden",
        display: "block",
        width: "100%",
        marginInline: "auto",
        ...(fills
          ? // minHeight para não colapsar fora de uma grelha, onde a célula
            // não tem altura definida
            { height: "100%", minHeight: height, alignSelf: "stretch" }
          : { height, maxWidth: width }),
      }}
    />
  );
}

export default LuzzoAd;
