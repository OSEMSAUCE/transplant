import { relations } from "drizzle-orm/relations";
import { csvobj, projects, polygons, land, preparationTypes, organizations, stakeholders, stakeholderTypes, planting, crop, species, metadata } from "./schema";

export const projectsRelations = relations(projects, ({one, many}) => ({
	csvobj: one(csvobj, {
		fields: [projects.csvobjId],
		references: [csvobj.csvobjId]
	}),
	lands_projectId: many(land, {
		relationName: "land_projectId_projects_projectId"
	}),
	lands_projectId: many(land, {
		relationName: "land_projectId_projects_projectId"
	}),
	stakeholders: many(stakeholders),
	crops: many(crop),
}));

export const csvobjRelations = relations(csvobj, ({many}) => ({
	projects: many(projects),
	lands: many(land),
	polygons: many(polygons),
	crops: many(crop),
	metadata: many(metadata),
}));

export const landRelations = relations(land, ({one, many}) => ({
	polygon: one(polygons, {
		fields: [land.polygonId],
		references: [polygons.polygonId],
		relationName: "land_polygonId_polygons_polygonId"
	}),
	project_projectId: one(projects, {
		fields: [land.projectId],
		references: [projects.projectId],
		relationName: "land_projectId_projects_projectId"
	}),
	csvobj: one(csvobj, {
		fields: [land.csvobjId],
		references: [csvobj.csvobjId]
	}),
	preparationType: one(preparationTypes, {
		fields: [land.preparationId],
		references: [preparationTypes.preparationId]
	}),
	project_projectId: one(projects, {
		fields: [land.projectId],
		references: [projects.projectId],
		relationName: "land_projectId_projects_projectId"
	}),
	polygons: many(polygons, {
		relationName: "polygons_landId_land_landId"
	}),
	plantings_landId: many(planting, {
		relationName: "planting_landId_land_landId"
	}),
	plantings_landId: many(planting, {
		relationName: "planting_landId_land_landId"
	}),
}));

export const polygonsRelations = relations(polygons, ({one, many}) => ({
	lands: many(land, {
		relationName: "land_polygonId_polygons_polygonId"
	}),
	csvobj: one(csvobj, {
		fields: [polygons.csvobjId],
		references: [csvobj.csvobjId]
	}),
	land: one(land, {
		fields: [polygons.landId],
		references: [land.landId],
		relationName: "polygons_landId_land_landId"
	}),
}));

export const preparationTypesRelations = relations(preparationTypes, ({many}) => ({
	lands: many(land),
}));

export const stakeholdersRelations = relations(stakeholders, ({one}) => ({
	organization: one(organizations, {
		fields: [stakeholders.organizationId],
		references: [organizations.organizationId]
	}),
	project: one(projects, {
		fields: [stakeholders.projectId],
		references: [projects.projectId]
	}),
	stakeholderType: one(stakeholderTypes, {
		fields: [stakeholders.stakeholderTypeId],
		references: [stakeholderTypes.stakeholderTypeId]
	}),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	stakeholders: many(stakeholders),
	crops: many(crop),
}));

export const stakeholderTypesRelations = relations(stakeholderTypes, ({many}) => ({
	stakeholders: many(stakeholders),
}));

export const plantingRelations = relations(planting, ({one}) => ({
	land_landId: one(land, {
		fields: [planting.landId],
		references: [land.landId],
		relationName: "planting_landId_land_landId"
	}),
	crop_cropId: one(crop, {
		fields: [planting.cropId],
		references: [crop.cropId],
		relationName: "planting_cropId_crop_cropId"
	}),
	land_landId: one(land, {
		fields: [planting.landId],
		references: [land.landId],
		relationName: "planting_landId_land_landId"
	}),
	crop_cropId: one(crop, {
		fields: [planting.cropId],
		references: [crop.cropId],
		relationName: "planting_cropId_crop_cropId"
	}),
}));

export const cropRelations = relations(crop, ({one, many}) => ({
	plantings_cropId: many(planting, {
		relationName: "planting_cropId_crop_cropId"
	}),
	plantings_cropId: many(planting, {
		relationName: "planting_cropId_crop_cropId"
	}),
	species: one(species, {
		fields: [crop.speciesId],
		references: [species.speciesId]
	}),
	organization: one(organizations, {
		fields: [crop.organizationId],
		references: [organizations.organizationId]
	}),
	project: one(projects, {
		fields: [crop.projectId],
		references: [projects.projectId]
	}),
	csvobj: one(csvobj, {
		fields: [crop.csvobjId],
		references: [csvobj.csvobjId]
	}),
}));

export const speciesRelations = relations(species, ({many}) => ({
	crops: many(crop),
}));

export const metadataRelations = relations(metadata, ({one}) => ({
	csvobj: one(csvobj, {
		fields: [metadata.csvobjId],
		references: [csvobj.csvobjId]
	}),
}));