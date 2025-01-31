import { pgTable, serial, text, integer, timestamp, boolean, numeric } from 'drizzle-orm/pg-core';

// Order matches Supabase: ['land_id', 'land_name', 'project_id', 'hectares', 'preparation_id', 'land_holder', 'polygon_id', 'gps_lat', 'gps_lon', 'notes', 'created_at', 'last_edited_at', 'edited_by', 'deleted']
export const land = pgTable('land', {
  land_id: serial('land_id').primaryKey(),
  land_name: text('land_name').notNull(),
  project_id: integer('project_id'),
  hectares: numeric('hectares'),
  preparation_id: integer('preparation_id'),
  land_holder: text('land_holder'),
  polygon_id: integer('polygon_id'),
  gps_lat: numeric('gps_lat'),
  gps_lon: numeric('gps_lon'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
  last_edited_at: timestamp('last_edited_at'),
  edited_by: text('edited_by'),
  deleted: boolean('deleted'),
});
// test 5
// Order matches Supabase UI: crop_id, crop_name, species_id, organization_id, project_id, seedlot, ...
export const crop = pgTable('crop', {
  crop_id: serial('crop_id').primaryKey(),
  crop_name: text('crop_name').notNull(),
  species_id: integer('species_id'),
  organization_id: integer('organization_id'),
  project_id: integer('project_id'),
  seedlot: text('seedlot'),
  seedzone: text('seedzone'),
  crop_stock: integer('crop_stock'),
  created_at: timestamp('created_at').defaultNow(),
  last_edited_at: timestamp('last_edited_at'),
  edited_by: text('edited_by'),
  deleted: boolean('deleted'),
});

// Types for TypeScript
export type Land = typeof land.$inferSelect;
export type NewLand = typeof land.$inferInsert;

export type Crop = typeof crop.$inferSelect;
export type NewCrop = typeof crop.$inferInsert;
