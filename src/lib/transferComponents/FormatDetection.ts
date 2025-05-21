import type { ColumnFormat } from '$lib/types/columnModel';

// ============================================
// COLUMN TYPE DETECTION RULES
// ============================================
// 1. VALIDATION FLOW (in order of priority):
//    1. GPS - Check for GPS coordinates (most specific)
//    2. latitude - Check for latitude values
//    3. longitude - Check for longitude values
//    4. Date - Check for date formats
//    5. Number - Check for numeric values
//    6. String - Default fallback
//
// 2. TOLERANCE RULE (applies to all types):
//    - Check first 5 non-blank values in column
//    - If 3/5 values (60%) match the type → Column is that type
//    - If not, move to next type in priority order
//    - If no types match → Default to String
// ============================================

// ============================================
// DETECTION CONFIGURATION
// ============================================
const VALIDATION_CONFIG = {
	REQUIRED_MATCHES: 3, // Number of values that must match the type
	SAMPLE_SIZE: 5, // Number of non-blank values to check
	MIN_SAMPLES: 2 // Minimum samples needed to make a decision
} as const;

// ============================================
// CORE VALIDATION FUNCTIONS
// ============================================

/**
 * Determines if a column matches a specific type based on the validation rules
 */
function isColumnOfType(
	values: Array<string | number | null>,
	validator: (value: string | number) => boolean
): boolean {
	let matchCount = 0;
	let checkedCount = 0;

	for (const val of values) {
		// Skip null/empty values
		if (val === null || val === undefined || val === '') continue;

		// Check if value matches the type
		if (validator(val)) {
			matchCount++;
		} else {
			// If we can't reach the required matches even with remaining samples, exit early
			const remainingSamples = VALIDATION_CONFIG.SAMPLE_SIZE - checkedCount - 1;
			if (matchCount + remainingSamples < VALIDATION_CONFIG.REQUIRED_MATCHES) {
				return false;
			}
		}

		checkedCount++;
		// Stop after checking SAMPLE_SIZE non-null values
		if (checkedCount >= VALIDATION_CONFIG.SAMPLE_SIZE) break;
	}

	// Need at least MIN_SAMPLES to make a decision
	return (
		checkedCount >= VALIDATION_CONFIG.MIN_SAMPLES &&
		matchCount >= VALIDATION_CONFIG.REQUIRED_MATCHES
	);
}

// ============================================
// MAIN FORMAT DETECTION
// ============================================

/**
 * Main function to detect the format of a column based on its values
 */
export function detectFormat(
	columnData: Array<string | number | null>,
	currentColumnHeader: string
): ColumnFormat {
	const lowerHeader = currentColumnHeader.toLowerCase();

	// 1. GPS DETECTION (comma-separated lat/lon pairs)
	if (lowerHeader.includes('lat') && lowerHeader.includes('lon')) {
		if (checkGpsColumn(columnData)) {
			return 'gps';
		}
	}

	// 2. LATITUDE DETECTION
	if (lowerHeader.includes('lat')) {
		if (isLatitudeColumn(columnData)) {
			return 'latitude';
		}
	}

	// 3. LONGITUDE DETECTION
	if (lowerHeader.includes('lon') || lowerHeader.includes('long')) {
		if (isLongitudeColumn(columnData)) {
			return 'longitude';
		}
	}

	// 4. DATE DETECTION
	if (isDateColumn(columnData)) {
		return 'date';
	}

	// 5. NUMBER DETECTION
	if (isNumberColumn(columnData)) {
		return 'number';
	}

	// 6. Default to String
	return 'string';
}

// Helper functions for column type detection - used only in detectFormat
function checkGpsColumn(columnData: Array<string | number | null>): boolean {
	return isColumnOfType(columnData, (val) => {
		if (val === null || val === '') return false;
		if (typeof val === 'string' && val.includes(',')) {
			const [lat, lon] = val.split(',').map((coord) => coord.trim());
			return isLatitude(lat) && isLongitude(lon);
		}
		return false;
	});
}

function isLatitudeColumn(columnData: Array<string | number | null>): boolean {
	return isColumnOfType(columnData, (val) => {
		if (val === null || val === '') return false;
		return isLatitude(val);
	});
}

function isLongitudeColumn(columnData: Array<string | number | null>): boolean {
	return isColumnOfType(columnData, (val) => {
		if (val === null || val === '') return false;
		return isLongitude(val);
	});
}

function isDateColumn(columnData: Array<string | number | null>): boolean {
	return isColumnOfType(columnData, (val) => isDate(val));
}

