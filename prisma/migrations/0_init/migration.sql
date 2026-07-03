-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "phone" TEXT,
    "district" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountType" TEXT NOT NULL DEFAULT 'PARTICULAR',
    "avatarUrl" TEXT,
    "bio" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "standName" TEXT,
    "nif" TEXT,
    "website" TEXT,
    "hours" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "lastCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carId" TEXT,
    "listingId" TEXT,
    "priceWhenSaved" INTEGER,
    "seenPrice" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" INTEGER NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "brandId" INTEGER NOT NULL,
    "modelId" INTEGER NOT NULL,
    "version" TEXT,
    "year" INTEGER NOT NULL,
    "km" INTEGER NOT NULL,
    "fuel" TEXT NOT NULL,
    "gearbox" TEXT NOT NULL,
    "power" INTEGER,
    "evRange" INTEGER,
    "plate" TEXT,
    "color" TEXT NOT NULL DEFAULT '#CE994B',
    "description" TEXT,
    "district" TEXT,
    "forSale" BOOLEAN NOT NULL DEFAULT false,
    "price" INTEGER,
    "negotiable" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'GARAGE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrowseEvent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "carId" TEXT,
    "listingId" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "fuel" TEXT,
    "gearbox" TEXT,
    "price" INTEGER,
    "year" INTEGER,
    "query" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrowseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarView" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapedListing" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "km" INTEGER,
    "fuel" TEXT,
    "gearbox" TEXT,
    "power" INTEGER,
    "displacement" INTEGER,
    "price" INTEGER,
    "location" TEXT,
    "sellerType" TEXT,
    "sellerName" TEXT,
    "imageUrls" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "equipment" TEXT NOT NULL DEFAULT '[]',
    "color" TEXT,
    "doors" INTEGER,
    "seats" INTEGER,
    "drivetrain" TEXT,
    "bodyType" TEXT,
    "condition" TEXT,
    "registrationDate" TEXT,
    "warranty" TEXT,
    "co2" INTEGER,
    "detailsFetchedAt" TIMESTAMP(3),
    "dedupeKey" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "previousPrice" INTEGER,
    "priceChangedAt" TIMESTAMP(3),

    CONSTRAINT "ScrapedListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeState" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapeState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "carId" TEXT,
    "listingId" TEXT,
    "vehicleTitle" TEXT,
    "price" INTEGER NOT NULL,
    "downPayment" INTEGER NOT NULL,
    "months" INTEGER NOT NULL,
    "monthlyEstimate" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE INDEX "Favorite_carId_idx" ON "Favorite"("carId");

-- CreateIndex
CREATE INDEX "Favorite_listingId_idx" ON "Favorite"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_carId_key" ON "Favorite"("userId", "carId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_listingId_key" ON "Favorite"("userId", "listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Model_brandId_name_key" ON "Model"("brandId", "name");

-- CreateIndex
CREATE INDEX "BrowseEvent_visitorId_createdAt_idx" ON "BrowseEvent"("visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "BrowseEvent_userId_createdAt_idx" ON "BrowseEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CarView_carId_idx" ON "CarView"("carId");

-- CreateIndex
CREATE INDEX "CarView_carId_visitorHash_idx" ON "CarView"("carId", "visitorHash");

-- CreateIndex
CREATE INDEX "ScrapedListing_source_active_idx" ON "ScrapedListing"("source", "active");

-- CreateIndex
CREATE INDEX "ScrapedListing_brand_model_idx" ON "ScrapedListing"("brand", "model");

-- CreateIndex
CREATE INDEX "ScrapedListing_price_idx" ON "ScrapedListing"("price");

-- CreateIndex
CREATE INDEX "ScrapedListing_dedupeKey_idx" ON "ScrapedListing"("dedupeKey");

-- CreateIndex
CREATE INDEX "ScrapedListing_active_isDuplicate_idx" ON "ScrapedListing"("active", "isDuplicate");

-- CreateIndex
CREATE UNIQUE INDEX "ScrapedListing_source_externalId_key" ON "ScrapedListing"("source", "externalId");

-- CreateIndex
CREATE INDEX "FinanceLead_createdAt_idx" ON "FinanceLead"("createdAt");

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ScrapedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarView" ADD CONSTRAINT "CarView_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
