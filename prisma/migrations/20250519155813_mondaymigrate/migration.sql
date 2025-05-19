-- DropIndex
DROP INDEX "unique_crop_name";

-- DropIndex
DROP INDEX "unique_land_name";

-- RenameIndex
ALTER INDEX "unique_land_name_per_project" RENAME TO "unique_land_name_per_project_constraint";