function isNumberColumn(columnData: Array<string | number | null>): boolean {
	return isColumnOfType(columnData, (val) => {
		if (typeof val === 'number') return true;
		if (typeof val === 'string') {
			// Handle numbers with commas as thousand separators
			const cleanVal = val.replace(/,/g, '').trim();
			if (cleanVal === '') return false;
			const num = Number(cleanVal);
			return !isNaN(num);
		}
		return false;
	});
}

// ============================================
// 1. NUMBER DETECTION
// ============================================

/**
 * Checks if a value is a valid number
 */
export function isNumber(value: any): boolean {
	// Check if value is already a number
	if (typeof value === 'number') {
		return true;
	}

	if (typeof value === 'string') {
		// First check if it looks like a date format (to avoid misclassifying dates as numbers)
		if (value.includes('-') && /\d{4}-\d{2}-\d{2}/.test(value)) {
			return false; // Looks like ISO date format
		}

		// Handle numbers with commas as thousand separators
		const cleanVal = value.replace(/,/g, '').trim();
		if (cleanVal === '') return false;

		// Check if it's a valid number string (including scientific notation)
		const num = Number(cleanVal);
		return !isNaN(num);
	}

	return false;
}

// ============================================
// DATE DETECTION (TYPE-SPECIFIC)
// ============================================
// Supports multiple date formats including:
// - YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
// - Month YYYY, DD Month YYYY, Month DD, YYYY
// - DD-MMM-YYYY, DD MMM YYYY
// - Quarters (YYYY-Q[1-4])
// - ISO weeks (YYYY-W##)
// ============================================
export function isDate(value: any): boolean {
	if (value === null || value === undefined || value === '') return false;
	if (typeof value === 'number') {
		// Check if it's a valid year
		return 1900 < value && value < 2040;
	}
	if (typeof value === 'string') {
		// Check if it's a standalone year
		if (/^\d{4}$/.test(value)) {
			const year = parseInt(value);
			return 1900 < year && year < 2040;
		}

		// Check other date formats
		const DATE_FORMATS = [
			/^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD (ISO)
			/^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
			/^\d{4}\.\d{2}\.\d{2}$/, // YYYY.MM.DD
			/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i, // Month YYYY
			/^\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i, // DD Month YYYY
			/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}$/i, // Month DD, YYYY
			/^\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}$/i, // DD-MMM-YYYY
			/^\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/i, // DD MMM YYYY
			/^\d{4}-(?:Q[1-4])$/, // YYYY-Q[1-4] (Quarter)
			/^\d{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])$/, // YYYY-W[01-53] (ISO week)
			/\b(19|20)\d{2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/, // Month YYYY
			/\b(19|20)\d{2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/, // MMM YYYY
			/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i, // MMM YYYY
			/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/, // Month
			/^\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{4}$/i
		];
		return DATE_FORMATS.some((format) => format.test(value));
		// print as JavaScript data string
	}
	return false;
}

// ============================================
// GPS COORDINATE VALIDATION (SHARED & TYPE-SPECIFIC)
// ============================================
// Shared validation functions for GPS coordinates
// ============================================

/**
 * SHARED: Used by latitude, longitude, and GPS pair validation
 * Checks if a number has sufficient decimal places for GPS precision
 */
function hasEnoughDecimalPlaces(val: number): boolean {
	// Convert to string and check decimal places
	const strVal = val.toString();
	if (strVal.includes('.')) {
		const decimalPlaces = strVal.split('.')[1].length;
		return decimalPlaces >= 3;
	}
	return false;
}

// ============================================
// LATITUDE VALIDATION (TYPE-SPECIFIC)
// ============================================
// Validates latitude values in various formats:
// - Decimal degrees (DD): 40.7128
// - DMS: 40°42'51"N
// - Range: -90 to +90 degrees
// ============================================

export function isLatitude(val: string | number | null): boolean {
	if (val === null || val === undefined || val === '') return false;
	if (val === null || val === undefined || val === '') return false;

	// Handle numeric values
	if (typeof val === 'number') {
		return val >= -90 && val <= 90 && hasEnoughDecimalPlaces(val);
	}

	// Handle string values that are numeric
	if (typeof val === 'string') {
		// Try to parse as decimal degrees
		const num = Number(val);
		if (!isNaN(num)) {
			return num >= -90 && num <= 90 && hasEnoughDecimalPlaces(num);
		}

		// Try to parse as DMS format
		if (val.includes('°') || val.includes("'") || val.includes('"') || /[NSns]/.test(val)) {
			const dd = parseDMS(val);
			if (dd !== null) {
				return dd >= -90 && dd <= 90;
			}
		}
	}

	return false;
}

