import { pgTable, foreignKey, pgPolicy, uuid, text, timestamp, boolean, type AnyPgColumn, index, numeric, bigint, jsonb, unique, integer, date, doublePrecision, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const preparation = pgEnum("Preparation", ['raw', 'mechanical', 'chemical', 'burned', 'grass seed', 'landscaped'])


export const projects = pgTable("Projects", {
	projectId: uuid("project_id").primaryKey().notNull(),
	projectName: text("project_name"),
	projectNotes: text("project_notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastEditedAt: timestamp("last_edited_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	editedBy: uuid("edited_by"),
	deleted: boolean().default(false),
	csvobjId: uuid("csvobj_id"),
}, (table) => [
	foreignKey({
			columns: [table.csvobjId],
			foreignColumns: [csvobj.csvobjId],
			name: "fk_projects_csvobj"
		}).onDelete("set null"),
	pgPolicy("select_policy", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const land: any = pgTable("Land", {
	landId: uuid("land_id").primaryKey().notNull(),
	landName: text("land_name"),
	projectId: uuid("project_id"),
	hectares: numeric(),
	landHolder: text("land_holder"),
	polygonId: uuid("polygon_id"),
	gpsLat: numeric("gps_lat"),
	gpsLon: numeric("gps_lon"),
	landNotes: text("land_notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastEditedAt: timestamp("last_edited_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	editedBy: uuid("edited_by"),
	deleted: boolean().default(false),
	preparation: preparation(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	preparationId: bigint("preparation_id", { mode: "number" }),
	csvobjId: uuid("csvobj_id"),
}, (table) => [
	index("idx_land_project_id").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.polygonId],
			foreignColumns: [polygons.polygonId],
			name: "Land_polygon_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.projectId],
			name: "Land_project_id_fkey"
		}),
	foreignKey({
			columns: [table.csvobjId],
			foreignColumns: [csvobj.csvobjId],
			name: "fk_land_csvobj"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.preparationId],
			foreignColumns: [preparationTypes.preparationId],
			name: "fk_preparation"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.projectId],
			name: "land_project_id_fkey"
		}),
	pgPolicy("select_policy", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const stakeholders = pgTable("Stakeholders", {
	stakeholderId: uuid("stakeholder_id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	projectId: uuid("project_id"),
	organizationId: uuid("organization_id"),
	stakeholderTypeId: uuid("stakeholder_type_id"),
	contributionAmount: numeric("contribution_amount"),
	stakeNotes: text("stake_notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastEditedAt: timestamp("last_edited_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deleted: boolean().default(false),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.organizationId],
			name: "Stakeholders_organization_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.projectId],
			name: "Stakeholders_project_id_fkey"
		}),
	foreignKey({
			columns: [table.stakeholderTypeId],
			foreignColumns: [stakeholderTypes.stakeholderTypeId],
			name: "Stakeholders_stakeholder_type_id_fkey"
		}),
	pgPolicy("select_policy", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const stakeholderTypes = pgTable("StakeholderTypes", {
	stakeholderTypeId: uuid("stakeholder_type_id").primaryKey().notNull(),
	stakeholderTypeName: text("stakeholder_type_name"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastEditedAt: timestamp("last_edited_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deleted: boolean().default(false),
}, (table) => [
	pgPolicy("select_policy", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const polygons = pgTable("Polygons", {
	polygonId: uuid("polygon_id").primaryKey().notNull(),
	geojson: jsonb(),
	polyNotes: text("poly_notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastEditedAt: timestamp("last_edited_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deleted: boolean().default(false),
	landId: uuid("land_id"),
	csvobjId: uuid("csvobj_id"),
}, (table) => [
	index("idx_polygons_land_id").using("btree", table.landId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.csvobjId],
			foreignColumns: [csvobj.csvobjId],
			name: "fk_polygons_csvobj"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.landId],
			foreignColumns: [land.landId],
			name: "polygons_land_id_fkey"
		}),
	pgPolicy("select_policy", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const planting = pgTable("Planting", {
	plantingId: uuid("planting_id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	landId: uuid("land_id"),
	planted: integer(),
	plantingDate: date("planting_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastEditedAt: timestamp("last_edited_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deleted: boolean().default(false),
	cropId: uuid("crop_id"),
	plantingNotes: text("planting_notes"),
}, (table) => [
	index("idx_planting_crop_id").using("btree", table.cropId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.landId],
			foreignColumns: [land.landId],
			name: "Planting_land_id_fkey"
		}),
	foreignKey({
			columns: [table.cropId],
			foreignColumns: [crop.cropId],
			name: "fk_planting_crop"
		}),
	foreignKey({
			columns: [table.landId],
			foreignColumns: [land.landId],
			name: "fk_planting_land"
		}),
	foreignKey({
			columns: [table.cropId],
			foreignColumns: [crop.cropId],
			name: "planting_crop_id_fkey"
		}),
	unique("planting_land_crop_unique").on(table.landId, table.cropId),
	pgPolicy("Allow all selects", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const crop = pgTable("Crop", {
	cropId: uuid("crop_id").primaryKey().notNull(),
	cropName: text("crop_name"),
	speciesId: uuid("species_id"),
	seedInfo: text("seed_info"),
	cropStock: text("crop_stock"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastEditedAt: timestamp("last_edited_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	editedBy: uuid("edited_by"),
	deleted: boolean().default(false),
	projectId: uuid("project_id"),
	organizationId: uuid("organization_id"),
	cropNotes: text("crop_notes"),
	csvobjId: uuid("csvobj_id"),
}, (table) => [
	index("idx_crop_organization_id").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_crop_project_id").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.speciesId],
			foreignColumns: [species.speciesId],
			name: "Trees_species_id_fkey"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.organizationId],
			name: "crop_organization_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.projectId],
			name: "crop_project_id_fkey"
		}),
	foreignKey({
			columns: [table.csvobjId],
			foreignColumns: [csvobj.csvobjId],
			name: "fk_crop_csvobj"
		}).onDelete("set null"),
	pgPolicy("Allow all selects", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const organizations = pgTable("Organizations", {
	organizationId: uuid("organization_id").primaryKey().notNull(),
	organizationName: text("organization_name"),
	contactName: text("contact_name"),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	address: text(),
	website: text(),
	organizationNotes: text("organization_notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastEditedAt: timestamp("last_edited_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	editedBy: uuid("edited_by"),
	deleted: boolean().default(false),
	isNursery: boolean("is_nursery").default(false),
	gpsLat: doublePrecision("gps_lat"),
	gpsLon: doublePrecision("gps_lon"),
}, (table) => [
	pgPolicy("select_policy", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const preparationTypes = pgTable("PreparationTypes", {
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastEditedAt: timestamp("last_edited_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deleted: boolean().default(false),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	preparationId: bigint("preparation_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "PreparationTypes_preparation_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807 }),
}, (table) => [
	pgPolicy("select_policy", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const species = pgTable("Species", {
	speciesId: uuid("species_id").primaryKey().notNull(),
	commonName: text("common_name"),
	scientificName: text("scientific_name"),
	type: text(),
	family: text(),
	reference: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastEditedAt: timestamp("last_edited_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	editedBy: uuid("edited_by"),
	deleted: boolean().default(false),
}, (table) => [
	pgPolicy("select_policy", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const csvobj = pgTable("csvobj", {
	csvobjId: uuid("csvobj_id").defaultRandom().primaryKey().notNull(),
	jsonData: jsonb("json_data").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const metadata = pgTable("metadata", {
	metadataId: uuid("metadata_id").defaultRandom().primaryKey().notNull(),
	csvobjId: uuid("csvobj_id").notNull(),
	csvKey: text("csv_key").notNull(),
	dbKey: text("db_key").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.csvobjId],
			foreignColumns: [csvobj.csvobjId],
			name: "metadata_csvobj_id_fkey"
		}).onDelete("cascade"),
]);
