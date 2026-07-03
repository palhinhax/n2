-- Normalização de anúncios externos: título limpo + versão
ALTER TABLE "ScrapedListing" ADD COLUMN "rawTitle" TEXT;
ALTER TABLE "ScrapedListing" ADD COLUMN "version" TEXT;
