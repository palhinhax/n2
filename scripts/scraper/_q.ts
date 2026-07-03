import { prisma } from "../../lib/prisma";
prisma.scrapedListing
  .findFirst({ where: { id: "cmr5cytjv03jne7lwd4k6g965" } })
  .then((r) => {
    console.log(JSON.stringify(r, null, 1));
    process.exit();
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
