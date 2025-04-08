/**
 * Database Schema Definition
 *
 * This file defines the database schema using Drizzle ORM.
 * It matches the Supabase structure exactly to ensure compatibility.
 * Each table includes timestamps, audit fields, and proper relationships.
 */

import { type DbColumnsDef } from './dbTypes';
import { type PgTable } from 'drizzle-orm/pg-core';

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
// Shared columns for audit and tracking - temporarily disabled
const dbColumnsDef = {
	// Empty object to prevent 500 errors while these fields are being planned
	// Original fields commented out for reference
	/*
	created_at: timestamp('created_at').defaultNow(),
	last_edited_at: timestamp('last_edited_at'),
	edited_by: text('edited_by'),
	approval_status: text('approval_status').notNull().default('pending'),
	approved_at: timestamp('approved_at'),
	approved_by: text('approved_by'),
	deleted: boolean('deleted')
	*/
};

// 👍️🌲️ TABLE DEFINITIONS

/**
 * Planting Table
 * Central table tracking what crops are planted where
 * Forms many-to-many relationship between Land and Crop
 */
export const planting = pgTable('planting', {
	id: text('id').primaryKey(),
	land_id: text('land_id').references(() => land.land_id),
	crop_id: text('crop_id').references(() => crop.crop_id),
	planted: numeric('planted'),
	planting_date: timestamp('planting_date'),
	notes: text('notes'), // Keeping original notes field for planting table
	...dbColumnsDef
});

/**
 * Land Table
 * Represents a parcel of land where crops can be planted
 * Key relationships:
 * - preparation_id → PreparationTypes
 * - polygon_id → Polygons
 * - project_id → Projects
 */
export const land: PgTable = pgTable('Land', {
	land_id: text('land_id').primaryKey(),
	land_name: text('land_name').notNull(),
	hectares: numeric('hectares'),
	land_holder: text('land_holder'),
	gps_lat: numeric('gps_lat'),
	gps_lon: numeric('gps_lon'),
	polygon_id: text('polygon_id').references(() => polygons.polygon_id),
	preparation_id: integer('preparation_id').references(() => preparationTypes.preparation_id),
	project_id: text('project_id').references(() => projects.project_id),
	land_notes: text('land_notes'), // Renamed from notes to land_notes
	...dbColumnsDef
});

/**
 * Crop Table
 * Defines plantable crops and their characteristics
 * Key relationships:
 * - species_id → Species
 * - organization_id → Organizations
 * - project_id → Projects
 */

export const crop = pgTable('crop', {
	crop_id: text('crop_id').primaryKey(),
	crop_name: text('crop_name').notNull(),
	species_id: text('species_id').references(() => species.species_id),
	organization_id: text('organization_id').references(() => organizations.organization_id),
	project_id: text('project_id').references(() => projects.project_id),
	crop_stock: integer('crop_stock'),
	seedlot: text('seedlot'),
	seedzone: text('seedzone'),
	crop_notes: text('crop_notes'), // Renamed from notes to crop_notes
	...dbColumnsDef
});

/**
 * Species Table
 * Scientific classification of crops
 * Referenced by Crop table
 */
export const species = pgTable('species', {
	species_id: text('species_id').primaryKey(),
	scientific_name: text('scientific_name'),
	common_name: text('common_name'),
	family: text('family'),
	type: text('type'),
	reference: text('reference'),
	notes: text('notes'), // Keeping original notes field for species table
	...dbColumnsDef
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
	notes: text('notes'), // Keeping original notes field for organizations table
	...dbColumnsDef
});

/**
 * Polygons Table
 * Stores geographical data for land parcels
 * Linked to Land table
 */
export const polygons: PgTable = pgTable('Polygons', {
	polygon_id: text('polygon_id').primaryKey(),
	land_id: text('land_id').references(() => land.land_id),
	geojson: json('geojson'),
	poly_notes: text('poly_notes'), // Renamed from notes to poly_notes
	...dbColumnsDef
});

/**
 * PreparationTypes Table
 * Lookup table for land preparation methods
 */
export const preparationTypes = pgTable('PreparationTypes', {
	preparation_id: serial('preparation_id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	notes: text('notes'), // Keeping original notes field for preparationTypes table
	...dbColumnsDef
});

/**
 * Projects Table
 * Groups related plantings and tracks project metadata
 */
export const projects = pgTable('Projects', {
	project_id: text('project_id').primaryKey(),
	project_name: text('project_name'),
	project_notes: text('project_notes'), // Renamed from notes to project_notes
	...dbColumnsDef
});

export const user = pgTable('user', {
	id: serial('id').primaryKey(),
	age: integer('age')
});
