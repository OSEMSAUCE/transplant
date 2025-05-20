import type { ColumnFormat } from '../types/columnModel';

// 🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️ This is detection only

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
	const num = typeof val === 'number' ? val : Number(val);
	return !isNaN(num) && num >= -90 && num <= 90;
}

export function isLongitude(val: string | number): boolean {
	const num = typeof val === 'number' ? val : Number(val);
	return !isNaN(num) && num >= -180 && num <= 180;
}

/**
 * Detects if a value is a GPS point in decimal degrees (DD) format.
 * Can detect both combined "lat,lon" strings and individual lat/lon values.
 */
export function isGps(value: any): boolean {
	// Case 1: Individual latitude or longitude value
	if (typeof value === 'number' || !isNaN(Number(value))) {
		const num = typeof value === 'number' ? value : Number(value);
		// We can't determine if it's lat or lon just from the value,
		// so we check if it's in either range
		return (num >= -90 && num <= 90) || (num >= -180 && num <= 180);
	}

	// Case 2: Combined "lat,lon" string
	if (typeof value === 'string') {
		// Basic regex: optional sign, up to 3 digits, optional decimal, must have comma
		const regex = /^\s*([+-]?\d{1,3}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)\s*$/;
		const match = value.match(regex);
		if (match) {
			const lat = parseFloat(match[1]);
			const lon = parseFloat(match[2]);
			return isLatitude(lat) && isLongitude(lon);
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

// 🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️🔉️ This is FORMATTING only

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
