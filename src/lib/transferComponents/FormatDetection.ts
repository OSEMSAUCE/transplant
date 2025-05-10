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

export function isGps(value: any): boolean {
	if (typeof value === 'string') {
		// const parts = value.split(',');
		// if (parts.length === 2) {
		// 	const lat = parts[0].trim();
		// 	const lon = parts[1].trim();
		// 	return isDMSFormat(lat) && isDMSFormat(lon);
		// }
	}
	return false;
}
//  3 Apr 2025  8:55 AM New function
export function detectFormat(
	columnData: Array<string | number | null>,
	currentColumnHeader: string
): ColumnFormat {
	console.log('Checking column format for:', currentColumnHeader);
	// Reset detected format for new column
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


