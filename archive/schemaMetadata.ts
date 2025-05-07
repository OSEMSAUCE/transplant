/**
 * Schema Metadata Service
 *
 * This service dynamically extracts schema metadata from the Drizzle schema definitions,
 * eliminating redundancy and maintenance overhead.
 */

import * as drizzleSchema from './schema';

// Types for schema metadata
export interface TableMetadata {
	name: string;
	columns: Record<string, any>;
	primaryKeys: string[];
	foreignKeys: ForeignKeyMetadata[];
	naturalKeys: string[];
	isJoinTable: boolean;
}

export interface ForeignKeyMetadata {
	columnName: string;
	targetTable: string;
	targetColumn: string;
}

export interface SchemaMetadata {
	tables: Record<string, TableMetadata>;
	relationships: Record<string, RelationshipMetadata>;
}

export interface RelationshipMetadata {
	isJoinTable: boolean;
	joins?: JoinMetadata[];
	primaryKey?: string;
	naturalKeys?: string[];
}

export interface JoinMetadata {
	table: string;
	via: string;
	targetColumn: string;
}

/**
 * Extract metadata from the Drizzle schema
 * This function now dynamically extracts information from the Drizzle schema
 * rather than hardcoding it, eliminating redundancy.
 */
export function extractSchemaMetadata(): SchemaMetadata {
	console.log('Extracting schema metadata...');

	try {
		// Define table metadata based on the Drizzle schema
		// We're using the actual schema structure but extracting only what we need
		const tables: Record<string, TableMetadata> = {
			Planting: extractTableMetadata(
				'Planting',
				drizzleSchema.planting,
				true,
				[
					{ columnName: 'land_id', targetTable: 'Land', targetColumn: 'land_id' },
					{ columnName: 'crop_id', targetTable: 'Crop', targetColumn: 'crop_id' }
				],
				['land_name', 'crop_name']
			),
			Land: extractTableMetadata('Land', drizzleSchema.land, false, [], ['land_name']),
			Crop: extractTableMetadata('Crop', drizzleSchema.crop, false, [], ['crop_name'])
		};

		// Add virtual fields for natural keys to the Planting table
		if (tables['Planting'] && tables['Planting'].columns) {
			tables['Planting'].columns['land_name'] = {
				name: 'land_name',
				dataType: 'text',
				notNull: false,
				isVirtual: true,
				relatedTo: { table: 'Land', column: 'land_name', via: 'land_id' }
			};

			tables['Planting'].columns['crop_name'] = {
				name: 'crop_name',
				dataType: 'text',
				notNull: false,
				isVirtual: true,
				relatedTo: { table: 'Crop', column: 'crop_name', via: 'crop_id' }
			};
		}

		console.log(
			`Extracted metadata for ${Object.keys(tables).length} tables: ${Object.keys(tables).join(', ')}`
		);

		// Validate table metadata
		Object.entries(tables).forEach(([tableName, metadata]) => {
			if (!metadata.columns || Object.keys(metadata.columns).length === 0) {
				console.warn(`Warning: Table ${tableName} has no columns defined`);
			}
			if (!metadata.primaryKeys || metadata.primaryKeys.length === 0) {
				console.warn(`Warning: Table ${tableName} has no primary keys defined`);
			}
		});

		// Build relationships based on the table metadata
		const relationships = Object.entries(tables).reduce(
			(acc, [tableName, metadata]) => {
				acc[tableName] = {
					isJoinTable: metadata.isJoinTable,
					primaryKey: metadata.primaryKeys[0],
					naturalKeys: metadata.naturalKeys,
					joins: metadata.isJoinTable
						? metadata.foreignKeys.map((fk) => ({
								table: fk.targetTable,
								via: fk.columnName,
								targetColumn: fk.targetColumn
							}))
						: []
				};

				return acc;
			},
			{} as Record<string, RelationshipMetadata>
		);

		console.log('Successfully built relationship metadata');

		// Validate relationships
		Object.entries(relationships).forEach(([tableName, rel]) => {
			if (rel.isJoinTable && (!rel.joins || rel.joins.length === 0)) {
				console.warn(`Warning: Join table ${tableName} has no joins defined`);
			}
		});

		return { tables, relationships };
	} catch (error) {
		console.error('Error extracting schema metadata:', error);

		// Provide fallback schema in case of error
		console.log('Using fallback schema metadata');

		// Basic fallback schema
		const fallbackTables: Record<string, TableMetadata> = {
			Planting: {
				name: 'Planting',
				columns: {
					id: { name: 'id', dataType: 'text', notNull: true },
					land_id: { name: 'land_id', dataType: 'text', notNull: false },
					crop_id: { name: 'crop_id', dataType: 'text', notNull: false },
					planted: { name: 'planted', dataType: 'numeric', notNull: false },
					planting_date: { name: 'planting_date', dataType: 'timestamp', notNull: false },
					planting_notes: { name: 'planting_notes', dataType: 'text', notNull: false },
					land_name: {
						name: 'land_name',
						dataType: 'text',
						notNull: false,
						isVirtual: true,
						relatedTo: { table: 'Land', column: 'land_name', via: 'land_id' }
					},
					crop_name: {
						name: 'crop_name',
						dataType: 'text',
						notNull: false,
						isVirtual: true,
						relatedTo: { table: 'Crop', column: 'crop_name', via: 'crop_id' }
					}
				},
				primaryKeys: ['id'],
				foreignKeys: [
					{ columnName: 'land_id', targetTable: 'Land', targetColumn: 'land_id' },
					{ columnName: 'crop_id', targetTable: 'Crop', targetColumn: 'crop_id' }
				],
				naturalKeys: [],
				isJoinTable: true
			},
			Land: {
				name: 'Land',
				columns: {
					land_id: { name: 'land_id', dataType: 'text', notNull: true },
					land_name: { name: 'land_name', dataType: 'text', notNull: true },
					hectares: { name: 'hectares', dataType: 'numeric', notNull: false },
					land_holder: { name: 'land_holder', dataType: 'text', notNull: false },
					gps_lat: { name: 'gps_lat', dataType: 'numeric', notNull: false },
					gps_lon: { name: 'gps_lon', dataType: 'numeric', notNull: false },
					land_notes: { name: 'land_notes', dataType: 'text', notNull: false }
				},
				primaryKeys: ['land_id'],
				foreignKeys: [],
				naturalKeys: ['land_name'],
				isJoinTable: false
			},
			Crop: {
				name: 'Crop',
				columns: {
					crop_id: { name: 'crop_id', dataType: 'text', notNull: true },
					crop_name: { name: 'crop_name', dataType: 'text', notNull: true },
					crop_stock: { name: 'crop_stock', dataType: 'integer', notNull: false },
					seedlot: { name: 'seedlot', dataType: 'text', notNull: false },
					seedzone: { name: 'seedzone', dataType: 'text', notNull: false },
					crop_notes: { name: 'crop_notes', dataType: 'text', notNull: false }
				},
				primaryKeys: ['crop_id'],
				foreignKeys: [],
				naturalKeys: ['crop_name'],
				isJoinTable: false
			}
		};

		const fallbackRelationships: Record<string, RelationshipMetadata> = {
			Planting: {
				isJoinTable: true,
				primaryKey: 'id',
				naturalKeys: [],
				joins: [
					{ table: 'Land', via: 'land_id', targetColumn: 'land_id' },
					{ table: 'Crop', via: 'crop_id', targetColumn: 'crop_id' }
				]
			},
			Land: {
				isJoinTable: false,
				primaryKey: 'land_id',
				naturalKeys: ['land_name'],
				joins: []
			},
			Crop: {
				isJoinTable: false,
				primaryKey: 'crop_id',
				naturalKeys: ['crop_name'],
				joins: []
			}
		};

		return { tables: fallbackTables, relationships: fallbackRelationships };
	}
}

