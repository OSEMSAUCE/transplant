import { json } from '@sveltejs/kit';
import type { ColumnFormat } from '../types/columnModel';
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
// export type ColumnFormat = 'gps' | 'latitude' | 'longitude' | 'date' | 'number' | 'string' | 'polygon';

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
		const parts = value.split(/[,\s]+/).filter((part) => part.trim() !== '');
		if (parts.length === 2) {
			const lat = parseFloat(parts[0]);
			const lon = parseFloat(parts[1]);
			if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
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

// prob need to fix this.
function numbersInStringFinder(str: string): string[] {
	const regex = /[-+]?\d+(\.\d+)?/g;
	const matches = str.match(regex);
	return matches || [];
}

// =============================================
// SILO 5: POLYGON VALIDATION
// =============================================
// Validates longitude values in various formats:

// - use numbersInStringFinder to find all numbers in string
// - Write regex to say "find possible lats lons, things that are numbers basically, include minus sign and decimal point.
// - THEN pass to isLongitude and isLatitude and count for number of coordinates. More than 2 is porbably polygon.
// - If true send below. to "case polygon".

// =============================================

export function isPolygon(val: string | number | null): boolean {
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

// Define month names for matching (used by both isDate and formatValue)
const monthNamesLong = [
	'january',
	'february',
	'march',
	'april',
	'may',
	'june',
	'july',
	'august',
	'september',
	'october',
	'november',
	'december'
];
const monthNamesShort = [
	'jan',
	'feb',
	'mar',
	'apr',
	'may',
	'jun',
	'jul',
	'aug',
	'sep',
	'oct',
	'nov',
	'dec'
];

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

		// Check for standalone month ("August", "Aug")
		const standaloneMonthMatch = value.match(/^\s*([A-Za-z]{3,})\s*$/i);
		if (standaloneMonthMatch) {
			const monthStr = standaloneMonthMatch[1].toLowerCase();
			// Check if it's a valid month name
			for (const month of [...monthNamesLong, ...monthNamesShort]) {
				if (monthStr.startsWith(month) || month.startsWith(monthStr)) {
					return true;
				}
			}
		}

		// Check for month-year combinations in any order
		const monthYearMatch =
			value.match(/^\s*([A-Za-z]{3,})\s*[,\.]?\s*(\d{4})\s*$/i) ||
			value.match(/^\s*(\d{4})\s*[,\.]?\s*([A-Za-z]{3,})\s*$/i);
		if (monthYearMatch) {
			let monthStr;
			if (isNaN(Number(monthYearMatch[1]))) {
				monthStr = monthYearMatch[1].toLowerCase();
			} else {
				monthStr = monthYearMatch[2].toLowerCase();
			}

			// Check if it's a valid month name
			for (const month of [...monthNamesLong, ...monthNamesShort]) {
				if (monthStr.startsWith(month) || month.startsWith(monthStr)) {
					return true;
				}
			}
		}

		// Also check for two-digit years (YY) in certain contexts
		if (/^\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{2}$/i.test(value)) {
			return true; // Format like 14-Mar-22
		}

		// Check against a list of common date formats
		const DATE_FORMATS = [
			// ISO formats
			/^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD (ISO)
			/^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
			/^\d{4}\.\d{2}\.\d{2}$/, // YYYY.MM.DD

			// US/UK formats
			/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}$/, // MM/DD/YYYY or DD/MM/YYYY
			/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2}$/, // MM/DD/YY or DD/MM/YY

			// Text month formats
			/^(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i, // Month DD, YYYY
			/^\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i, // DD Month YYYY
			/^\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i, // D(st|nd|rd|th) Month YYYY

			// Short date formats with month abbreviations
			/^\d{1,2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}$/i, // DD-MMM-YYYY
			/^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i, // DD MMM YYYY

			// With day of week
			/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i, // ddd, DD MMM YYYY

			// Year first formats
			/^\d{4}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/i, // YYYY MMM DD
			/^\d{4}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}$/i, // YYYY Month DD

			// Just month and year
			/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i, // Month YYYY
			/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i, // MMM YYYY

			// Other formats
			/^\d{4}-(?:Q[1-4])$/, // YYYY-Q[1-4] (Quarter)
			/^\d{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])$/, // YYYY-W[01-53] (ISO week)
			/^\d{1,2}(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{4}$/i // DDMonYYYY (compact format)
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
			// Convert to ISO 8601 JSON string timestamp
			if (typeof value === 'number') {
				// If it's just a number, check if it could be a year between 1920-2040
				if (value >= 1920 && value <= 2040) {
					// Convert to January 1st at midnight for that year
					return new Date(value, 0, 1).toISOString();
				}
				return value;
			}

			if (typeof value === 'string') {
				// If it's a year only, convert to January 1st at midnight
				if (/^\d{4}$/.test(value)) {
					const year = parseInt(value);
					if (year >= 1920 && year <= 2040) {
						return new Date(year, 0, 1).toISOString();
					}
					return value;
				}

				let dateObj: Date | null = null;

				// ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
				const isoMatch = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
				if (isoMatch) {
					const year = parseInt(isoMatch[1]);
					const month = parseInt(isoMatch[2]) - 1; // JS months are 0-based
					const day = parseInt(isoMatch[3]);
					dateObj = new Date(year, month, day);
				}

				// US/UK format: MM/DD/YYYY or DD/MM/YYYY with slashes, dots, or hyphens
				if (!dateObj) {
					const usMatch = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
					if (usMatch) {
						const year = parseInt(usMatch[3]);
						const part1 = parseInt(usMatch[1]);
						const part2 = parseInt(usMatch[2]);
						// Assuming MM/DD/YYYY format, but this is ambiguous
						// MM/DD/YYYY (US) vs DD/MM/YYYY (UK)
						dateObj = new Date(year, part1 - 1, part2);
					}
				}

				// Month name formats
				const monthNamesLong = [
					'january',
					'february',
					'march',
					'april',
					'may',
					'june',
					'july',
					'august',
					'september',
					'october',
					'november',
					'december'
				];
				const monthNamesShort = [
					'jan',
					'feb',
					'mar',
					'apr',
					'may',
					'jun',
					'jul',
					'aug',
					'sep',
					'oct',
					'nov',
					'dec'
				];

				// Format: DD Mon YYYY (e.g., "22 Mar 2024") or 14th Mar 2025
				if (!dateObj) {
					// First check for the ordinal format (1st, 2nd, 3rd, 4th, etc)
					const ordinalMatch = value.match(
						/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\s+(\d{4})$/
					);
					if (ordinalMatch) {
						const day = parseInt(ordinalMatch[1]);
						const monthStr = ordinalMatch[2].toLowerCase();
						const year = parseInt(ordinalMatch[3]);

						// Find month number
						let monthNum = monthNamesLong.findIndex((m) => monthStr.startsWith(m));
						if (monthNum === -1) {
							monthNum = monthNamesShort.findIndex((m) => monthStr.startsWith(m));
						}

						if (monthNum !== -1) {
							dateObj = new Date(year, monthNum, day);
						}
					}
				}

				// Format: Mon DD, YYYY (e.g., "March 22, 2024" or "March 14, 2023")
				if (!dateObj) {
					const monthDayYearMatch = value.match(/^([A-Za-z]{3,})\s+(\d{1,2})(?:\,|\s)\s*(\d{4})$/);
					if (monthDayYearMatch) {
						const monthStr = monthDayYearMatch[1].toLowerCase();
						const day = parseInt(monthDayYearMatch[2]);
						const year = parseInt(monthDayYearMatch[3]);

						// Find month number
						let monthNum = monthNamesLong.findIndex((m) => monthStr.startsWith(m));
						if (monthNum === -1) {
							monthNum = monthNamesShort.findIndex((m) => monthStr.startsWith(m));
						}

						if (monthNum !== -1) {
							dateObj = new Date(year, monthNum, day);
						}
					}
				}

				// Format: YYYY Mon DD (e.g., "2024 Mar 22")
				if (!dateObj) {
					const yearMonthDayMatch = value.match(/^(\d{4})\s+([A-Za-z]{3,})\s+(\d{1,2})$/);
					if (yearMonthDayMatch) {
						const year = parseInt(yearMonthDayMatch[1]);
						const monthStr = yearMonthDayMatch[2].toLowerCase();
						const day = parseInt(yearMonthDayMatch[3]);

						// Find month number
						let monthNum = monthNamesLong.findIndex((m) => monthStr.startsWith(m));
						if (monthNum === -1) {
							monthNum = monthNamesShort.findIndex((m) => monthStr.startsWith(m));
						}

						if (monthNum !== -1) {
							dateObj = new Date(year, monthNum, day);
						}
					}
				}

				// Format: DD-MMM-YYYY (e.g., "01-Dec-2024")
				if (!dateObj) {
					const ddMmmYyyyMatch = value.match(
						/^(\d{1,2})[\-\s]((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))[\-\s](\d{4})$/i
					);
					if (ddMmmYyyyMatch) {
						const day = parseInt(ddMmmYyyyMatch[1]);
						const monthStr = ddMmmYyyyMatch[2].toLowerCase();
						const year = parseInt(ddMmmYyyyMatch[3]);

						// Find month number
						const monthNum = monthNamesShort.findIndex((m) => monthStr.toLowerCase().startsWith(m));

						if (monthNum !== -1) {
							dateObj = new Date(year, monthNum, day);
						}
					}
				}

				// Format: ddd, DD MMM YYYY (e.g., "Tue, 14 Mar 2023")
				if (!dateObj) {
					const dayOfWeekMatch = value.match(
						/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/i
					);
					if (dayOfWeekMatch) {
						const day = parseInt(dayOfWeekMatch[1]);
						const monthStr = dayOfWeekMatch[2].toLowerCase();
						const year = parseInt(dayOfWeekMatch[3]);

						// Find month number
						const monthNum = monthNamesShort.findIndex((m) => monthStr.startsWith(m));

						if (monthNum !== -1) {
							dateObj = new Date(year, monthNum, day);
						}
					}
				}

				// --- Robust month-year and standalone month parsing ---
				if (!dateObj) {
					// Try: "Month YYYY", "YYYY Month", "Month, YYYY", "YYYY, Month", any order, any punctuation
					const flex =
						value.match(/^\s*([A-Za-z]{3,})\s*[,\.]?\s*(\d{4})\s*$/i) ||
						value.match(/^\s*(\d{4})\s*[,\.]?\s*([A-Za-z]{3,})\s*$/i);

					console.log(
						`DEBUG DATE PARSING [FLEX_MATCH] for '${value}': ${flex ? 'matched' : 'no match'}`
					);

					if (flex) {
						let monthStr, year;
						if (isNaN(Number(flex[1]))) {
							monthStr = flex[1].toLowerCase();
							year = parseInt(flex[2]);
						} else {
							year = parseInt(flex[1]);
							monthStr = flex[2].toLowerCase();
						}

						console.log(
							`DEBUG DATE PARSING [EXTRACTED] for '${value}': month='${monthStr}', year=${year}`
						);

						// More robust month matching
						let monthNum = -1;
						for (let i = 0; i < monthNamesLong.length; i++) {
							if (
								monthStr.startsWith(monthNamesLong[i]) ||
								monthNamesLong[i].startsWith(monthStr)
							) {
								monthNum = i;
								break;
							}
						}

						if (monthNum === -1) {
							for (let i = 0; i < monthNamesShort.length; i++) {
								if (
									monthStr.startsWith(monthNamesShort[i]) ||
									monthNamesShort[i].startsWith(monthStr)
								) {
									monthNum = i;
									break;
								}
							}
						}

						console.log(`DEBUG DATE PARSING [MONTH_NUM] for '${value}': ${monthNum}`);

						if (monthNum !== -1) {
							dateObj = new Date(year, monthNum, 1, 0, 0, 0);
							console.log(
								`DEBUG DATE PARSING [CREATED_DATE] for '${value}': ${dateObj.toISOString()}`
							);
						}
					}
				}

				// Standalone month ("August", "Aug")
				if (!dateObj) {
					const m = value.match(/^\s*([A-Za-z]{3,})\s*$/i);

					console.log(
						`DEBUG DATE PARSING [STANDALONE_MATCH] for '${value}': ${m ? 'matched' : 'no match'}`
					);

					if (m) {
						const monthStr = m[1].toLowerCase();
						const now = new Date();
						const year = now.getFullYear() - 1;

						// More robust month matching
						let monthNum = -1;
						for (let i = 0; i < monthNamesLong.length; i++) {
							if (
								monthStr.startsWith(monthNamesLong[i]) ||
								monthNamesLong[i].startsWith(monthStr)
							) {
								monthNum = i;
								break;
							}
						}

						if (monthNum === -1) {
							for (let i = 0; i < monthNamesShort.length; i++) {
								if (
									monthStr.startsWith(monthNamesShort[i]) ||
									monthNamesShort[i].startsWith(monthStr)
								) {
									monthNum = i;
									break;
								}
							}
						}

						console.log(`DEBUG DATE PARSING [STANDALONE_MONTH_NUM] for '${value}': ${monthNum}`);

						if (monthNum !== -1) {
							dateObj = new Date(year, monthNum, 1, 0, 0, 0);
							console.log(
								`DEBUG DATE PARSING [STANDALONE_DATE] for '${value}': ${dateObj.toISOString()}`
							);
						}
					}
				}
				// --- END robust month-year and standalone month parsing ---

				// If we successfully parsed the date, return as ISO string
				if (dateObj && !isNaN(dateObj.getTime())) {
					return dateObj.toISOString();
				}

				// If we couldn't parse it into a standardized format, return as-is
				console.log(`Date format not standardized: ${value}`);
				return value;
			}
			return value;
		}
		case 'gps':
		case 'latitude':
		case 'longitude': {
			return formatAllGpsTypes(value, format);
		}
		//  POLYGON FORMATTING =========
		// Reuse the lat and lon formatting
		// add begining and end to polygon Type, coordinates - make proper geojson
		// use formatAllGpsTypes from case gps lat lon etc.
		// SO - after return
		case 'polygon': {
		}

		case 'string':
		default:
			return value;
	}
}

function formatAllGpsTypes(
	value: string | number | null,
	format: ColumnFormat
): string | number | null {
	let num: number;
	if (typeof value === 'number') {
		num = value;
	} else if (typeof value === 'string') {
		// For GPS coordinates, we need special handling
		if (format === 'gps' && value.includes(',')) {
			// For full GPS coordinates (lat,long)
			const parts = value.split(',').map((p) => p.trim());
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
		case 'polygon':
			return isPolygon(value);
		default:
			return false;
	}
}
