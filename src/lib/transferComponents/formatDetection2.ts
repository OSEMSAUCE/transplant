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
	// RULES:
	// 1. STRICT PATTERN MATCHING ONLY - Use exact regex patterns for validation
	// 2. NO HEADER DETECTION - GPS detection is based ONLY on value patterns
	// 3. HIGH PRECISION REQUIRED - Latitude/longitude must have min 3+ decimal places
	// 4. FORMAT: "Lat, Long" - Must be comma-separated coordinate pair
	if (
		isColumnOfType(columnData, (val) => {
			if (val === null || val === '') return false;
			if (typeof val === 'string' && val.includes(',')) {
				const [lat, lon] = val.split(',').map((coord) => coord.trim());
				return isLatitude(lat) && isLongitude(lon);
			}
			return false;
		})
	) {
		return 'gps';
	}

	// =============================================
	// SILO 2: LATITUDE
	// =============================================
	// RULES:
	// 1. HEADER TEXT DETECTION IS USED - Only check patterns if header includes 'lat'
	// 2. STRICT VALIDATION - Values must be in range -90 to 90
	// 3. HIGH PRECISION REQUIRED - Must have min 3+ decimal places for numeric values
	const lowerHeader = currentColumnHeader.toLowerCase().trim(); // Define here for header checks
	// Check header for latitude patterns
	if (lowerHeader.includes('lat')) {
		// For columns with 'lat' in header, prioritize latitude detection
		// Check actual values directly but with more relaxed validation
		let validCount = 0;
		let totalCount = 0;
		
		for (const val of columnData) {
			if (val === null || val === '') continue;
			totalCount++;
			
			// Simple validation for latitude: number in range -90 to 90
			if (typeof val === 'number') {
				if (val >= -90 && val <= 90) validCount++;
			} else if (typeof val === 'string') {
				const num = Number(val);
				if (!isNaN(num) && num >= -90 && num <= 90) validCount++;
			}
			
			// Only check a few samples for performance
			if (totalCount >= VALIDATION_CONFIG.SAMPLE_SIZE) break;
		}
		
		// If enough valid latitude values, return lat format
		if (totalCount > 0 && validCount / totalCount >= 0.6) {
			return 'latitude';
		}
	}

	// =============================================
	// SILO 3: LONGITUDE
	// =============================================
	// RULES:
	// 1. HEADER TEXT DETECTION IS USED - Only check patterns if header includes 'lon' or 'lon'
	// 2. STRICT VALIDATION - Values must be in range -180 to 180
	// 3. HIGH PRECISION REQUIRED - Must have min 3+ decimal places for numeric values
	if (lowerHeader.includes('lon')) {
		// For columns with 'lon' in header, prioritize longitude detection
		// Check actual values directly but with more relaxed validation
		let validCount = 0;
		let totalCount = 0;
		
		for (const val of columnData) {
			if (val === null || val === '') continue;
			totalCount++;
			
			// Simple validation for longitude: number in range -180 to 180
			if (typeof val === 'number') {
				if (val >= -180 && val <= 180) validCount++;
			} else if (typeof val === 'string') {
				const num = Number(val);
				if (!isNaN(num) && num >= -180 && num <= 180) validCount++;
			}
			
			// Only check a few samples for performance
			if (totalCount >= VALIDATION_CONFIG.SAMPLE_SIZE) break;
		}
		
		// If enough valid longitude values, return lon format
		if (totalCount > 0 && validCount / totalCount >= 0.6) {
			return 'longitude';
		}
	}

	// =============================================
	// SILO 4: DATE
	// =============================================
	// RULES:
	// 1. NO HEADER DETECTION - Date detection is based ONLY on value patterns
	// 2. STRICT VALIDATION - Only accept standard date formats like YYYY-MM-DD etc etc
	// 3. CHECK COMMON FORMATS - see this list in isDate function
	if (isColumnOfType(columnData, (val) => isDate(val))) {
		return 'date';
	}

	// =============================================
	// SILO 5: NUMBER
	// =============================================
	// RULES:
	// 1. NO HEADER DETECTION - Number detection is based ONLY on value patterns
	// 2. ALLOWS NUMERIC FORMATS - Integers, decimals, scientific notation
	// 3. HANDLES THOUSANDS SEPARATORS - Commas in numbers are properly handled
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
	// RULES:
	// 1. DEFAULT FALLBACK - Any values that don't match other patterns default to string
	// 2. NO HEADER DETECTION - We do not use headers to identify strings (except where noted at top)
	// 3. ALL VALUES ACCEPTED - Strings can be any non-null value (most permissive type)
	return 'string';
}

// =============================================
// GPS COORDINATE VALIDATION (DECIMAL DEGREES ONLY)
// =============================================
// Only supports decimal degrees (DD) format for GPS, latitude, and longitude
// =============================================

/**
 * Checks if a number has enough decimal places for GPS precision
 * Now accepts 2+ decimal places for more flexibility
 */
