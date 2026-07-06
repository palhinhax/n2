-- Bring the database in sync with the current Prisma schema.
-- These columns/tables are already used by the generated Prisma Client.

ALTER TABLE "SavedSearch" ADD COLUMN IF NOT EXISTS "notifiedCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Favorite" ADD COLUMN IF NOT EXISTS "notifiedPrice" INTEGER;

ALTER TABLE "ScrapedListing" ADD COLUMN IF NOT EXISTS "suspicious" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ScrapedListing" ADD COLUMN IF NOT EXISTS "suspiciousReasons" TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS "PricePoint" (
    "id" TEXT NOT NULL,
    "carId" TEXT,
    "listingId" TEXT,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricePoint_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PricePoint_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PricePoint_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ScrapedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ModelReport" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "fuel" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScrapedListing_active_isDuplicate_suspicious_idx" ON "ScrapedListing"("active", "isDuplicate", "suspicious");

CREATE INDEX IF NOT EXISTS "PricePoint_carId_createdAt_idx" ON "PricePoint"("carId", "createdAt");
CREATE INDEX IF NOT EXISTS "PricePoint_listingId_createdAt_idx" ON "PricePoint"("listingId", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "ModelReport_key_key" ON "ModelReport"("key");
