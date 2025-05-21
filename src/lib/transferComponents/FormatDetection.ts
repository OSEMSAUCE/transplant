import type { ColumnFormat } from '$lib/types/columnModel';

// ============================================
// TYPE DETECTION MODULE
// ============================================
// This module handles detection and validation of different data formats
// including numbers, dates, and GPS coordinates.
// ============================================

// 🔍 SECTION: DETECTION FUNCTIONS (READ-ONLY)
// These functions analyze data to determine its format without modifying it
// ============================================

// ============================================
// NUMBER DETECTION (TYPE-SPECIFIC)
// ============================================
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

		// Remove commas, whitespace, and currency symbols
		const cleaned = value.replace(/[,\s€$£]/g, '').trim();

		// Check if it's a valid number string (including scientific notation)
		const isValidNumber = /^-?\d+(\.\d+)?(e-?\d+)?$/.test(cleaned);
		return isValidNumber;
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

export function isLatitude(val: string | number): boolean {
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

export function isLongitude(val: string | number): boolean {
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
 * Determines if a column should be treated as a GPS component (lat or lon)
 * by checking if most values are valid lat/lon values.
 */
export function isGpsColumn(values: Array<string | number | null>): boolean {
	if (!values || values.length === 0) return false;

	// Count valid lat/lon values
	let validCount = 0;
	let totalNonNull = 0;

	for (const val of values) {
		if (val === null || val === undefined || val === '') continue;

		totalNonNull++;
		if (typeof val === 'number') {
			if (isLatitude(val) || isLongitude(val)) validCount++;
		} else if (typeof val === 'string') {
			const num = Number(val);
			if (!isNaN(num) && (isLatitude(num) || isLongitude(num))) validCount++;
		}
	}

	// If at least 70% of non-null values are valid lat/lon values
	return totalNonNull > 0 && validCount / totalNonNull >= 0.7;
}

//  3 Apr 2025  8:55 AM New function
export function detectFormat(
	columnData: Array<string | number | null>,
	currentColumnHeader: string
): ColumnFormat {
	console.log('Checking column format for:', currentColumnHeader);

	// First, try to detect GPS type (latitude, longitude, or combined GPS)
	const gpsType = detectGpsType(columnData, currentColumnHeader);
	if (gpsType) {
		console.log(`Column ${currentColumnHeader} detected as GPS type: ${gpsType}`);
		return gpsType;
	}
	let selectedFormat: ColumnFormat = 'string';
	const sampleValues = columnData
		.filter((val: string | number | null) => val !== null && val !== '')
		.slice(0, 3); // Get first 3 non-empty values
	// console.log('Checking sample values:', sampleValues);
	// Count dates and numbers in sample
	const dateCount = sampleValues.filter(isDate).length;
	const numberCount = sampleValues.filter((val) => !isDate(val) && isNumber(val)).length;

	// Check for dates FIRST, then numbers
	if (dateCount >= Math.ceil(sampleValues.length / 2)) {
		selectedFormat = 'date';
		console.log(
			`Column ${currentColumnHeader} detected as date format (${dateCount}/${sampleValues.length} date values)`
		);
	} else if (numberCount >= Math.ceil(sampleValues.length / 2)) {
		selectedFormat = 'number';
		console.log(
			`Column ${currentColumnHeader} detected as number format (${numberCount}/${sampleValues.length} number values)`
		);
	} else {
		console.log(
			`No majority format for ${currentColumnHeader} - keeping as '${selectedFormat}' (${numberCount} numbers, ${dateCount} dates)`
		);
	}
	return selectedFormat;
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
