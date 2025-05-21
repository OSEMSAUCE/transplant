// ============================================
// COLUMN TYPE DETECTION RULES
// ============================================
// 1. VALIDATION FLOW (in order of priority):
//    a. GPS - Check for GPS coordinates (most specific)
//    b. latitude - Check for latitude values
//    c. longitude - Check for longitude values
//    d. Date - Check for date formats
//    e. Number - Check for numeric values
//    f. String - Default fallback
//
// 2. VALIDATION RULE (applies to all types):
//    - Check first 5 non-blank values in column
//    - If 3/5 values (60%) match the type → Column is that type
//    - If not, move to next type in priority order
//    - If no types match → Default to String
// ============================================

// Type definitions
export type ColumnFormat = 'gps' | 'latitude' | 'longitude' | 'date' | 'number' | 'string';

// ============================================
// DETECTION CONFIGURATION
// ============================================
const VALIDATION_CONFIG = {
	REQUIRED_MATCHES: 3, // Number of values that must match the type
	SAMPLE_SIZE: 5, // Number of non-blank values to check
	MIN_SAMPLES: 2 // Minimum samples needed to make a decision
} as const;

// ============================================
// TYPE DETECTION MODULE
// ============================================
// This module handles detection and validation of different data formats
// including numbers, dates, and GPS coordinates.
// ============================================
// 🔍 SECTION: DETECTION FUNCTIONS (READ-ONLY)
// These functions analyze data to determine its format without modifying it
// ============================================

/**
 * Core function to determine if a column matches a specific type
 * Used by all type detection silos
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

/**
 * Main function to detect the format of a column based on its values
 * This is the SINGLE SOURCE OF TRUTH for column format detection
 */
export function detectFormat(
	columnData: Array<string | number | null>,
	currentColumnHeader: string
): ColumnFormat {
	// Run through each silo in order of specificity
	// Each silo is a self-contained detection unit
	
	// =============================================
	// SILO 1: GPS COORDINATES (MOST SPECIFIC)
	// =============================================
	const lowerHeader = currentColumnHeader.toLowerCase();
	if (lowerHeader.includes('gps') || lowerHeader.includes('coordinate')) {
		if (isColumnOfType(columnData, (val) => {
			if (val === null || val === '') return false;
			if (typeof val === 'string' && val.includes(',')) {
				const [lat, lon] = val.split(',').map(coord => coord.trim());
				return isLatitude(lat) && isLongitude(lon);
			}
			return false;
		})) {
			return 'gps';
		}
	}

	// =============================================
	// SILO 2: LATITUDE
	// =============================================
	if (lowerHeader.includes('lat')) {
		if (isColumnOfType(columnData, (val) => {
			if (val === null || val === '') return false;
			return isLatitude(val);
		})) {
			return 'latitude';
		}
	}

	// =============================================
	// SILO 3: LONGITUDE
	// =============================================
	if (lowerHeader.includes('lon') || lowerHeader.includes('long')) {
		if (isColumnOfType(columnData, (val) => {
			if (val === null || val === '') return false;
			return isLongitude(val);
		})) {
			return 'longitude';
		}
	}

	// =============================================
	// SILO 4: DATE
	// =============================================
	if (isColumnOfType(columnData, (val) => isDate(val))) {
		return 'date';
	}

	// =============================================
	// SILO 5: NUMBER
	// =============================================
	if (
		isColumnOfType(columnData, (val) => {
			if (typeof val === 'number') return true;
			if (typeof val === 'string') {
				// Handle numbers with commas as thousand separators
				const cleanVal = val.replace(/,/g, '').trim();
				if (cleanVal === '') return false;
				const num = Number(cleanVal);
				return !isNaN(num);
			}
			return false;
		})
	) {
		return 'number';
	}

	// =============================================
	// SILO 6: STRING (DEFAULT FALLBACK)
	// =============================================
	// If no other type matches, default to string
	return 'string';
}

// =============================================
// GPS COORDINATE VALIDATION (SHARED)
// =============================================
// Shared validation functions for GPS coordinates
// =============================================

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

// =============================================
// SILO 1: GPS VALIDATION
// =============================================
// Validates combined latitude/longitude pairs:
// - Decimal degrees: "40.7128,-74.0060"
// - DMS: "40°42'51\"N 74°0'21\"W"
// =============================================

/**
 * Validates if a value is a GPS coordinate pair
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

// =============================================
// SILO 2: LATITUDE VALIDATION
// =============================================
// Validates latitude values in various formats:
// - Decimal degrees (DD): 40.7128
// - DMS: 40°42'51"N
// - Range: -90 to +90 degrees
// =============================================

export function isLatitude(val: string | number | null): boolean {
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

// =============================================
// SILO 3: LONGITUDE VALIDATION
// =============================================
// Validates longitude values in various formats:
// - Decimal degrees (DD): -74.0060
// - DMS: 74°0'22"W
// - Range: -180 to +180 degrees
// =============================================

export function isLongitude(val: string | number | null): boolean {
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

// =============================================
// SILO 4: DATE VALIDATION
// =============================================
// Supports multiple date formats including:
// - YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
// - Month YYYY, DD Month YYYY, Month DD, YYYY
// - DD-MMM-YYYY, DD MMM YYYY
// - Quarters (YYYY-Q[1-4])
// - ISO weeks (YYYY-W##)
// =============================================

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
	}
	return false;
}

// =============================================
// SILO 5: NUMBER VALIDATION
// =============================================
// Validates numeric values in various formats:
// - Integers: 123
// - Decimals: 123.45
// - Thousands separators: 1,234.56
// - Scientific notation: 1.23e4
// =============================================

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

// =============================================
// SILO 6: STRING VALIDATION (DEFAULT)
// =============================================
// All values that don't match other types
// are considered valid strings
// =============================================

export function isString(value: any): boolean {
	// All values (except null/undefined) can be strings
	return value !== null && value !== undefined;
}

// =============================================
// FORMAT MATCHING (UTILITY)
// =============================================
// Checks if a value matches a specific format
// =============================================

export function matchesFormat(value: string | number | null, format: ColumnFormat): boolean {
	if (value === null || value === undefined) return false;
	
	switch (format) {
		case 'string': return isString(value);
		case 'number': return isNumber(value);
		case 'date': return isDate(value);
		case 'gps': return isGps(value);
		case 'latitude': return isLatitude(value);
		case 'longitude': return isLongitude(value);
		default: return false;
	}
}
