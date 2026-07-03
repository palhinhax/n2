import { prisma } from "../../lib/prisma";
import { ensureListingDetail } from "../../lib/scraped-detail";

async function main() {
  const l = await prisma.scrapedListing.findUnique({
    where: { id: "cmr5bu7li026ye7lwzk9r6cl4" },
  });
  if (!l) throw new Error("não encontrado");
  const u = await ensureListingDetail({ ...l, detailsFetchedAt: null });
  console.log(`${u?.title} → year=${u?.year} km=${u?.km}`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