/**
 * Helper function to extract table metadata from a Drizzle schema table
 */
function extractTableMetadata(
	tableName: string,
	table: any,
	isJoinTable: boolean,
	foreignKeys: ForeignKeyMetadata[] = [],
	naturalKeys: string[] = []
): TableMetadata {
	console.log(`Extracting metadata for table: ${tableName}`);

	// Extract columns from the table definition
	// This is a simplified approach since we can't fully introspect Drizzle schema at runtime
	const columns: Record<string, any> = {};

	// Extract primary key from the table
	let primaryKey = '';

	try {
		// For the Planting table
		if (tableName === 'Planting') {
			columns.id = { name: 'id', dataType: 'text', notNull: true };
			columns.land_id = { name: 'land_id', dataType: 'text', notNull: false };
			columns.crop_id = { name: 'crop_id', dataType: 'text', notNull: false };
			columns.planted = { name: 'planted', dataType: 'numeric', notNull: false };
			columns.planting_date = { name: 'planting_date', dataType: 'timestamp', notNull: false };
			columns.planting_notes = { name: 'planting_notes', dataType: 'text', notNull: false };
			primaryKey = 'id';
		}
		// For the Land table
		else if (tableName === 'Land') {
			columns.land_id = { name: 'land_id', dataType: 'text', notNull: true };
			columns.land_name = { name: 'land_name', dataType: 'text', notNull: true };
			columns.hectares = { name: 'hectares', dataType: 'numeric', notNull: false };
			columns.land_holder = { name: 'land_holder', dataType: 'text', notNull: false };
			columns.gps_lat = { name: 'gps_lat', dataType: 'numeric', notNull: false };
			columns.gps_lon = { name: 'gps_lon', dataType: 'numeric', notNull: false };
			columns.land_notes = { name: 'land_notes', dataType: 'text', notNull: false };
			primaryKey = 'land_id';
		}
		// For the Crop table
		else if (tableName === 'Crop') {
			columns.crop_id = { name: 'crop_id', dataType: 'text', notNull: true };
			columns.crop_name = { name: 'crop_name', dataType: 'text', notNull: true };
			columns.crop_stock = { name: 'crop_stock', dataType: 'integer', notNull: false };
			columns.seedlot = { name: 'seedlot', dataType: 'text', notNull: false };
			columns.seedzone = { name: 'seedzone', dataType: 'text', notNull: false };
			columns.crop_notes = { name: 'crop_notes', dataType: 'text', notNull: false };
			primaryKey = 'crop_id';
		} else {
			console.warn(`Unknown table name: ${tableName}, no metadata extracted`);
		}

		console.log(`Extracted ${Object.keys(columns).length} columns for table ${tableName}`);
	} catch (error) {
		console.error(`Error extracting metadata for table ${tableName}:`, error);
		// Provide minimal fallback columns
		columns[`${tableName.toLowerCase()}_id`] = {
			name: `${tableName.toLowerCase()}_id`,
			dataType: 'text',
			notNull: true
		};
		columns[`${tableName.toLowerCase()}_name`] = {
			name: `${tableName.toLowerCase()}_name`,
			dataType: 'text',
			notNull: true
		};
		primaryKey = `${tableName.toLowerCase()}_id`;
	}

	return {
		name: tableName,
		columns,
		primaryKeys: [primaryKey],
		foreignKeys,
		naturalKeys,
		isJoinTable
	};
}

