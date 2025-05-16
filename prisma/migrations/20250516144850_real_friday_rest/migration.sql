/*
  Warnings:

  - Made the column `projectName` on table `Projects` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Projects" ALTER COLUMN "projectName" SET NOT NULL;
