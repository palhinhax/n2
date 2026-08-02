import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const id = "cmsbq2sag08f9r2ah1ohcnzbz";
  const l = await prisma.scrapedListing.findUnique({ where: { id } });
  if (!l) {
    console.log("NOT FOUND");
    return;
  }
  console.log(JSON.stringify(l, null, 2));
}

main().finally(() => prisma.$disconnect());
