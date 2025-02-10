// 👍️🌲️ DATABASE SCHEMA
/**
 * Database Schema Definition
 * 
 * This file defines the database schema using Drizzle ORM.
 * It matches the Supabase structure exactly to ensure compatibility.
 * Each table includes timestamps, audit fields, and proper relationships.
 */

import { 
  pgTable, 
  serial, 
  text, 
  timestamp, 
  boolean, 
  numeric,
  json,
  integer
} from 'drizzle-orm/pg-core';

// 👍️🌲️ SHARED COLUMNS
// Shared columns for audit and tracking
const baseColumns = {
  created_at: timestamp('created_at').defaultNow(),
  last_edited_at: timestamp('last_edited_at'),
  edited_by: text('edited_by'),
  approval_status: text('approval_status').notNull().default('pending'),  // Can be: 'pending', 'approved', 'rejected'
  approved_at: timestamp('approved_at'),
  approved_by: text('approved_by'),
  deleted: boolean('deleted'),
  notes: text('notes')
};

// 👍️🌲️ TABLE DEFINITIONS

/**
 * Land Table
 * Represents a parcel of land where crops can be planted
 * Key relationships:
 * - preparation_id → PreparationTypes
 * - polygon_id → Polygons
 * - project_id → Projects
 */
export const land = pgTable('Land', {
  land_id: text('land_id').primaryKey(),
  land_name: text('land_name').notNull(),
  hectares: numeric('hectares'),
  land_holder: text('land_holder'),
  gps_lat: numeric('gps_lat'),
  gps_lon: numeric('gps_lon'),
  polygon_id: text('polygon_id').references(() => polygons.polygon_id),
  preparation_id: integer('preparation_id').references(() => preparationTypes.preparation_id),
  project_id: text('project_id').references(() => projects.project_id),
  ...baseColumns
});

/**
 * Crop Table
 * Defines plantable crops and their characteristics
 * Key relationships:
 * - species_id → Species
 * - organization_id → Organizations
 * - project_id → Projects
 */
export const crop = pgTable('Crop', {
  crop_id: text('crop_id').primaryKey(),
  crop_name: text('crop_name').notNull(),
  species_id: text('species_id').references(() => species.species_id),
  organization_id: text('organization_id').references(() => organizations.organization_id),
  project_id: text('project_id').references(() => projects.project_id),
  crop_stock: text('crop_stock'),
  seed_info: text('seed_info'),
  ...baseColumns
});

/**
 * Planting Table
 * Central table tracking what crops are planted where
 * Forms many-to-many relationship between Land and Crop
 */
export const planting = pgTable('Planting', {
  id: text('id').primaryKey(),
  land_id: text('land_id').references(() => land.land_id),
  crop_id: text('crop_id').references(() => crop.crop_id),
  planted: numeric('planted'),
  planting_date: timestamp('planting_date'),
  ...baseColumns
});

/**
 * Species Table
 * Scientific classification of crops
 * Referenced by Crop table
 */
export const species = pgTable('Species', {
  species_id: text('species_id').primaryKey(),
  scientific_name: text('scientific_name'),
  common_name: text('common_name'),
  family: text('family'),
  type: text('type'),
  reference: text('reference'),
  ...baseColumns
});

/**
 * Organizations Table
 * Tracks nurseries and other organizations involved
 * Can be linked to crops and referenced as stakeholders
 */
export const organizations = pgTable('Organizations', {
  organization_id: text('organization_id').primaryKey(),
  organization_name: text('organization_name'),
  contact_name: text('contact_name'),
  contact_email: text('contact_email'),
  contact_phone: text('contact_phone'),
  address: text('address'),
  website: text('website'),
  is_nursery: boolean('is_nursery'),
  gps_lat: numeric('gps_lat'),
  gps_lon: numeric('gps_lon'),
  ...baseColumns
});

/**
 * Polygons Table
 * Stores geographical data for land parcels
 * Linked to Land table
 */
export const polygons = pgTable('Polygons', {
  polygon_id: text('polygon_id').primaryKey(),
  land_id: text('land_id').references(() => land.land_id),
  geojson: json('geojson'),
  ...baseColumns
});

/**
 * PreparationTypes Table
 * Lookup table for land preparation methods
 */
export const preparationTypes = pgTable('PreparationTypes', {
  preparation_id: serial('preparation_id').primaryKey(),
  ...baseColumns
});

/**
 * Projects Table
 * Groups related plantings and tracks project metadata
 */
export const projects = pgTable('Projects', {
  project_id: text('project_id').primaryKey(),
  project_name: text('project_name'),
  ...baseColumns
});
