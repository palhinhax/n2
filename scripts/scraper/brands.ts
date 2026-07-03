import { prisma } from "../../lib/prisma";

/**
 * Regista marcas/modelos novos (vindos do scraping) na tabela oficial
 * Brand/Model, com normalização para reduzir lixo/duplicados.
 * Mantém um cache em memória para não bater na BD a cada anúncio.
 */

// aliases de marca conhecidos → nome canónico
const BRAND_CANON: Record<string, string> = {
  vw: "Volkswagen",
  volkswagen: "Volkswagen",
  "mercedes benz": "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz",
  mercedes: "Mercedes-Benz",
  bmw: "BMW",
  seat: "SEAT",
  mini: "MINI",
  ds: "DS",
  mg: "MG",
  "alfa romeo": "Alfa Romeo",
  "land rover": "Land Rover",
  "aston martin": "Aston Martin",
};

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(/[\s-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function canonBrand(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > 40) return null;
  const key = t.toLowerCase();
  if (BRAND_CANON[key]) return BRAND_CANON[key];
  // ignora valores obviamente inválidos
  if (/^\d+$/.test(t)) return null;
  return titleCase(t);
}

export function canonModel(raw: string): string | null {
  let t = raw.trim();
  if (!t) return null;
  // tira sufixo de combustível colado ao slug do modelo
  t = t.replace(/\s+(gasolina|diesel|el[ée]trico|gpl|h[íi]brido.*)$/i, "");
  // encurta versões muito longas (mantém as 4 primeiras palavras)
  const words = t.split(/\s+/).slice(0, 4).join(" ");
  const clean = words.trim();
  if (!clean || clean.length > 40) return null;
  return clean;
}

// caches (nome minúsculo → id)
const brandCache = new Map<string, number>();
const modelCache = new Set<string>(); // `${brandId}|${modelLower}`

/** Garante que a marca/modelo existem na tabela oficial. */
export async function ensureBrandModel(
  rawBrand: string | null | undefined,
  rawModel: string | null | undefined
): Promise<void> {
  if (!rawBrand) return;
  const brandName = canonBrand(rawBrand);
  if (!brandName) return;

  const bKey = brandName.toLowerCase();
  let brandId = brandCache.get(bKey);
  if (brandId == null) {
    const brand = await prisma.brand.upsert({
      where: { name: brandName },
      update: {},
      create: { name: brandName },
      select: { id: true },
    });
    brandId = brand.id;
    brandCache.set(bKey, brandId);
  }

  if (!rawModel) return;
  const modelName = canonModel(rawModel);
  if (!modelName) return;

  const mKey = `${brandId}|${modelName.toLowerCase()}`;
  if (modelCache.has(mKey)) return;
  await prisma.model.upsert({
    where: { brandId_name: { brandId, name: modelName } },
    update: {},
    create: { brandId, name: modelName },
  });
  modelCache.add(mKey);
}