// ============================================
// LONGITUDE VALIDATION (TYPE-SPECIFIC)
// ============================================
// Validates longitude values in various formats:
// - Decimal degrees (DD): -74.0060
// - DMS: 74°0'22"W
// - Range: -180 to +180 degrees
// ============================================

export function isLongitude(val: string | number | null): boolean {
	if (val === null || val === undefined || val === '') return false;
	if (val === null || val === undefined || val === '') return false;

	// Handle numeric values
	if (typeof val === 'number') {
		return val >= -180 && val <= 180 && hasEnoughDecimalPlaces(val);
	}

	// Handle string values that are numeric
	if (typeof val === 'string') {
		// Try to parse as decimal degrees
		const num = Number(val);
		if (!isNaN(num)) {
			return num >= -180 && num <= 180 && hasEnoughDecimalPlaces(num);
		}

		// Try to parse as DMS format
		if (val.includes('°') || val.includes("'") || val.includes('"') || /[EWew]/.test(val)) {
			const dd = parseDMS(val);
			if (dd !== null) {
				return dd >= -180 && dd <= 180;
			}
		}
	}

	return false;
}

// ============================================
// DMS PARSING (SHARED)
// ============================================
// Converts DMS (Degrees, Minutes, Seconds) to decimal degrees
// Supports multiple formats:
// - Full DMS: 41°24'12.2"N
// - DM: 41°24.2'N
// - D: 41°N
// ============================================

/**
 * SHARED: Used by both latitude and longitude validation
 * Parses DMS (Degrees, Minutes, Seconds) to decimal degrees
 */
export function parseDMS(dmsStr: string): number | null {
	// Handle various DMS formats
	// Format: 41°24'12.2"N or 41° 24' 12.2" N or 41d 24m 12.2s N
	const dmsRegex = /^\s*(\d+)\s*[°d]\s*(\d+)\s*['m]\s*(\d+(?:\.\d+)?)\s*["s]\s*([NSEWnsew])\s*$/;

	// Format: 41°24'N or 41° 24' N
	const dmRegex = /^\s*(\d+)\s*[°d]\s*(\d+)\s*['m]\s*([NSEWnsew])\s*$/;

	// Format: 41°N or 41° N
	const dRegex = /^\s*(\d+)\s*[°d]\s*([NSEWnsew])\s*$/;

	let match = dmsStr.match(dmsRegex);
	if (match) {
		const [_, degrees, minutes, seconds, direction] = match;
		let dd = parseInt(degrees) + parseInt(minutes) / 60 + parseFloat(seconds) / 3600;
		if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
			dd = -dd;
		}
		return dd;
	}

	match = dmsStr.match(dmRegex);
	if (match) {
		const [_, degrees, minutes, direction] = match;
		let dd = parseInt(degrees) + parseInt(minutes) / 60;
		if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
			dd = -dd;
		}
		return dd;
	}

	match = dmsStr.match(dRegex);
	if (match) {
		const [_, degrees, direction] = match;
		let dd = parseInt(degrees);
		if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
			dd = -dd;
		}
		return dd;
	}

	return null;
}

// ============================================
// GPS PAIR VALIDATION (TYPE-SPECIFIC)
// ============================================
// Validates combined latitude/longitude pairs:
// - Decimal degrees: "40.7128,-74.0060"
// - DMS: "40°42'51\"N 74°0'21\"W"
// ============================================
/**
 * Validates if a value is a GPS coordinate pair or single coordinate
 * Combines latitude and longitude validation for complete GPS points
 */
export function isGps(value: any): boolean {
	if (value === null || value === undefined || value === '') return false;

	// Case 1: Individual latitude or longitude value
	if (typeof value === 'number' || !isNaN(Number(value))) {
		return isLatitude(value) || isLongitude(value);
	}

	// Case 2: Combined "lat,lon" string in decimal degrees
	if (typeof value === 'string') {
		// Check for decimal degrees format: "lat,lon"
		const ddRegex = /^\s*([+-]?\d{1,3}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)\s*$/;
		const ddMatch = value.match(ddRegex);
		if (ddMatch) {
			const lat = parseFloat(ddMatch[1]);
			const lon = parseFloat(ddMatch[2]);
			return isLatitude(lat) && isLongitude(lon);
		}

		// Check for DMS format: "lat dms, lon dms"
		// This regex looks for two DMS-like patterns separated by comma
		if (
			(value.includes('°') || value.includes("'") || value.includes('"')) &&
			value.includes(',')
		) {
			const parts = value.split(',').map((part) => part.trim());
			if (parts.length === 2) {
				const latDMS = parseDMS(parts[0]);
				const lonDMS = parseDMS(parts[1]);
				if (latDMS !== null && lonDMS !== null) {
					return isLatitude(latDMS) && isLongitude(lonDMS);
				}
			}
		}
	}

	return false;
}

