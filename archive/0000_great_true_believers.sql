-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."Preparation" AS ENUM('raw', 'mechanical', 'chemical', 'burned', 'grass seed', 'landscaped');--> statement-breakpoint
CREATE TABLE "Projects" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"project_name" text,
	"project_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_edited_at" timestamp with time zone DEFAULT now(),
	"edited_by" uuid,
	"deleted" boolean DEFAULT false,
	"csvobj_id" uuid
);
--> statement-breakpoint
ALTER TABLE "Projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Land" (
	"land_id" uuid PRIMARY KEY NOT NULL,
	"land_name" text,
	"project_id" uuid,
	"hectares" numeric,
	"land_holder" text,
	"polygon_id" uuid,
	"gps_lat" numeric,
	"gps_lon" numeric,
	"land_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_edited_at" timestamp with time zone DEFAULT now(),
	"edited_by" uuid,
	"deleted" boolean DEFAULT false,
	"preparation" "Preparation",
	"preparation_id" bigint,
	"csvobj_id" uuid
);
--> statement-breakpoint
ALTER TABLE "Land" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Stakeholders" (
	"stakeholder_id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"project_id" uuid,
	"organization_id" uuid,
	"stakeholder_type_id" uuid,
	"contribution_amount" numeric,
	"stake_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_edited_at" timestamp with time zone DEFAULT now(),
	"deleted" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "Stakeholders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "StakeholderTypes" (
	"stakeholder_type_id" uuid PRIMARY KEY NOT NULL,
	"stakeholder_type_name" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_edited_at" timestamp with time zone DEFAULT now(),
	"deleted" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "StakeholderTypes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Polygons" (
	"polygon_id" uuid PRIMARY KEY NOT NULL,
	"geojson" jsonb,
	"poly_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_edited_at" timestamp with time zone DEFAULT now(),
	"deleted" boolean DEFAULT false,
	"land_id" uuid,
	"csvobj_id" uuid
);
--> statement-breakpoint
ALTER TABLE "Polygons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Planting" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"land_id" uuid,
	"planted" integer,
	"planting_date" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_edited_at" timestamp with time zone DEFAULT now(),
	"deleted" boolean DEFAULT false,
	"crop_id" uuid,
	"planting_notes" text
);
--> statement-breakpoint
ALTER TABLE "Planting" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Crop" (
	"crop_id" uuid PRIMARY KEY NOT NULL,
	"crop_name" text,
	"species_id" uuid,
	"seed_info" text,
	"crop_stock" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_edited_at" timestamp with time zone DEFAULT now(),
	"edited_by" uuid,
	"deleted" boolean DEFAULT false,
	"project_id" uuid,
	"organization_id" uuid,
	"crop_notes" text,
	"csvobj_id" uuid
);
--> statement-breakpoint
ALTER TABLE "Crop" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Organizations" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"organization_name" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"website" text,
	"organization_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_edited_at" timestamp with time zone DEFAULT now(),
	"edited_by" uuid,
	"deleted" boolean DEFAULT false,
	"is_nursery" boolean DEFAULT false,
	"gps_lat" double precision,
	"gps_lon" double precision
);
--> statement-breakpoint
ALTER TABLE "Organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "PreparationTypes" (
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_edited_at" timestamp with time zone DEFAULT now(),
	"deleted" boolean DEFAULT false,
	"preparation_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name ""PreparationTypes_preparation_id_seq"" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1)
);
--> statement-breakpoint
ALTER TABLE "PreparationTypes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Species" (
	"species_id" uuid PRIMARY KEY NOT NULL,
	"common_name" text,
	"scientific_name" text,
	"type" text,
	"family" text,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_edited_at" timestamp with time zone DEFAULT now(),
	"edited_by" uuid,
	"deleted" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "Species" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "csvobj" (
	"csvobj_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"json_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "csvobj" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "metadata" (
	"metadata_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"csvobj_id" uuid NOT NULL,
	"csv_key" text NOT NULL,
	"db_key" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "metadata" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "Projects" ADD CONSTRAINT "fk_projects_csvobj" FOREIGN KEY ("csvobj_id") REFERENCES "public"."csvobj"("csvobj_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Land" ADD CONSTRAINT "Land_polygon_id_fkey" FOREIGN KEY ("polygon_id") REFERENCES "public"."Polygons"("polygon_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Land" ADD CONSTRAINT "Land_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."Projects"("project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Land" ADD CONSTRAINT "fk_land_csvobj" FOREIGN KEY ("csvobj_id") REFERENCES "public"."csvobj"("csvobj_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Land" ADD CONSTRAINT "fk_preparation" FOREIGN KEY ("preparation_id") REFERENCES "public"."PreparationTypes"("preparation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Land" ADD CONSTRAINT "land_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."Projects"("project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Stakeholders" ADD CONSTRAINT "Stakeholders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."Organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Stakeholders" ADD CONSTRAINT "Stakeholders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."Projects"("project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Stakeholders" ADD CONSTRAINT "Stakeholders_stakeholder_type_id_fkey" FOREIGN KEY ("stakeholder_type_id") REFERENCES "public"."StakeholderTypes"("stakeholder_type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Polygons" ADD CONSTRAINT "fk_polygons_csvobj" FOREIGN KEY ("csvobj_id") REFERENCES "public"."csvobj"("csvobj_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Polygons" ADD CONSTRAINT "polygons_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "public"."Land"("land_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Planting" ADD CONSTRAINT "Planting_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "public"."Land"("land_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Planting" ADD CONSTRAINT "planting_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "public"."Crop"("crop_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Crop" ADD CONSTRAINT "Trees_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "public"."Species"("species_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Crop" ADD CONSTRAINT "crop_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."Organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Crop" ADD CONSTRAINT "crop_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."Projects"("project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Crop" ADD CONSTRAINT "fk_crop_csvobj" FOREIGN KEY ("csvobj_id") REFERENCES "public"."csvobj"("csvobj_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_csvobj_id_fkey" FOREIGN KEY ("csvobj_id") REFERENCES "public"."csvobj"("csvobj_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_land_project_id" ON "Land" USING btree ("project_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_polygons_land_id" ON "Polygons" USING btree ("land_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_planting_crop_id" ON "Planting" USING btree ("crop_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_crop_organization_id" ON "Crop" USING btree ("organization_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_crop_project_id" ON "Crop" USING btree ("project_id" uuid_ops);--> statement-breakpoint
CREATE POLICY "select_policy" ON "Projects" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "select_policy" ON "Land" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "select_policy" ON "Stakeholders" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "select_policy" ON "StakeholderTypes" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "select_policy" ON "Polygons" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Allow all selects" ON "Planting" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Allow all selects" ON "Crop" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "select_policy" ON "Organizations" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "select_policy" ON "PreparationTypes" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "select_policy" ON "Species" AS PERMISSIVE FOR SELECT TO public USING (true);
*/