/*
  Warnings:

  - Made the column `stakeholderTypeId` on table `StakeholderTypes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "StakeholderTypes" ALTER COLUMN "stakeholderTypeId" SET NOT NULL,
ADD CONSTRAINT "StakeholderTypes_pkey" PRIMARY KEY ("stakeholderTypeId");

-- CreateTable
CREATE TABLE "Stakeholders" (
    "stakeholderId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "stakeholderTypeId" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "organizationName" TEXT,
    "stakeholderTypeName" TEXT,
    "projectName" TEXT,

    CONSTRAINT "Stakeholders_pkey" PRIMARY KEY ("stakeholderId")
);

-- CreateIndex
CREATE INDEX "idx_organizationid" ON "Stakeholders"("organizationId");

-- CreateIndex
CREATE INDEX "idx_projectid" ON "Stakeholders"("projectId");

-- CreateIndex
CREATE INDEX "idx_stakeholdertypeid" ON "Stakeholders"("stakeholderTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_org_type_project" ON "Stakeholders"("organizationId", "stakeholderTypeId", "projectId");

-- AddForeignKey
ALTER TABLE "Stakeholders" ADD CONSTRAINT "Stakeholders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organizations"("organizationId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Stakeholders" ADD CONSTRAINT "Stakeholders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("projectId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Stakeholders" ADD CONSTRAINT "Stakeholders_stakeholderTypeId_fkey" FOREIGN KEY ("stakeholderTypeId") REFERENCES "StakeholderTypes"("stakeholderTypeId") ON DELETE CASCADE ON UPDATE NO ACTION;
