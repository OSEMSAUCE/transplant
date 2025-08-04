import { z } from 'zod';
import type { ColumnFormat } from '$lib/types/columnModel';

// ============================================
// ZOD SCHEMAS FOR CSV VALIDATION & CLEANING
// ============================================

// GPS coordinate schema with auto-fixing
const gpsSchema = z
	.string()
	.transform((val) => {
		if (!val || val.trim() === '') return null;

		// Extract numbers from GPS string (handles various formats)
		const numberMatches = val.match(/-?\d+\.?\d*/g);
		if (numberMatches && numberMatches.length >= 2) {
			const lat = parseFloat(numberMatches[0]);
			const lon = parseFloat(numberMatches[1]);

			if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
				return `${lat.toFixed(7)}, ${lon.toFixed(7)}`;
			}
		}
		return null;
	})
	.nullable();

// Latitude schema with validation and cleaning
const latitudeSchema = z
	.union([z.string(), z.number()])
	.transform((val) => {
		if (val === null || val === undefined || val === '') return null;

		const num = typeof val === 'string' ? parseFloat(val) : val;
		if (isNaN(num)) return null;

		// Clamp latitude to valid range
		const clampedLat = Math.max(-90, Math.min(90, num));
		return clampedLat;
	})
	.nullable();

// Longitude schema with validation and cleaning
const longitudeSchema = z
	.union([z.string(), z.number()])
	.transform((val) => {
		if (val === null || val === undefined || val === '') return null;

		const num = typeof val === 'string' ? parseFloat(val) : val;
		if (isNaN(num)) return null;

		// Clamp longitude to valid range
		const clampedLon = Math.max(-180, Math.min(180, num));
		return clampedLon;
	})
	.nullable();

// Number schema with cleaning (removes commas, handles scientific notation)
const numberSchema = z
	.union([z.string(), z.number()])
	.transform((val) => {
		if (val === null || val === undefined || val === '') return null;

		if (typeof val === 'number') return val;

		// Clean string: remove commas, spaces
		const cleaned = val.replace(/[,\s]/g, '');
		const num = parseFloat(cleaned);

		return isNaN(num) ? null : num;
	})
	.nullable();

// Date schema with multiple format support
const dateSchema = z
	.union([z.string(), z.date()])
	.transform((val) => {
		if (val === null || val === undefined || val === '') return null;

		if (val instanceof Date) return val.toISOString().split('T')[0];

		// Try to parse various date formats
		const dateStr = val.toString().trim();

		// Try standard formats first
		const standardDate = new Date(dateStr);
		if (!isNaN(standardDate.getTime())) {
			return standardDate.toISOString().split('T')[0];
		}

		// Try DD/MM/YYYY format
		const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
		if (ddmmyyyy) {
			const [, day, month, year] = ddmmyyyy;
			const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
			if (!isNaN(date.getTime())) {
				return date.toISOString().split('T')[0];
			}
		}

		return null;
	})
	.nullable();

// String schema with trimming
const stringSchema = z.string().transform((val) => {
	if (val === null || val === undefined) return '';
	return val.toString().trim();
});

// Polygon schema (basic validation)
const polygonSchema = z
	.string()
	.transform((val) => {
		if (!val || val.trim() === '') return null;

		// Basic polygon validation - should contain multiple coordinate pairs
		const numberMatches = val.match(/-?\d+\.?\d*/g);
		if (numberMatches && numberMatches.length >= 6) {
			// At least 3 coordinate pairs
			return val.trim();
		}

		return null;
	})
	.nullable();

// KML schema (basic validation)
const kmlSchema = z
	.string()
	.transform((val) => {
		if (!val || val.trim() === '') return null;

		// Check for KML coordinates tag
		if (val.includes('<coordinates>')) {
			return val.trim();
		}

		return null;
	})
	.nullable();

// ============================================
// DYNAMIC SCHEMA BUILDER
// ============================================

/**
 * Creates a Zod schema based on detected column format
 */
export function createColumnSchema(format: ColumnFormat) {
	switch (format) {
		case 'gps':
			return gpsSchema;
		case 'latitude':
			return latitudeSchema;
		case 'longitude':
			return longitudeSchema;
		case 'number':
			return numberSchema;
		case 'date':
			return dateSchema;
		case 'polygon':
			return polygonSchema;
		case 'kml':
			return kmlSchema;
		case 'string':
		default:
			return stringSchema;
	}
}

/**
 * Creates a complete row schema based on column formats
 */
export function createRowSchema(columnFormats: Record<string, ColumnFormat>) {
	const schemaShape: Record<string, any> = {};

	for (const [columnName, format] of Object.entries(columnFormats)) {
		schemaShape[columnName] = createColumnSchema(format);
	}

	return z.object(schemaShape);
}

// ============================================
// VALIDATION RESULT TYPES
// ============================================

export interface ValidationResult {
	isValid: boolean;
	data: any;
	errors: string[];
	warnings: string[];
	fixedFields: string[];
}

/**
 * Validates and cleans a single CSV row
 */
export function validateRow(
	row: Record<string, any>,
	columnFormats: Record<string, ColumnFormat>
): ValidationResult {
	const schema = createRowSchema(columnFormats);
	const result = schema.safeParse(row);

	const validationResult: ValidationResult = {
		isValid: result.success,
		data: result.success ? result.data : row,
		errors: [],
		warnings: [],
		fixedFields: []
	};

	if (!result.success) {
		validationResult.errors = result.error.errors.map(
			(err) => `${err.path.join('.')}: ${err.message}`
		);
	} else {
		// Check for auto-fixes by comparing original vs cleaned data
		for (const [key, originalValue] of Object.entries(row)) {
			const cleanedValue = result.data[key];
			if (originalValue !== cleanedValue) {
				validationResult.fixedFields.push(key);
				if (originalValue && !cleanedValue) {
					validationResult.warnings.push(`${key}: Invalid value "${originalValue}" was cleared`);
				} else if (originalValue !== cleanedValue) {
					validationResult.warnings.push(
						`${key}: "${originalValue}" was cleaned to "${cleanedValue}"`
					);
				}
			}
		}
	}

	return validationResult;
}

/**
 * Validates and cleans an entire CSV dataset
 */
export function validateCSVData(
	data: Record<string, any>[],
	columnFormats: Record<string, ColumnFormat>
): {
	validRows: any[];
	invalidRows: { row: any; errors: string[]; index: number }[];
	warnings: string[];
	totalFixed: number;
} {
	const validRows: any[] = [];
	const invalidRows: { row: any; errors: string[]; index: number }[] = [];
	const warnings: string[] = [];
	let totalFixed = 0;

	data.forEach((row, index) => {
		const result = validateRow(row, columnFormats);

		if (result.isValid) {
			validRows.push(result.data);
			if (result.fixedFields.length > 0) {
				totalFixed++;
				warnings.push(`Row ${index + 1}: Auto-fixed fields: ${result.fixedFields.join(', ')}`);
			}
			warnings.push(...result.warnings.map((w) => `Row ${index + 1}: ${w}`));
		} else {
			invalidRows.push({
				row: result.data,
				errors: result.errors,
				index: index + 1
			});
		}
	});

	return {
		validRows,
		invalidRows,
		warnings,
		totalFixed
	};
}