/**
 * Determines if a column contains GPS coordinate components (latitude or longitude values)
 * by checking if most values are valid lat/lon values.
 */
export function checkGpsComponents(values: Array<string | number | null>): boolean {
	return isColumnOfType(values, (val) => {
		if (typeof val === 'number') {
			return isLatitude(val) || isLongitude(val);
		}
		if (typeof val === 'string') {
			const num = Number(val);
			return !isNaN(num) && (isLatitude(num) || isLongitude(num));
		}
		return false;
	});
}

export function matchesFormat(value: string | number | null, format: ColumnFormat): boolean {
	if (format === 'string') return true;
	if (format === 'number') return isNumber(value);
	if (format === 'date') return isDate(value);
	if (format === 'gps') return isGps(value);
	if (format === 'latitude') return isLatitude(value);
	if (format === 'longitude') return isLongitude(value);
	return false;
}

// ============================================
// FORMATTING MODULE
// ============================================
// This module handles formatting values for display
// ============================================
// 🖨️ SECTION: FORMATTING FUNCTIONS
// These functions convert values to display strings
// ============================================

function formatDate(value: string): string {
	return new Date(value).toLocaleDateString('en-US', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
}

type FormatT = 'string' | 'number' | 'date' | 'gps';
export function formatValue(format: FormatT, value: any): string | null {
	if (!matchesFormat(value, format)) {
		return null;
	}
	if (format === 'date') {
		return formatDate(value);
	}
	if (format === 'gps') {
		return formatGps(value);
	}
	if (format === 'number') {
		return formatNumber(value);
	}
	if (format === 'string') {
		return formatString(value);
	}
	return value;
}

function formatGps(value: any): string {
	return value;
}

function formatNumber(value: any): string {
	// If the value is a string with commas, first clean it
	if (typeof value === 'string') {
		value = value.replace(/[,\s€$£]/g, '');
	}

	// Convert to number and format with Intl.NumberFormat
	const num = Number(value);

	// Ensure we don't return 'NaN' string
	if (isNaN(num)) {
		return value.toString();
	}

	return new Intl.NumberFormat('en-US', {
		style: 'decimal',
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	}).format(num);
}

function formatString(value: any): string {
	return value;
}

// ============================================
// GPS TYPE DETECTION
// ============================================
// Determines the specific type of GPS data in a column
// (full GPS, latitude, or longitude) based on headers and values
// ============================================
type GpsFormat = Extract<ColumnFormat, 'gps' | 'latitude' | 'longitude'>;

/**
 * Determines the specific GPS type of a column (full GPS, latitude, or longitude)
 * based on column name and data values.
 */
export function detectGpsType(
	values: Array<string | number | null>,
	columnHeader: string
): ColumnFormat | null {
	if (!values || values.length === 0) return null;

	const header = columnHeader.toLowerCase().trim();

	// Quick checks based on header
	if (/\b(lat|latitude)\b/i.test(header)) return 'latitude';
	if (/\b(lon|lng|long|longitude)\b/i.test(header)) return 'longitude';
	if (header === 'gps' || header === 'coordinates' || header.includes('location')) return 'gps';

	// Count valid values of each type
	let latCount = 0;
	let lonCount = 0;
	let gpsCount = 0;
	let totalSamples = 0;
	const sampleSize = Math.min(50, values.length); // Check up to 50 values for better accuracy

	// Analyze sample values
	for (let i = 0; i < sampleSize; i++) {
		const val = values[i];
		if (val === null || val === '') continue;

		totalSamples++;
		if (isLatitude(val)) latCount++;
		if (isLongitude(val)) lonCount++;
		if (isGps(val)) gpsCount++;
	}

	// Calculate confidence scores (0-1)
	const latConfidence = latCount / totalSamples;
	const lonConfidence = lonCount / totalSamples;
	const gpsConfidence = gpsCount / totalSamples;

	// Only return a type if we're reasonably confident
	if (latConfidence > 0.8 && lonConfidence < 0.2) return 'latitude';
	if (lonConfidence > 0.8 && latConfidence < 0.2) return 'longitude';
	if (gpsConfidence > 0.7) return 'gps';

	// If we have high confidence in both lat and lon, it's likely a GPS column
	if (latConfidence > 0.6 && lonConfidence > 0.6) return 'gps';

	// If we get here, we couldn't determine the type with confidence
	return null;
}
