import { db } from '$lib/server/db';
import { land, planting, crop } from '$lib/server/db/schema';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';

export async function load() {
	const landsDbTable = await db.select().from(land).limit(1);
	const plantingDbTable = await db.select().from(planting).limit(1);
	const cropDbTable = await db.select().from(crop).limit(1);
	// console.log(land.gpsLat.columnType);
	const landDbFormat = dbFormatSelector(land);
	const plantingDbFormat = dbFormatSelector(planting);
	const cropDbFormat = dbFormatSelector(crop);
	console.log('dbFormat', landDbFormat);
	return {
		landsDbTable,
		plantingDbTable,
		cropDbTable,
		landDbFormat,
		plantingDbFormat,
		cropDbFormat
	};
}

interface ColumnDescription {
	columnType:
		| 'PgNumeric'
		| 'PgDateString'
		| 'PgUUID'
		| 'PgText'
		| 'PgTimestampString'
		| 'PgBoolean'
		| 'PgEnumColumn'
		| 'PgBigInt53'
		| 'PgInteger';
	dataType: 'number' | 'string' | 'boolean' | 'date' | 'gps';
	// Add other properties if they exist
}

// 🌲️🌲️🌲️🌲️🌲️🌲️🌲️🌲️ Selector Types for db table 🌲️🌲️🌲️🌲️
function dbFormatSelector(table: PgTableWithColumns<any>) {
	let columnFormats: Record<string, string> = {};
	for (const [columnName, column] of Object.entries(table)) {
		if (column && typeof column === 'object' && 'columnType' in column) {
			const columnDescription = column as ColumnDescription;
			let format = 'string';
			if (columnDescription.dataType === 'number') {
				format = 'number';
			} else if (
				columnDescription.columnType === 'PgNumeric' ||
				columnDescription.columnType === 'PgInteger'
			) {
				format = 'number';
			} else if (columnDescription.columnType === 'PgDateString') {
				format = 'date';
			} else if (columnDescription.columnType === 'PgUUID') {
				format = 'string';
			} else if (columnDescription.columnType === 'PgText') {
				format = 'string';
			} else if (columnDescription.columnType === 'PgTimestampString') {
				format = 'date';
			} else if (columnDescription.columnType === 'PgBoolean') {
				format = 'string';
			} else if (columnDescription.columnType === 'PgEnumColumn') {
				format = 'string';
			} else if (columnDescription.columnType === 'PgBigInt53') {
				format = 'number';
			}
			columnFormats[columnName] = format;
		}
	}
	return columnFormats;
}
