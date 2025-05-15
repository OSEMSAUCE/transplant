-- CreateEnum
CREATE TYPE "Preparation" AS ENUM ('raw', 'mechanical', 'chemical', 'burned', 'grass seed', 'landscaped');

-- CreateTable
CREATE TABLE "Projects" (
    "projectId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectName" TEXT,
    "projectNotes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_edited_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "edited_by" UUID,
    "deleted" BOOLEAN DEFAULT false,
    "csvobjId" UUID,

    CONSTRAINT "Projects_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "Land" (
    "landId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landName" TEXT NOT NULL,
    "projectId" UUID,
    "hectares" DECIMAL,
    "landHolder" TEXT,
    "polygonId" UUID,
    "gpsLat" DECIMAL,
    "gpsLon" DECIMAL,
    "landNotes" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "lastEditedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "editedBy" UUID,
    "deleted" BOOLEAN DEFAULT false,
    "preparation" "Preparation",
    "preparationId" BIGINT,
    "csvobjId" UUID,

    CONSTRAINT "Land_pkey" PRIMARY KEY ("landId")
);

-- CreateTable
CREATE TABLE "Crop" (
    "cropId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cropName" TEXT NOT NULL,
    "speciesId" UUID,
    "seedInfo" TEXT,
    "cropStock" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_edited_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "edited_by" UUID,
    "deleted" BOOLEAN DEFAULT false,
    "projectId" UUID,
    "organizationId" UUID,
    "cropNotes" TEXT,
    "csvobjId" UUID,

    CONSTRAINT "Trees_pkey" PRIMARY KEY ("cropId")
);

-- CreateTable
CREATE TABLE "Planting" (
    "plantingId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landId" UUID,
    "planted" INTEGER,
    "plantingDate" DATE,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "lastEditedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN DEFAULT false,
    "cropId" UUID,
    "plantingNotes" TEXT,

    CONSTRAINT "Planting_pkey" PRIMARY KEY ("plantingId")
);

-- CreateTable
CREATE TABLE "Polygons" (
    "polygonId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "geojson" JSONB,
    "polyNotes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_edited_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN DEFAULT false,
    "landId" UUID,
    "csvobj_id" UUID,

    CONSTRAINT "Polygons_pkey" PRIMARY KEY ("polygonId")
);

-- CreateTable
CREATE TABLE "Organizations" (
    "organizationId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contact_phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "organizationNotes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_edited_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "edited_by" UUID,
    "deleted" BOOLEAN DEFAULT false,
    "is_nursery" BOOLEAN DEFAULT false,
    "gpsLat" DOUBLE PRECISION,
    "gpsLon" DOUBLE PRECISION,

    CONSTRAINT "Organizations_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "Species" (
    "species_id" UUID NOT NULL,
    "common_name" TEXT NOT NULL,
    "scientific_name" TEXT,
    "type" TEXT,
    "family" TEXT,
    "reference" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_edited_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "edited_by" UUID,
    "deleted" BOOLEAN DEFAULT false,

    CONSTRAINT "Species_pkey" PRIMARY KEY ("species_id")
);

-- CreateTable
CREATE TABLE "PreparationTypes" (
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_edited_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN DEFAULT false,
    "preparation_id" BIGSERIAL NOT NULL,

    CONSTRAINT "PreparationTypes_pkey" PRIMARY KEY ("preparation_id")
);

-- CreateTable
CREATE TABLE "Stakeholders" (
    "stakeholder_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID,
    "organization_id" UUID,
    "stakeholder_type_id" UUID,
    "contribution_amount" DECIMAL,
    "stake_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_edited_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN DEFAULT false,

    CONSTRAINT "Stakeholders_pkey" PRIMARY KEY ("stakeholder_id")
);

-- CreateTable
CREATE TABLE "StakeholderTypes" (
    "stakeholder_type_id" UUID NOT NULL,
    "stakeholder_type_name" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_edited_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN DEFAULT false,

    CONSTRAINT "StakeholderTypes_pkey" PRIMARY KEY ("stakeholder_type_id")
);

-- CreateTable
CREATE TABLE "csvobj" (
    "csvobj_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "json_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "csvobj_pkey" PRIMARY KEY ("csvobj_id")
);

-- CreateTable
CREATE TABLE "metadata" (
    "metadata_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "csvobj_id" UUID NOT NULL,
    "csv_key" TEXT NOT NULL,
    "db_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metadata_pkey" PRIMARY KEY ("metadata_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_land_name" ON "Land"("landName");

-- CreateIndex
CREATE INDEX "idx_land_project_id" ON "Land"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_land_name_per_project" ON "Land"("projectId", "landName");

-- CreateIndex
CREATE UNIQUE INDEX "unique_crop_name" ON "Crop"("cropName");

-- CreateIndex
CREATE INDEX "idx_crop_organization_id" ON "Crop"("organizationId");

-- CreateIndex
CREATE INDEX "idx_crop_project_id" ON "Crop"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_crop_name_per_project" ON "Crop"("projectId", "cropName");

-- CreateIndex
CREATE INDEX "idx_planting_crop_id" ON "Planting"("cropId");

-- CreateIndex
CREATE UNIQUE INDEX "planting_land_crop_unique" ON "Planting"("landId", "cropId");

-- CreateIndex
CREATE INDEX "idx_polygons_land_id" ON "Polygons"("landId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_organization_name" ON "Organizations"("organizationName");

-- CreateIndex
CREATE UNIQUE INDEX "unique_common_name" ON "Species"("common_name");

-- AddForeignKey
ALTER TABLE "Projects" ADD CONSTRAINT "Projects_csvobjId_fkey" FOREIGN KEY ("csvobjId") REFERENCES "csvobj"("csvobj_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Land" ADD CONSTRAINT "Land_csvobjId_fkey" FOREIGN KEY ("csvobjId") REFERENCES "csvobj"("csvobj_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Land" ADD CONSTRAINT "Land_polygonId_fkey" FOREIGN KEY ("polygonId") REFERENCES "Polygons"("polygonId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Land" ADD CONSTRAINT "Land_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "PreparationTypes"("preparation_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Land" ADD CONSTRAINT "Land_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("projectId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Crop" ADD CONSTRAINT "Crop_csvobjId_fkey" FOREIGN KEY ("csvobjId") REFERENCES "csvobj"("csvobj_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Crop" ADD CONSTRAINT "Crop_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organizations"("organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Crop" ADD CONSTRAINT "Crop_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("projectId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Crop" ADD CONSTRAINT "Crop_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("species_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Planting" ADD CONSTRAINT "Planting_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("cropId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Planting" ADD CONSTRAINT "Planting_landId_fkey" FOREIGN KEY ("landId") REFERENCES "Land"("landId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Polygons" ADD CONSTRAINT "Polygons_landId_fkey" FOREIGN KEY ("landId") REFERENCES "Land"("landId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Polygons" ADD CONSTRAINT "fk_polygons_csvobj" FOREIGN KEY ("csvobj_id") REFERENCES "csvobj"("csvobj_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Stakeholders" ADD CONSTRAINT "Stakeholders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organizations"("organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Stakeholders" ADD CONSTRAINT "Stakeholders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Projects"("projectId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Stakeholders" ADD CONSTRAINT "Stakeholders_stakeholder_type_id_fkey" FOREIGN KEY ("stakeholder_type_id") REFERENCES "StakeholderTypes"("stakeholder_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_csvobj_id_fkey" FOREIGN KEY ("csvobj_id") REFERENCES "csvobj"("csvobj_id") ON DELETE CASCADE ON UPDATE NO ACTION;
