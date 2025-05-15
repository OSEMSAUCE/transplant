/*
  Warnings:

  - You are about to drop the column `edited_by` on the `Crop` table. All the data in the column will be lost.
  - You are about to drop the column `last_edited_at` on the `Crop` table. All the data in the column will be lost.
  - You are about to drop the column `preparationId` on the `Land` table. All the data in the column will be lost.
  - You are about to drop the column `contact_phone` on the `Organizations` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Organizations` table. All the data in the column will be lost.
  - You are about to drop the column `edited_by` on the `Organizations` table. All the data in the column will be lost.
  - You are about to drop the column `is_nursery` on the `Organizations` table. All the data in the column will be lost.
  - You are about to drop the column `last_edited_at` on the `Organizations` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Projects` table. All the data in the column will be lost.
  - You are about to drop the column `edited_by` on the `Projects` table. All the data in the column will be lost.
  - You are about to drop the column `last_edited_at` on the `Projects` table. All the data in the column will be lost.
  - The primary key for the `Species` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `common_name` on the `Species` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Species` table. All the data in the column will be lost.
  - You are about to drop the column `edited_by` on the `Species` table. All the data in the column will be lost.
  - You are about to drop the column `last_edited_at` on the `Species` table. All the data in the column will be lost.
  - You are about to drop the column `scientific_name` on the `Species` table. All the data in the column will be lost.
  - You are about to drop the column `species_id` on the `Species` table. All the data in the column will be lost.
  - The primary key for the `StakeholderTypes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `stakeholder_type_id` on the `StakeholderTypes` table. All the data in the column will be lost.
  - You are about to drop the column `stakeholder_type_name` on the `StakeholderTypes` table. All the data in the column will be lost.
  - You are about to drop the `PreparationTypes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Stakeholders` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[commonName]` on the table `Species` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `commonName` to the `Species` table without a default value. This is not possible if the table is not empty.
  - Added the required column `speciesId` to the `Species` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stakeholderType` to the `StakeholderTypes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Crop" DROP CONSTRAINT "Crop_speciesId_fkey";

-- DropForeignKey
ALTER TABLE "Land" DROP CONSTRAINT "Land_preparationId_fkey";

-- DropForeignKey
ALTER TABLE "Stakeholders" DROP CONSTRAINT "Stakeholders_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "Stakeholders" DROP CONSTRAINT "Stakeholders_project_id_fkey";

-- DropForeignKey
ALTER TABLE "Stakeholders" DROP CONSTRAINT "Stakeholders_stakeholder_type_id_fkey";

-- DropIndex
DROP INDEX "unique_common_name";

-- AlterTable
ALTER TABLE "Crop" DROP COLUMN "edited_by",
DROP COLUMN "last_edited_at",
ADD COLUMN     "editedBy" UUID,
ADD COLUMN     "lastEditedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Land" DROP COLUMN "preparationId";

-- AlterTable
ALTER TABLE "Organizations" DROP COLUMN "contact_phone",
DROP COLUMN "created_at",
DROP COLUMN "edited_by",
DROP COLUMN "is_nursery",
DROP COLUMN "last_edited_at",
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "editedBy" UUID,
ADD COLUMN     "lastEditedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Projects" DROP COLUMN "created_at",
DROP COLUMN "edited_by",
DROP COLUMN "last_edited_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "editedBy" UUID,
ADD COLUMN     "lastEditedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Species" DROP CONSTRAINT "Species_pkey",
DROP COLUMN "common_name",
DROP COLUMN "created_at",
DROP COLUMN "edited_by",
DROP COLUMN "last_edited_at",
DROP COLUMN "scientific_name",
DROP COLUMN "species_id",
ADD COLUMN     "commonName" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "editedBy" UUID,
ADD COLUMN     "lastEditedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "scientificName" TEXT,
ADD COLUMN     "speciesId" UUID NOT NULL,
ADD CONSTRAINT "Species_pkey" PRIMARY KEY ("speciesId");

-- AlterTable
ALTER TABLE "StakeholderTypes" DROP CONSTRAINT "StakeholderTypes_pkey",
DROP COLUMN "stakeholder_type_id",
DROP COLUMN "stakeholder_type_name",
ADD COLUMN     "stakeholderType" TEXT NOT NULL,
ADD CONSTRAINT "StakeholderTypes_pkey" PRIMARY KEY ("stakeholderType");

-- DropTable
DROP TABLE "PreparationTypes";

-- DropTable
DROP TABLE "Stakeholders";

-- CreateIndex
CREATE UNIQUE INDEX "unique_common_name" ON "Species"("commonName");

-- AddForeignKey
ALTER TABLE "Crop" ADD CONSTRAINT "Crop_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("speciesId") ON DELETE NO ACTION ON UPDATE NO ACTION;
