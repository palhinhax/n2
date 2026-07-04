/**
 * Backfill: avalia a qualidade de dados (km/ano/preço) de todos os anúncios
 * externos já na BD e marca/desmarca o flag `suspicious`.
 *
 * Uso:
 *   npx tsx scripts/flag-suspicious.ts           # aplica
 *   npx tsx scripts/flag-suspicious.ts --dry-run # só mostra o que mudaria
 *
 * Idempotente — pode correr as vezes que for preciso (ex.: depois de mudar
 * as regras em lib/listing-quality.ts).
 */
import { prisma } from "../lib/prisma";
import { assessListingQuality } from "../lib/listing-quality";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH = 500;

async function main() {
  let cursor: string | undefined;
  let scanned = 0;
  let flagged = 0;
  let unflagged = 0;
  const samples: string[] = [];

  for (;;) {
    const rows = await prisma.scrapedListing.findMany({
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
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
      const q = assessListingQuality(r);
      const reasonsJson = JSON.stringify(q.reasons);
      if (r.suspicious === q.suspicious && r.suspiciousReasons === reasonsJson)
        continue;
      if (q.suspicious) {
        flagged++;
        if (samples.length < 25)
          samples.push(
            `  "${r.title}" — km=${r.km ?? "?"} ano=${r.year ?? "?"} preço=${r.price ?? "?"} → ${q.reasons.join(", ")}`
          );
      } else {
        unflagged++;
      }
      if (!DRY_RUN) {
        await prisma.scrapedListing.update({
          where: { id: r.id },
          data: { suspicious: q.suspicious, suspiciousReasons: reasonsJson },
        });
      }
    }
    process.stdout.write(
      `\rAnalisados ${scanned} · suspeitos ${flagged} · limpos ${unflagged}`
    );
  }

  console.log(
    `\n${DRY_RUN ? "[dry-run] " : ""}Concluído: ${scanned} anúncios, ${flagged} marcados suspeitos, ${unflagged} desmarcados.`
  );
  if (samples.length) {
    console.log("\nExemplos de suspeitos:");
    console.log(samples.join("\n"));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
