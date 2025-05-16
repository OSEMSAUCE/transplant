/*
  Warnings:

  - A unique constraint covering the columns `[landId,cropId,plantingDate]` on the table `Planting` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "planting_land_crop_unique";

-- CreateIndex
CREATE UNIQUE INDEX "unique_land_crop_planting_date" ON "Planting"("landId", "cropId", "plantingDate");
