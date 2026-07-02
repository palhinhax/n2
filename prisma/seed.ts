import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const passwordHash = await bcrypt.hash("password123", 12);
  
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      passwordHash,
      posts: {
        create: [
          {
            title: "Welcome to the SaaS Template",
            content: "This is your first post. Feel free to edit or delete it.",
          },
          {
            title: "Getting Started with Next.js 14",
            content: "Next.js 14 introduces the App Router, which provides a more intuitive way to build applications.",
          },
          {
            title: "Working with Prisma",
            content: "Prisma is a next-generation ORM that makes working with databases a breeze.",
          },
        ],
      },
    },
  });

  console.log("✅ Demo user created:", user.email);
  console.log("✅ Demo posts created");
  console.log("\n📧 Login credentials:");
  console.log("   Email: demo@example.com");
  console.log("   Password: password123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