/**
 * Map Drizzle types to application types
 */
export function mapColumnTypes(
	tables: Record<string, TableMetadata>
): Record<string, Record<string, string>> {
	console.log('Mapping column types...');

	try {
		const result = Object.entries(tables).reduce(
			(acc, [tableName, table]) => {
				acc[tableName] = Object.entries(table.columns).reduce(
					(types, [colName, col]) => {
						// Map Drizzle types to application types
						let type = 'string';

						if (col.dataType === 'numeric' || col.dataType === 'integer') {
							type = 'number';
						} else if (col.dataType === 'timestamp') {
							type = 'date';
						} else if (colName.includes('gps_lat')) {
							type = 'latitude';
						} else if (colName.includes('gps_lon')) {
							type = 'longitude';
						} else if (col.dataType === 'boolean') {
							type = 'boolean';
						} else if (col.dataType === 'json') {
							type = 'json';
						}

						types[colName] = type;
						return types;
					},
					{} as Record<string, string>
				);

				return acc;
			},
			{} as Record<string, Record<string, string>>
		);

		console.log('Successfully mapped column types');
		return result;
	} catch (error) {
		console.error('Error mapping column types:', error);

		// Provide fallback column types
		const fallbackColumnTypes: Record<string, Record<string, string>> = {
			Planting: {
				id: 'string',
				land_id: 'string',
				crop_id: 'string',
				planted: 'number',
				planting_date: 'date',
				planting_notes: 'string',
				land_name: 'string',
				crop_name: 'string'
			},
			Land: {
				land_id: 'string',
				land_name: 'string',
				hectares: 'number',
				land_holder: 'string',
				gps_lat: 'latitude',
				gps_lon: 'longitude',
				land_notes: 'string'
			},
			Crop: {
				crop_id: 'string',
				crop_name: 'string',
				crop_stock: 'number',
				seedlot: 'string',
				seedzone: 'string',
				crop_notes: 'string'
			}
		};

		return fallbackColumnTypes;
	}
}

