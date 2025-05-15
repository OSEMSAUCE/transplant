/*
  Warnings:

  - You are about to drop the column `polygonId` on the `Land` table. All the data in the column will be lost.
  - You are about to drop the `Polygons` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Land" DROP CONSTRAINT "Land_polygonId_fkey";

-- DropForeignKey
ALTER TABLE "Polygons" DROP CONSTRAINT "Polygons_landId_fkey";

-- DropForeignKey
ALTER TABLE "Polygons" DROP CONSTRAINT "fk_polygons_csvobj";

-- AlterTable
ALTER TABLE "Land" DROP COLUMN "polygonId",
ADD COLUMN     "polygon" JSONB;

-- DropTable
DROP TABLE "Polygons";
