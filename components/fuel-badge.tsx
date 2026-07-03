// Badge de combustível com ícone e cor — usado nos cartões de carro.
// Identifica rapidamente o tipo: elétrico (azul), híbrido/plug-in (verde),
// diesel, gasolina, GPL.

type FuelStyle = {
  label: string;
  icon: string;
  bg: string; // classes de fundo/texto
};

function styleFor(fuelRaw?: string | null): FuelStyle | null {
  if (!fuelRaw) return null;
  const f = fuelRaw.toLowerCase();
  if (/plug/.test(f))
    return { label: "Plug-in", icon: "🔌", bg: "bg-[#1FA37A] text-white" };
  if (/el[ée]tric/.test(f))
    return { label: "Elétrico", icon: "⚡", bg: "bg-[#2B8FE0] text-white" };
  if (/h[íi]brid/.test(f))
    return { label: "Híbrido", icon: "🍃", bg: "bg-[#4BA65A] text-white" };
  if (/diesel|gas[oó]leo/.test(f))
    return { label: "Diesel", icon: "🛢️", bg: "bg-[#5B6B7B] text-white" };
  if (/gasolina|petrol/.test(f))
    return { label: "Gasolina", icon: "⛽", bg: "bg-[#D98A2B] text-white" };
  if (/gpl|lpg/.test(f))
    return { label: "GPL", icon: "💨", bg: "bg-[#7A5CC0] text-white" };
  return { label: fuelRaw, icon: "•", bg: "bg-ink/70 text-white" };
}

export default function FuelBadge({
  fuel,
  className = "",
}: {
  fuel?: string | null;
  className?: string;
}) {
  const s = styleFor(fuel);
  if (!s) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-bold shadow-sm ${s.bg} ${className}`}
    >
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}
