// import { Species } from './schema';
import type { ColumnRep, ColumnDef } from './columnModel';
/**
 * ColumnRep-based architecture for TransPlant
 *
 * This file defines the core ColumnRep interfaces that bind together:
 * 1. ColumnRep name/header
 * 2. ColumnRep type
 * 3. Data values
 * 4. Formatting information
 * 5. Validation rules
 * 6. UI state
 * 7. Database schema mapping
 *
 * REFACTORING ANNOTATIONS:
 * [NEW] - Part of the new ColumnRep architecture
 * [BRIDGE] - Temporary compatibility functions
 * [DELETE] - Legacy code that will be removed
 * [REPLACE: X] - Will be replaced by function X
 * [INTENTION: X] - Future implementation plans
 */

// Known table names in our system
export enum TableName {
	Planting = 'planting',
	Land = 'land',
	Crop = 'crop',
	Organization = 'organizations',
	Polygon = 'polygon',
	Species = 'species'
}

/**
 * ColumnRep interfaces
 */


// Cell validation state - tracks validation status for individual cells in a column
// [NEW] Core interface of the ColumnRep architecture
export interface CellValidationState {
	rowIndex: number; // Row index in the column
	isValid: boolean; // Whether the cell value is valid for the column type
	failedSelectDetection: boolean; // Whether type detection failed for this cell
	// Cell is greyed out if either failedSelectDetection is TRUE OR isToggled is FALSE (or both)
	isGreyedOut: boolean; // Whether the cell is greyed out (invalid and ignored)
	originalValue: any; // The original value before any processing
}

// Type coercion information
// [NEW] Core interface of the ColumnRep architecture
export interface selectTypeCoercion {
	isCoerced: boolean; // Whether the column type was manually changed by the user
	originalType: string; // The original detected type before coercion
	coercedTo: string; // The type it was coerced to
	timestamp: number; // When the coercion happened
}

// String column
// [NEW] Core interface of the ColumnRep architecture
export interface StringColumn extends ColumnDef {
	type: 'string';
	values: (string | null)[];
	validation?: {
		pattern?: string;
		minLength?: number;
		maxLength?: number;
	};
}


// Number column
// [NEW] Core interface of the ColumnRep architecture
// [INTENTION: Will solve numeric precision issues, especially for GPS coordinates]
export interface NumberColumn extends ColumnDef {
	type: 'number';
	values: (number | null)[];
	format?: {
		precision?: number;
		useThousandsSeparator?: boolean;
	};
	validation?: {
		min?: number;
		max?: number;
	};
	// For coordinate columns (latitude/longitude)
	coordinateType?: CoordinateType; // Whether this is a latitude or longitude column
	coordinatePrecision?: number; // Precision for coordinate values (typically 7)
}

// Date column
// [NEW] Core interface of the ColumnRep architecture
export interface DateColumn extends ColumnDef {
	type: 'date';
	values: (string | null)[]; // ISO format dates
	format?: {
		dateFormat?: string; // e.g., 'YYYY-MM-DD'
	};
}

// GPS coordinate type
export type GpsCoordinate = {
	latitude: number;
	longitude: number;
};

// Coordinate component type (for lat/lon columns)
export type CoordinateType = 'latitude' | 'longitude';

// GPS column merge configuration
// [NEW] Core interface of the ColumnRep architecture
export interface GpsMergeConfig {
	latitudeColumn: string; // Name of the column containing latitude values
	longitudeColumn: string; // Name of the column containing longitude values
	targetColumn: string; // Name of the merged GPS column to create
	format?: 'DMS' | 'DD'; // Format to use for the merged column
	precision?: number; // Precision to use for coordinates
}

// GPS selection strategy
export type GpsSelectionStrategy = 'priority' | 'first-available' | 'fallback-if-toggled-off';

