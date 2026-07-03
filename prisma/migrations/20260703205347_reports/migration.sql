-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "carId" TEXT,
    "listingId" TEXT,
    "vehicleTitle" TEXT,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "reporterId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
