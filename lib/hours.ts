// Horário semanal estruturado. Guardado como JSON string no campo User.hours.
// Formato: { mon: [["09:00","12:00"],["13:00","18:00"]], sun: [] }  ([] = fechado)

export const DAYS: { key: string; label: string; short: string }[] = [
  { key: "mon", label: "Segunda", short: "Seg" },
  { key: "tue", label: "Terça", short: "Ter" },
  { key: "wed", label: "Quarta", short: "Qua" },
  { key: "thu", label: "Quinta", short: "Qui" },
  { key: "fri", label: "Sexta", short: "Sex" },
  { key: "sat", label: "Sábado", short: "Sáb" },
  { key: "sun", label: "Domingo", short: "Dom" },
];

export type WeekHours = Record<string, [string, string][]>;

export function parseHours(raw?: string | null): WeekHours | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
  } catch {
    /* não é JSON — horário antigo em texto livre */
  }
  return null;
}

/** Resumo compacto por dia, agrupando dias com o mesmo horário. */
export function formatHours(
  raw?: string | null
): { day: string; text: string }[] | null {
  const wk = parseHours(raw);
  if (!wk) return null;
  return DAYS.map((d) => {
    const periods = wk[d.key] ?? [];
    const text = periods.length
      ? periods.map(([a, b]) => `${a}–${b}`).join(" · ")
      : "Fechado";
    return { day: d.label, text };
  });
}
