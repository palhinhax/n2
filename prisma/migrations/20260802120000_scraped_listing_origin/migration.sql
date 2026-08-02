ALTER TABLE "ScrapedListing"
ADD COLUMN IF NOT EXISTS "origin" TEXT NOT NULL DEFAULT 'scraper';

CREATE INDEX IF NOT EXISTS "ScrapedListing_url_idx" ON "ScrapedListing"("url");