// GPS source configuration
// [NEW] Core interface of the ColumnRep architecture
// [INTENTION: Will implement the GPS selection logic documented in gps_docs.md]
export interface GpsSourceConfig {
	sourceColumns: string[]; // Names of columns that can provide GPS data
	latLonPairs?: Array<{
		// Pairs of latitude/longitude columns
		latColumn: string; // Latitude column name
		lonColumn: string; // Longitude column name
		priority?: number; // Priority of this pair (lower is higher priority)
	}>;
	gpsColumns?: string[]; // Direct GPS columns to consider
	selectionStrategy: GpsSelectionStrategy; // How to select the GPS data
	targetColumn: string; // Name of the universal GPS column to create
	format?: 'DMS' | 'DD'; // Format to use for the output
	precision?: number; // Precision to use for coordinates
	fallbackToToggledOff?: boolean; // Whether to use toggled-off columns as fallback
}

// GPS column
// [NEW] Core interface of the ColumnRep architecture
// [INTENTION: Will solve GPS precision issues by storing coordinates as numbers with 7 decimal places]
export interface GpsColumn extends ColumnDef {
	type: 'gps';
	values: (GpsCoordinate | null)[];
	format?: {
		gpsFormat?: 'DMS' | 'DD';
		precision?: number;
	};
	// Additional properties for merged GPS columns
	mergeConfig?: GpsMergeConfig; // Configuration for merging lat/lon columns
	isMergeColumn?: boolean; // Whether this is a column that merges lat/lon values
	// For universal GPS column that selects the best GPS from multiple sources
	isUniversalGps?: boolean; // Whether this is the universal GPS column
	sourceConfig?: GpsSourceConfig; // Configuration for selecting the best GPS
	// For standalone GPS columns that need to parse DMS or DD
	parseFromString?: boolean; // Whether this column needs to parse GPS from string
	// Source tracking - which column/cell provided each GPS value
	sourceTracking?: Array<{
		// Tracks where each GPS value came from
		rowIndex: number; // Row index
		sourceColumn: string; // Source column name
		sourceType: 'lat-lon-pair' | 'gps-column' | 'fallback'; // Type of source
	}>;
}

// Map of column names to their types
export type ColumnTypeMap = {
	[key: string]: 'string' | 'number' | 'date' | 'gps';
};

// Interface for validated transform data using the ColumnRep approach
// [NEW] Core interface of the ColumnRep architecture
// [INTENTION: Will replace the legacy ValidatedTransformData interface]
export interface ColumnBasedTransformData {
	columns: ColumnRep[];
}
/**
 * Database schema interfaces
 */
// Single database column definition
export interface DbColumn {
	name: string; // ColumnRep name in the database
	table: string; // Table name in the database
	type: 'string' | 'number' | 'date' | 'gps' | 'boolean' | 'json' | 'array'; // Database column type
	isRequired: boolean; // Whether the column is required (NOT NULL)
	isPrimaryKey?: boolean; // Whether the column is a primary key
	isNaturalKey?: boolean; // Whether this is a natural key (human-readable unique identifier)
	naturalKeyFor?: string; // If natural key, the primary key it corresponds to (e.g., land_name → land_id)
	isForeignKey?: boolean; // Whether the column is a foreign key
	referencesTable?: string; // If foreign key, the referenced table
	referencesColumn?: string; // If foreign key, the referenced column
	defaultValue?: any; // Default value for the column
	isInsertPlanted?: boolean; // Whether this column is inserted into the planting table for user convenience
}

// Single table definition
export interface DbTable {
	name: string; // Table name
	columns: DbColumn[]; // Columns in the table
	displayName?: string; // Human-readable name for the table
	naturalKeys?: string[]; // List of column names that serve as natural keys for this table
	primaryKey?: string; // The primary key column name
}

// Complete database schema definition containing all tables
export interface DbSchema {
	tables: DbTable[]; // All tables in the schema (Planting, Land, Crop, etc.)
}

// Legacy interface for backward compatibility
// [DELETE] Will be removed once migration to ColumnRep architecture is complete
