import { prisma } from "../../lib/prisma";
prisma.scrapedListing
  .findFirst({ where: { id: "cmr4uqu26001b7pozevh9i1rq" } })
  .then((r) => {
    console.log(JSON.stringify(r, null, 1));
    process.exit();
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