function hasEnoughDecimalPlaces(val: number): boolean {
	const strVal = val.toString();
	if (strVal.includes('.')) {
		const decimalPlaces = strVal.split('.')[1].length;
		return decimalPlaces >= 2; // 2+ decimal places (more permissive than before)
	}
	return false;
}

// =============================================
// SILO 1: GPS VALIDATION
// =============================================
// Validates combined latitude/longitude pairs:
// - Decimal degrees: "40.7128,-74.0060"
// - DMS: "40°42'51\"N 74°0'21\"W"
// =============================================

/**
 * Validates if a value is a GPS coordinate pair in decimal degrees (DD) format
 * More flexible to handle various decimal place counts and separator styles
 */
export function isGps(value: any): boolean {
	if (value === null || value === undefined || value === '') return false;

	if (typeof value === 'string') {
		// More flexible regex for decimal degrees
		// Allows any number of decimal places and various separators
		const ddRegex = /^\s*([+-]?\d{1,3}(?:\.\d{1,})?)[\s,]*([+-]?\d{1,3}(?:\.\d{1,})?)\s*$/;
		const ddMatch = value.match(ddRegex);
		
		if (ddMatch) {
			const lat = parseFloat(ddMatch[1]);
			const lon = parseFloat(ddMatch[2]);
			return isLatitude(lat) && isLongitude(lon);
		}
		
		// Try other common formats like "lat, long" or "lat long"
		const parts = value.split(/[,\s]+/).filter(part => part.trim() !== '');
		if (parts.length === 2) {
			const lat = parseFloat(parts[0]);
			const lon = parseFloat(parts[1]);
			if (!isNaN(lat) && !isNaN(lon) && 
				lat >= -90 && lat <= 90 && 
				lon >= -180 && lon <= 180) {
				return true;
			}
		}
		return false;
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

	if (typeof val === 'number') {
		return val >= -90 && val <= 90 && hasEnoughDecimalPlaces(val);
	}

	if (typeof val === 'string') {
		const num = Number(val);
		if (!isNaN(num)) {
			return num >= -90 && num <= 90 && hasEnoughDecimalPlaces(num);
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

	if (typeof val === 'number') {
		return val >= -180 && val <= 180 && hasEnoughDecimalPlaces(val);
	}

	if (typeof val === 'string') {
		const num = Number(val);
		if (!isNaN(num)) {
			return num >= -180 && num <= 180 && hasEnoughDecimalPlaces(num);
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

/**
 * Formats a value according to the specified format
 * Returns the formatted value if it matches the format, null otherwise
 */
export function formatValue(
	format: ColumnFormat,
	value: string | number | null
): string | number | null {
	if (!matchesFormat(value, format)) {
		return null;
	}

	if (value === null || value === undefined || value === '') return value;

	switch (format) {
		case 'number': {
			// Handle as number with thousands separator, up to 2 decimals
			let num: number;
			if (typeof value === 'number') {
				num = value;
			} else {
				const cleanVal = (value as string).replace(/,/g, '').trim();
				num = Number(cleanVal);
			}
			if (isNaN(num)) return value;
			return new Intl.NumberFormat('en-US', {
				style: 'decimal',
				minimumFractionDigits: 0,
				maximumFractionDigits: 2
			}).format(num);
		}
		case 'date': {
			// Try to standardize to YYYY-MM-DD if possible
			if (typeof value === 'string') {
				// Try to parse common date formats
				const isoMatch = value.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
				if (isoMatch) {
					return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
				}
				const usMatch = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
				if (usMatch) {
					// MM/DD/YYYY or DD/MM/YYYY - assuming MM/DD/YYYY format
					return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`;
				}
				// If it's a year only
				if (/^\d{4}$/.test(value)) {
					return value;
				}
				// Otherwise, return as-is
				return value;
			}
			return value;
		}
		case 'gps':
		case 'latitude':
		case 'longitude': {
			let num: number;
			if (typeof value === 'number') {
				num = value;
			} else if (typeof value === 'string') {
				// For GPS coordinates, we need special handling
				if (format === 'gps' && value.includes(',')) {
					// For full GPS coordinates (lat,long)
					const parts = value.split(',').map(p => p.trim());
					if (parts.length === 2) {
						const lat = Number(parts[0]);
						const long = Number(parts[1]);
						if (!isNaN(lat) && !isNaN(long)) {
							return `${lat.toFixed(7)},${long.toFixed(7)}`;
						}
					}
					return value; // Return original if parsing fails
				}
				// For single coordinate values
				const cleanVal = value.replace(/,/g, '').trim();
				num = Number(cleanVal);
			} else {
				return value;
			}
			if (isNaN(num)) return value;
			return Number(num.toFixed(7));
		}
		case 'string':
		default:
			return value;
	}
}

export function matchesFormat(value: string | number | null, format: ColumnFormat): boolean {
	if (value === null || value === undefined) return false;

	switch (format) {
		case 'string':
			return isString(value);
		case 'number':
			return isNumber(value);
		case 'date':
			return isDate(value);
		case 'gps':
			return isGps(value);
		case 'latitude':
			return isLatitude(value);
		case 'longitude':
			return isLongitude(value);
		default:
			return false;
	}
}
