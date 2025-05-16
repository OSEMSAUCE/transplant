-- AlterTable
ALTER TABLE "Projects" ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "Nursery" (
    "nurseryId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gpsLat" DOUBLE PRECISION NOT NULL,
    "gpsLon" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER NOT NULL,
    "nurseryNotes" TEXT,
    "tradeName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "lastEditedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nursery_pkey" PRIMARY KEY ("nurseryId")
);
