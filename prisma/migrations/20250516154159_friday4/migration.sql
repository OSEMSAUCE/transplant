/*
  Warnings:

  - A unique constraint covering the columns `[landId,cropId]` on the table `Planting` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "unique_land_crop" ON "Planting"("landId", "cropId");
