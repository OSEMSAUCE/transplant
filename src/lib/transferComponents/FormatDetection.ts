import type { ColumnFormat } from '../types/columnModel';

// 🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️ This is detection only

// 👍️🌲️👍️🌲️👍️🌲️👍️🌲️👍️🌲️NUMBERS🌲️🌲️🌲️🌲️🌲️🌲️🌲️
// Number detection with debug
export function isNumber(value: any): boolean {
	// Check if value is already a number
	if (typeof value === 'number') {
		return true;
	}

	if (typeof value === 'string') {
		// Remove commas, whitespace, and currency symbols
		const cleaned = value.replace(/[,\s€$£]/g, '').trim();
		// Check if it's a valid number string (including scientific notation)
		return /^-?\d+(\.\d+)?(e-?\d+)?$/.test(cleaned);
	}
	return false;
}

// 🌲️🌲️🌲️🌲️🌲️🌲️🌲️DATES🌲️🌲️🌲️🌲️🌲️🌲️🌲️
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

export function isLatitude(val: string | number): boolean {
	if (val === null || val === undefined || val === '') return false;

	// Handle numeric values
	if (typeof val === 'number') {
		return val >= -90 && val <= 90;
	}

	// Handle string values that are numeric
	if (typeof val === 'string') {
		// Try to parse as decimal degrees
		const num = Number(val);
		if (!isNaN(num)) {
			return num >= -90 && num <= 90;
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

export function isLongitude(val: string | number): boolean {
	if (val === null || val === undefined || val === '') return false;

	// Handle numeric values
	if (typeof val === 'number') {
		return val >= -180 && val <= 180;
	}

	// Handle string values that are numeric
	if (typeof val === 'string') {
		// Try to parse as decimal degrees
		const num = Number(val);
		if (!isNaN(num)) {
			return num >= -180 && num <= 180;
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

/**
 * Parses a DMS (Degrees, Minutes, Seconds) format string into decimal degrees.
 * Handles formats like: 41°24'12.2"N, 2°10'26.5"E
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

/**
 * Detects if a value is a GPS point in decimal degrees (DD) or DMS format.
 * Can detect both combined "lat,lon" strings and individual lat/lon values.
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
	// Reset detected format for new column

	// Comprehensive GPS detection - handles both individual lat/lon columns and combined "lat,lon" strings

	// Case 1: Check for individual lat/lon values
	let individualGpsCount = 0;
	let totalNonNull = 0;
	let isLikelyLatitude = false;
	let isLikelyLongitude = false;
	const lowerHeader = currentColumnHeader.toLowerCase();

	// Use column name as a hint
	if (lowerHeader.includes('lat')) {
		isLikelyLatitude = true;
	} else if (lowerHeader.includes('lon') || lowerHeader.includes('lng')) {
		isLikelyLongitude = true;
	}

	// Count valid GPS values
	for (const val of columnData) {
		if (val === null || val === undefined || val === '') continue;
		totalNonNull++;

		// Check for individual lat/lon values
		if (typeof val === 'number' || !isNaN(Number(val))) {
			const num = typeof val === 'number' ? val : Number(val);

			// If column name suggests it's latitude, check latitude range
			if (isLikelyLatitude && isLatitude(num)) {
				individualGpsCount++;
			}
			// If column name suggests it's longitude, check longitude range
			else if (isLikelyLongitude && isLongitude(num)) {
				individualGpsCount++;
			}
			// If we don't know which it is, accept either range
			else if (!isLikelyLatitude && !isLikelyLongitude && (isLatitude(num) || isLongitude(num))) {
				individualGpsCount++;

				// Try to determine if this is a latitude or longitude column
				if (!isLikelyLatitude && !isLikelyLongitude) {
					// If it's only in latitude range, it's likely latitude
					if (isLatitude(num) && !isLongitude(num)) {
						isLikelyLatitude = true;
					}
					// If it's only in longitude range but outside latitude range, it's likely longitude
					else if (!isLatitude(num) && isLongitude(num)) {
						isLikelyLongitude = true;
					}
				}
			}
		}

		// Check for combined "lat,lon" strings
		if (typeof val === 'string' && val.includes(',')) {
			const regex = /^\s*([+-]?\d{1,3}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)\s*$/;
			const match = val.match(regex);
			if (match) {
				const lat = parseFloat(match[1]);
				const lon = parseFloat(match[2]);
				if (isLatitude(lat) && isLongitude(lon)) {
					individualGpsCount++;
				}
			}
		}
	}

	// If at least 70% of non-null values are valid GPS values
	if (totalNonNull > 0 && individualGpsCount / totalNonNull >= 0.7) {
		// Log helpful debug information
		if (isLikelyLatitude) {
			console.log(`Column ${currentColumnHeader} detected as GPS (latitude component)`);
		} else if (isLikelyLongitude) {
			console.log(`Column ${currentColumnHeader} detected as GPS (longitude component)`);
		} else {
			console.log(
				`Column ${currentColumnHeader} detected as GPS (combined or undetermined component)`
			);
		}
		return 'gps';
	}
	let selectedFormat: ColumnFormat = 'string';
	const sampleValues = columnData
		.filter((val: string | number | null) => val !== null && val !== '')
		.slice(0, 3); // Get first 3 non-empty values
	// console.log('Checking sample values:', sampleValues);
	// Count numbers in sample
	const numberCount = sampleValues.filter(isNumber).length;
	const dateCount = sampleValues.filter(isDate).length;

	// If majority format
	if (dateCount >= Math.ceil(sampleValues.length / 2)) {
		selectedFormat = 'date';
	} else if (numberCount >= Math.ceil(sampleValues.length / 2)) {
		selectedFormat = 'number';
	} else {
		console.log(
			`No majority format - keeping as '${selectedFormat}' (${numberCount} numbers, ${dateCount} dates)`
		);
	}
	return selectedFormat;
}

export function matchesFormat(value: string | number | null, format: ColumnFormat): boolean {
	if (format === 'string') return true;
	if (format === 'number') return isNumber(value);
	if (format === 'date') return isDate(value);
	if (format === 'gps') return isGps(value);
	return false;
}

// 🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️ This is FORMATTING only

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
	return 'Gps:' + value;
}

function formatNumber(value: any): string {
	// return "Number: " + value;
	return new Intl.NumberFormat('en-US', {
		style: 'decimal',
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	}).format(Number(value));
}

function formatString(value: any): string {
	return value;
}

// New GPS format types
export type GpsFormat = 'gps' | 'latitude' | 'longitude';

/**
 * Determines the specific GPS type of a column (full GPS, latitude, or longitude)
 * based on column name and data values.
 */
export function detectGpsType(
	values: Array<string | number | null>,
	columnHeader: string
): GpsFormat | null {
	if (!values || values.length === 0) return null;

	// Check column name for strong indicators
	const header = columnHeader.toLowerCase();
	const isLikelyLatitude = /\b(lat|latitude)\b/i.test(header);
	const isLikelyLongitude = /\b(lon|lng|long|longitude)\b/i.test(header);

	// Count valid values of each type
	let latCount = 0;
	let lonCount = 0;
	let fullGpsCount = 0;
	let totalNonNull = 0;

	// Analyze sample values (up to 10)
	const sampleValues = values.filter((v) => v !== null && v !== '').slice(0, 10);

	for (const val of sampleValues) {
		if (val === null || val === '') continue;
		totalNonNull++;

		// Check for combined GPS format (lat,lon)
		if (typeof val === 'string' && val.includes(',')) {
			// Check decimal degrees format
			const ddRegex = /^\s*([+-]?\d{1,3}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)\s*$/;
			const ddMatch = val.match(ddRegex);

			if (ddMatch) {
				const lat = parseFloat(ddMatch[1]);
				const lon = parseFloat(ddMatch[2]);
				if (isLatitude(lat) && isLongitude(lon)) {
					fullGpsCount++;
					continue;
				}
			}

			// Check DMS format
			const parts = val.split(',').map((part) => part.trim());
			if (parts.length === 2) {
				const latDMS = parseDMS(parts[0]);
				const lonDMS = parseDMS(parts[1]);
				if (latDMS !== null && lonDMS !== null && isLatitude(latDMS) && isLongitude(lonDMS)) {
					fullGpsCount++;
					continue;
				}
			}
		}

		// Check for individual lat/lon values
		if (isLatitude(val) && !isLongitude(val)) {
			latCount++;
		} else if (!isLatitude(val) && isLongitude(val)) {
			lonCount++;
		} else if (isLatitude(val) && isLongitude(val)) {
			// Value is in both ranges, use column name to disambiguate
			if (isLikelyLatitude) {
				latCount++;
			} else if (isLikelyLongitude) {
				lonCount++;
			}
			// If we can't determine, don't count it
		}
	}

	// Determine the most likely type based on counts and column name
	if (totalNonNull > 0) {
		const latRatio = latCount / totalNonNull;
		const lonRatio = lonCount / totalNonNull;
		const fullGpsRatio = fullGpsCount / totalNonNull;

		// If 70% or more values are of a specific type
		if (fullGpsRatio >= 0.7) {
			return 'gps';
		} else if (latRatio >= 0.7 || isLikelyLatitude) {
			return 'latitude';
		} else if (lonRatio >= 0.7 || isLikelyLongitude) {
			return 'longitude';
		}
	}

	return null;
}
