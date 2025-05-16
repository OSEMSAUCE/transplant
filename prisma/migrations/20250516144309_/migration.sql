/*
  Warnings:

  - A unique constraint covering the columns `[projectName]` on the table `Projects` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "unique_project_name" ON "Projects"("projectName");
