/**
 * Backfill: re-normaliza títulos/marca/modelo/versão dos anúncios já na BD.
 *
 * Uso:
 *   npx tsx scripts/normalize-listings.ts           # aplica
 *   npx tsx scripts/normalize-listings.ts --dry-run # só mostra o que mudaria
 *
 * Idempotente: usa rawTitle como fonte (se já existir de uma passagem
 * anterior), por isso pode correr as vezes que for preciso.
 */
import { prisma } from "../lib/prisma";
import { normalizeVehicle } from "../lib/vehicle-normalize";
import { assessListingQuality } from "../lib/listing-quality";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH = 500;

async function main() {
  let cursor: string | undefined;
  let scanned = 0;
  let changed = 0;
  const samples: string[] = [];

  for (;;) {
    const rows = await prisma.scrapedListing.findMany({
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        rawTitle: true,
        brand: true,
        model: true,
        version: true,
        km: true,
        year: true,
        price: true,
        suspicious: true,
        suspiciousReasons: true,
      },
    });
    if (!rows.length) break;
    cursor = rows[rows.length - 1].id;
    scanned += rows.length;

    for (const r of rows) {
      const sourceTitle = r.rawTitle ?? r.title;
      const nv = normalizeVehicle({
        brand: r.brand,
        // usa o título original como matéria-prima — o campo model da BD pode
        // já vir truncado do parser antigo (ex. "qashqai 1")
        title: sourceTitle,
        model: null,
      });
      // reavalia também a qualidade (km/ano/preço + título de peças/salvado)
      const quality = assessListingQuality({
        km: r.km,
        year: r.year,
        price: r.price,
        title: sourceTitle,
      });
      const next = {
        title: nv.title,
        rawTitle: sourceTitle,
        brand: nv.brand ?? r.brand,
        model: nv.model ?? r.model,
        version: nv.version,
        suspicious: quality.suspicious,
        suspiciousReasons: JSON.stringify(quality.reasons),
      };
      const dirty =
        next.title !== r.title ||
        next.rawTitle !== r.rawTitle ||
        next.brand !== r.brand ||
        next.model !== r.model ||
        next.version !== r.version ||
        next.suspicious !== r.suspicious ||
        next.suspiciousReasons !== r.suspiciousReasons;
      if (!dirty) continue;
      changed++;
      if (samples.length < 20)
        samples.push(
          `  "${sourceTitle}"\n    → title="${next.title}" model="${next.model}" version="${next.version}"`
        );
      if (!DRY_RUN) {
        await prisma.scrapedListing.update({
          where: { id: r.id },
          data: next,
        });
      }
    }
    process.stdout.write(`\rAnalisados ${scanned} · alterados ${changed}`);
  }

  console.log(
    `\n${DRY_RUN ? "[dry-run] " : ""}Concluído: ${scanned} anúncios, ${changed} normalizados.`
  );
  if (samples.length) {
    console.log("\nExemplos:");
    console.log(samples.join("\n"));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