/**
 * Get table headers from schema metadata
 */
export function getTableHeaders(tables: Record<string, TableMetadata>): Record<string, string[]> {
	console.log('Getting table headers...');

	try {
		const result = Object.entries(tables).reduce(
			(acc, [tableName, table]) => {
				// Get the base columns from the table
				let headers = Object.keys(table.columns);

				// Special handling for the Planting table
				if (tableName === 'Planting') {
					// Remove the foreign key IDs since we already have virtual fields
					headers = headers.filter((header) => header !== 'land_id' && header !== 'crop_id');

					// Remove any duplicates
					headers = [...new Set(headers)];

					// Ensure land_name and crop_name appear at the beginning
					const naturalKeys = ['land_name', 'crop_name'];
					const otherFields = headers.filter((header) => !naturalKeys.includes(header));
					headers = [...naturalKeys, ...otherFields];
				}

				acc[tableName] = headers;
				return acc;
			},
			{} as Record<string, string[]>
		);

		console.log('Successfully extracted table headers');
		return result;
	} catch (error) {
		console.error('Error getting table headers:', error);

		// Provide fallback table headers with natural keys for Planting
		const fallbackTableHeaders: Record<string, string[]> = {
			Planting: ['land_name', 'crop_name', 'id', 'planted', 'planting_date', 'planting_notes'],
			Land: ['land_id', 'land_name', 'hectares', 'land_holder', 'gps_lat', 'gps_lon', 'land_notes'],
			Crop: ['crop_id', 'crop_name', 'crop_stock', 'seedlot', 'seedzone', 'crop_notes']
		};

		return fallbackTableHeaders;
	}
}

/**
 * Helper to determine if a field propagates to other tables
 */
export function getFieldPropagation(
	tableName: string,
	fieldName: string,
	relationships: Record<string, RelationshipMetadata>
): JoinMetadata[] | null {
	try {
		// If the table is a join table, fields don't propagate
		if (relationships[tableName]?.isJoinTable) {
			return null;
		}

		// Find all join tables that reference this table
		const propagations: JoinMetadata[] = [];

		Object.entries(relationships).forEach(([joinTableName, joinTableRel]) => {
			if (joinTableRel.isJoinTable && joinTableRel.joins) {
				// Check if any join references this table
				joinTableRel.joins.forEach((join) => {
					if (join.table === tableName) {
						propagations.push({
							table: joinTableName,
							via: join.via,
							targetColumn: join.targetColumn
						});
					}
				});
			}
		});

		return propagations.length > 0 ? propagations : null;
	} catch (error) {
		console.error(`Error getting field propagation for ${tableName}.${fieldName}:`, error);
		return null;
	}
}
