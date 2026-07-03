import { prisma } from "../../lib/prisma";
import { canonBrandName, normalizeVehicle } from "../../lib/vehicle-normalize";

/**
 * Regista marcas/modelos novos (vindos do scraping) na tabela oficial
 * Brand/Model, com normalização para reduzir lixo/duplicados.
 * Mantém um cache em memória para não bater na BD a cada anúncio.
 */

export function canonBrand(raw: string): string | null {
  return canonBrandName(raw);
}

/** Modelo limpo (sem motorização/versão) — ex. "qashqai 1 5 dci" → "Qashqai". */
export function canonModel(
  rawBrand: string | null | undefined,
  rawModel: string
): string | null {
  const { model } = normalizeVehicle({ brand: rawBrand, model: rawModel });
  if (!model || model.length > 40) return null;
  return model;
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
  const modelName = canonModel(rawBrand, rawModel);
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
