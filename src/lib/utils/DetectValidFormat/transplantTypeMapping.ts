/**
 * Type Mapping Utility
 *
 * Maps between Transform data types and database schema types
 * Ensures consistency between the two systems by deriving types directly from the database schema
 */



// Transform data types
export type TransformDataType = 'string' | 'number' | 'date' | 'gps' | 'latitude' | 'longitude';

// Database schema types
export type DatabaseFieldType = 'string' | 'numeric' | 'timestamp' | 'integer' | 'boolean' | 'json';

// Table names type
export type TableName = 'Land' | 'Crop' | 'Planting';

// Validation specifications for each type
export interface TypeValidationSpec {
	type: TransformDataType;
	dbType: DatabaseFieldType;
	validation: {
		required?: boolean;
		min?: number;
		max?: number;
		decimals?: number;
		format?: string;
		regex?: RegExp;
	};
	description: string;
}

// Type validation specifications
export const typeValidationSpecs: Record<TransformDataType, TypeValidationSpec> = {
	string: {
		type: 'string',
		dbType: 'string',
		validation: {},
		description: 'Text value with no specific format requirements'
	},
	number: {
		type: 'number',
		dbType: 'numeric',
		validation: {
			decimals: 2 // Default precision
		},
		description: 'Numeric value with optional decimal places'
	},
	date: {
		type: 'date',
		dbType: 'timestamp',
		validation: {
			format: 'YYYY-MM-DD',
			regex: /^\d{4}-\d{2}-\d{2}$/
		},
		description: 'Date in ISO format (YYYY-MM-DD)'
	},
	gps: {
		type: 'gps',
		dbType: 'string', // Stored as text in format "lat,lon"
		validation: {},
		description: 'GPS coordinates in decimal degrees (latitude, longitude)'
	},
	latitude: {
		type: 'latitude',
		dbType: 'numeric',
		validation: {
			min: -90,
			max: 90,
			decimals: 7
		},
		description: 'Latitude coordinate (-90 to 90 degrees)'
	},
	longitude: {
		type: 'longitude',
		dbType: 'numeric',
		validation: {
			min: -180,
			max: 180,
			decimals: 7
		},
		description: 'Longitude coordinate (-180 to 180 degrees)'
	}
};


// Map Drizzle column types to TransformDataType
function mapDbColumnTypeToTransformType(columnType: string): TransformDataType {
	switch (columnType) {
		case 'text':
			return 'string';
		case 'numeric':
			return 'number';
		case 'integer':
			return 'number';
		case 'timestamp':
			return 'date';
		case 'boolean':
			return 'string'; // We'll represent booleans as strings in the UI
		case 'json':
			return 'string'; // JSON will be represented as strings
		default:
			return 'string';
	}
}

// Special case handling for GPS coordinates
function isGpsField(columnName: string): boolean {
	return columnName === 'gps_lat' || columnName === 'gps_lon';
}

// Get the specific GPS type based on column name
function getGpsType(columnName: string): TransformDataType {
	if (columnName === 'gps_lat') return 'latitude';
	if (columnName === 'gps_lon') return 'longitude';
	return 'string';
}

// Get column type from schema definition
export function getColumnTypeFromSchema(
	tableName: TableName,
	columnName: string
): TransformDataType {
	const table = schemaTableMap[tableName];
	if (!table) return 'string';

	// Access the column definition
	const columnDef = table[columnName];
	if (!columnDef) return 'string';

	// Special handling for GPS fields
	if (isGpsField(columnName)) {
		return getGpsType(columnName);
	}

	// Get the column type from the Drizzle definition
	const columnType = columnDef.dataType?.toLowerCase();
	return mapDbColumnTypeToTransformType(columnType);
}

// Check if a column is required based on schema
export function isColumnRequired(tableName: TableName, columnName: string): boolean {
	const table = schemaTableMap[tableName];
	if (!table) return false;

	const columnDef = table[columnName];
	if (!columnDef) return false;

	// In Drizzle, notNull() indicates a required field
	return columnDef.notNull === true;
}

// Get all columns for a table from schema
export function getTableColumns(tableName: TableName): string[] {
	const table = schemaTableMap[tableName];
	if (!table) return [];

	// Extract column names from the table definition
	return Object.keys(table).filter(
		(key) =>
			// Filter out methods and properties that aren't column definitions
			typeof table[key] === 'object' && table[key] !== null && !key.startsWith('_')
	);
}

// Map Transform type to Database type
export function mapToDatabaseType(transformType: TransformDataType): DatabaseFieldType {
	return typeValidationSpecs[transformType]?.dbType || 'string';
}

// Get validation spec for a type
export function getValidationSpec(type: TransformDataType): TypeValidationSpec {
	return typeValidationSpecs[type] || typeValidationSpecs['string'];
}

// Format display name for a type
export function formatTypeDisplayName(type: TransformDataType): string {
	if (!type) return 'String';
	return type.charAt(0).toUpperCase() + type.slice(1);
}

// Get type description
export function getTypeDescription(type: TransformDataType): string {
	return typeValidationSpecs[type]?.description || 'Unknown type';
}
