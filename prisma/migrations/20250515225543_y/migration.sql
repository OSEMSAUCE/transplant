/*
  Warnings:

  - The primary key for the `StakeholderTypes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `StakeholderTypes` table. All the data in the column will be lost.
  - You are about to drop the column `last_edited_at` on the `StakeholderTypes` table. All the data in the column will be lost.
  - The primary key for the `csvobj` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `csvobj` table. All the data in the column will be lost.
  - You are about to drop the column `csvobj_id` on the `csvobj` table. All the data in the column will be lost.
  - You are about to drop the column `json_data` on the `csvobj` table. All the data in the column will be lost.
  - The primary key for the `metadata` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `metadata` table. All the data in the column will be lost.
  - You are about to drop the column `csv_key` on the `metadata` table. All the data in the column will be lost.
  - You are about to drop the column `csvobj_id` on the `metadata` table. All the data in the column will be lost.
  - You are about to drop the column `db_key` on the `metadata` table. All the data in the column will be lost.
  - You are about to drop the column `metadata_id` on the `metadata` table. All the data in the column will be lost.
  - Added the required column `jsonData` to the `csvobj` table without a default value. This is not possible if the table is not empty.
  - Added the required column `csvKey` to the `metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `csvobjId` to the `metadata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dbKey` to the `metadata` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Crop" DROP CONSTRAINT "Crop_csvobjId_fkey";

-- DropForeignKey
ALTER TABLE "Land" DROP CONSTRAINT "Land_csvobjId_fkey";

-- DropForeignKey
ALTER TABLE "Projects" DROP CONSTRAINT "Projects_csvobjId_fkey";

-- DropForeignKey
ALTER TABLE "metadata" DROP CONSTRAINT "metadata_csvobj_id_fkey";

-- AlterTable
ALTER TABLE "StakeholderTypes" DROP CONSTRAINT "StakeholderTypes_pkey",
DROP COLUMN "created_at",
DROP COLUMN "last_edited_at",
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastEditedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "stakeholderTypeId" TEXT;

-- AlterTable
ALTER TABLE "csvobj" DROP CONSTRAINT "csvobj_pkey",
DROP COLUMN "created_at",
DROP COLUMN "csvobj_id",
DROP COLUMN "json_data",
ADD COLUMN     "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "csvobjId" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "jsonData" JSONB NOT NULL,
ADD CONSTRAINT "csvobj_pkey" PRIMARY KEY ("csvobjId");

-- AlterTable
ALTER TABLE "metadata" DROP CONSTRAINT "metadata_pkey",
DROP COLUMN "created_at",
DROP COLUMN "csv_key",
DROP COLUMN "csvobj_id",
DROP COLUMN "db_key",
DROP COLUMN "metadata_id",
ADD COLUMN     "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "csvKey" TEXT NOT NULL,
ADD COLUMN     "csvobjId" UUID NOT NULL,
ADD COLUMN     "dbKey" TEXT NOT NULL,
ADD COLUMN     "metadataId" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "metadata_pkey" PRIMARY KEY ("metadataId");

-- AddForeignKey
ALTER TABLE "Projects" ADD CONSTRAINT "Projects_csvobjId_fkey" FOREIGN KEY ("csvobjId") REFERENCES "csvobj"("csvobjId") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Land" ADD CONSTRAINT "Land_csvobjId_fkey" FOREIGN KEY ("csvobjId") REFERENCES "csvobj"("csvobjId") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Crop" ADD CONSTRAINT "Crop_csvobjId_fkey" FOREIGN KEY ("csvobjId") REFERENCES "csvobj"("csvobjId") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_csvobjId_fkey" FOREIGN KEY ("csvobjId") REFERENCES "csvobj"("csvobjId") ON DELETE CASCADE ON UPDATE NO ACTION;
