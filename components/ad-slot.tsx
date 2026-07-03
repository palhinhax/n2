// Publicidade fake — o modelo de negócio do site grátis
const ADS = [
  {
    title: "Seguro Auto Miradouro",
    text: "3 meses grátis — simula em 2 minutos e poupa até 240 €/ano.",
    cta: "Simular agora",
  },
  {
    title: "CredAuto — crédito em 24h",
    text: "Prestações desde 119 €/mês. Simulação online sem compromisso.",
    cta: "Simular crédito",
  },
  {
    title: "Oficinas Serra & Filhos",
    text: "Revisão completa desde 89 €, em todo o país.",
    cta: "Marcar revisão",
  },
  {
    title: "Pneus Norte 24h",
    text: "4 pneus montados hoje, desde 45 €/unidade.",
    cta: "Ver preços",
  },
];

export default function AdSlot({
  variant = "card",
  index = 0,
}: {
  variant?: "card" | "banner";
  index?: number;
}) {
  const ad = ADS[index % ADS.length];
  if (variant === "banner") {
    return (
      <div className="relative flex flex-col items-center gap-4 rounded-2xl border border-dashed border-outline2 bg-white px-6 py-4 sm:flex-row">
        <span className="absolute right-3 top-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-n2muted2">
          Publicidade
        </span>
        <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-olive bg-[#F3F6E8] font-head font-extrabold text-olive">
          AD
        </div>
        <div className="text-center sm:text-left">
          <h4 className="font-head text-[1.2rem] font-extrabold text-ink">
            {ad.title}
          </h4>
          <p className="text-[0.9rem] text-n2muted">{ad.text}</p>
        </div>
        <span className="btn-olive btn-xs sm:ml-auto">{ad.cta}</span>
      </div>
    );
  }
  return (
    <div className="relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline2 bg-gradient-to-br from-white to-[#FBF0DA] p-6 text-center">
      <span className="absolute right-3 top-1.5 text-[0.62rem] font-bold uppercase tracking-wider text-n2muted2">
        Publicidade
      </span>
      <div className="mb-2 grid h-12 w-12 place-items-center rounded-full border-2 border-olive bg-[#F3F6E8] font-head font-extrabold text-olive">
        AD
      </div>
      <h4 className="font-head text-[1.25rem] font-extrabold text-ink">
        {ad.title}
      </h4>
      <p className="mb-3 text-[0.88rem] text-n2muted">{ad.text}</p>
      <span className="btn-olive btn-xs">{ad.cta}</span>
    </div>
  );
}
