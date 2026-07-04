// Normalização de dados de anúncios estrangeiros — os sites vêm em alemão,
// francês, neerlandês, espanhol, italiano ou inglês; convertemos tudo para os
// termos canónicos usados no resto do Nacional 2 (ver lib/constants.ts).

import { normalizeVehicle } from "../../../lib/vehicle-normalize";
import type { ForeignRawListing } from "./types";

// ---- combustível -----------------------------------------------------------

const FUEL_MAP: [RegExp, string][] = [
  [/plug.?in|phev|hybride rechargeable|ibrida plug/i, "Híbrido Plug-In"],
  [
    /elektro|electrique|électrique|elektrisch|el[eé]ctrico|elettrica|electric|\bev\b|bev/i,
    "Elétrico",
  ],
  [/hybrid|hybride|h[íi]brido|ibrida|mhev|hev/i, "Híbrido"],
  [/diesel|gasoil|gasóleo|gazole|gasolio|tdi|hdi|dci|cdi/i, "Diesel"],
  [
    /benzin|essence|benzine|gasolina|benzina|petrol|gasoline|super/i,
    "Gasolina",
  ],
  [/gpl|lpg|autogas|glp/i, "GPL"],
  [/erdgas|cng|gnc|metano/i, "GPL"],
];

export function normalizeFuel(raw?: string | null): string | null {
  if (!raw) return null;
  for (const [re, canon] of FUEL_MAP) if (re.test(raw)) return canon;
  return raw.trim() || null;
}

// ---- caixa de velocidades ---------------------------------------------------

export function normalizeGearbox(raw?: string | null): string | null {
  if (!raw) return null;
  if (
    /autom|dsg|s.?tronic|tiptronic|dct|cvt|edc|pdk|steptronic|semi/i.test(raw)
  )
    return "Automática";
  if (/man|schalt|m[ée]canique|handgeschakeld|manuale/i.test(raw))
    return "Manual";
  return raw.trim() || null;
}

// ---- carroçaria -------------------------------------------------------------

const BODY_MAP: [RegExp, string][] = [
  [/kleinwagen|citadine|city|stadsauto|urbano|utilitaria/i, "Citadino"],
  [
    /kombi|break|estate|station|touring|avant|variant|sw\b|familiar/i,
    "Carrinha",
  ],
  [
    /suv|gel[äa]nde|tout.?terrain|todoterreno|fuoristrada|4x4|off.?road/i,
    "SUV / TT",
  ],
  [/limousine|berline|sedan|berlina|saloon/i, "Berlina"],
  [/coup[ée]/i, "Coupé"],
  [/cabrio|convertible|roadster|d[ée]capotable|descapotable|spider/i, "Cabrio"],
  [/van|monovolume|minivan|monospace|mpv|bus\b/i, "Monovolume"],
  [/pick.?up/i, "Pick-up"],
  [/compact|hatch|berline compacte|compacto/i, "Utilitário"],
];

export function normalizeBodyType(raw?: string | null): string | null {
  if (!raw) return null;
  for (const [re, canon] of BODY_MAP) if (re.test(raw)) return canon;
  return raw.trim() || null;
}

// ---- tipo de vendedor -------------------------------------------------------

export function normalizeSellerType(raw?: string | null): string | null {
  if (!raw) return null;
  if (/priv|particulier|particular|privato|privé/i.test(raw))
    return "Particular";
  if (
    /dealer|h[äa]ndler|professionnel|profesional|concession|garage|commer/i.test(
      raw
    )
  )
    return "Profissional";
  return raw.trim() || null;
}

// ---- 1ª matrícula → ano -----------------------------------------------------

/** Aceita "2019-03", "03/2019", "03.2019", "2019". Devolve "YYYY-MM" ou null. */
export function normalizeFirstRegistration(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = /^(\d{4})[-/.](\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}`;
  m = /^(\d{1,2})[-/.](\d{4})$/.exec(s);
  if (m) return `${m[2]}-${String(Number(m[1])).padStart(2, "0")}`;
  m = /^(\d{4})$/.exec(s);
  if (m) return `${m[1]}-06`;
  return null;
}

export const kwToCv = (kw?: number | null): number | null =>
  kw != null && kw > 0 ? Math.round(kw * 1.35962) : null;

// ---- normalização completa de um anúncio ------------------------------------

export interface NormalizedForeign extends ForeignRawListing {
  title: string;
  brand: string | null;
  model: string | null;
  version: string | null;
  year: number | null;
}

export function normalizeForeignListing(
  raw: ForeignRawListing
): NormalizedForeign {
  // reutiliza a normalização de marca/modelo/título do scraper nacional
  const nv = normalizeVehicle({
    brand: raw.brand,
    model: raw.model,
    title: raw.title,
  });

  const firstRegistration = normalizeFirstRegistration(raw.firstRegistration);
  const year =
    raw.year ??
    (firstRegistration ? Number(firstRegistration.slice(0, 4)) : null);

  return {
    ...raw,
    title: nv.title || raw.title,
    brand: nv.brand ?? raw.brand ?? null,
    model: nv.model ?? raw.model ?? null,
    version: nv.version ?? raw.version ?? null,
    year,
    firstRegistration,
    fuel: normalizeFuel(raw.fuel),
    gearbox: normalizeGearbox(raw.gearbox),
    bodyType: normalizeBodyType(raw.bodyType),
    sellerType: normalizeSellerType(raw.sellerType),
  };
}
