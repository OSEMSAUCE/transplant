import { convertDMSToDecimal, isDMSFormat, convertCoordinatePair } from './dmsConverter';
import { nonBlankValidSampleCount } from './validationSampleCount';

// GPS TYPE 🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️🌎️
export interface GpsCoordinate {
	latitude: number;
	longitude: number;
}

export interface ValidationResult {
	type: 'gps' | 'latitude' | 'longitude' | 'string';
	isValid: boolean;
	formattedValue: string;
}

export type GpsTypes = 'gps' | 'latitude' | 'longitude';

// GPS Detection & Validation
function looksLikeFormattedNumber(value: string): boolean {
	// Check for pattern like 1,234 or 1,234.56 but not like 45,123.456 (too many decimals for typical thousands separator)
	const match = value.trim().match(/^-?\d{1,3}(,\d{3})*(\.\d+)?$/);
	if (!match) return false;

	// If it has decimals, check if there are more than 2 decimal places (typical for currency/quantities)
	const decimals = match[2];
	if (decimals && decimals.length > 3) return false;

	return true;
}

export function parseGpsCoordinate(value: string): GpsCoordinate | null {
	if (!value?.trim()) return null;

	// If the entire value is a single formatted number, it's not a GPS coordinate
	if (looksLikeFormattedNumber(value)) return null;

	// Try to split on comma first
	const parts = value.split(',').map((p) => p.trim());

	if (parts.length === 2) {
		// Try DMS conversion first
		const converted = convertCoordinatePair(value);
		if (converted) {
			const [latStr, lonStr] = converted.split(',').map((p) => p.trim());
			const lat = Number(latStr);
			const lon = Number(lonStr);
			if (!isNaN(lat) && !isNaN(lon) && isValidLatitude(lat) && isValidLongitude(lon)) {
				return { latitude: lat, longitude: lon };
			}
		}

		// If both parts look like formatted numbers, this is probably not a GPS coordinate
		if (parts.every(looksLikeFormattedNumber)) return null;

		// Try to parse as decimal coordinates
		let lat = Number(parts[0]);
		let lon = Number(parts[1]);

		if (!isNaN(lat) && !isNaN(lon) && isValidLatitude(lat) && isValidLongitude(lon)) {
			return { latitude: lat, longitude: lon };
		}
	}

	return null;
}

// Required by TransformManager for GPS type
export function detect(samples: string[]): boolean {
	const nonEmptySamples = samples.filter((s) => s.trim());
	if (nonEmptySamples.length === 0) return true;
	return nonEmptySamples.every((value) => parseGpsCoordinate(value) !== null);
}

export function validate(value: string): boolean {
	return parseGpsCoordinate(value) !== null;
}

// GPS Formatting
export function formatGpsCoordinate(coord: GpsCoordinate | null): string {
	if (!coord) return '';
	return `${coord.latitude.toFixed(6)}, ${coord.longitude.toFixed(6)}`;
}

// LATITUDE AND LONGITUDE 🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️🌐️
// Core validation functions
export function isValidLatitude(value: string | number): boolean {
	if (!value && value !== 0) return false;

	if (typeof value === 'number') {
		return !isNaN(value) && value >= -90 && value <= 90;
	}

	// Try parsing as DMS first
	if (isDMSFormat(value)) {
		const decimal = convertDMSToDecimal(value);
		if (decimal !== null) {
			return decimal >= -90 && decimal <= 90;
		}
	}

	// Fall back to decimal degrees
	const num = Number(value);
	return !isNaN(num) && num >= -90 && num <= 90;
}

export function isValidLongitude(value: string | number): boolean {
	if (!value && value !== 0) return false; // Allow 0 but not empty/null/undefined

	// If it's already a number, validate it directly
	if (typeof value === 'number') {
		return !isNaN(value) && value >= -180 && value <= 180;
	}

	// Try parsing as DMS first
	const dmsValue = parseDMS(value);
	if (dmsValue !== null) {
		return dmsValue >= -180 && dmsValue <= 180;
	}

	// Fall back to decimal degrees
	const num = Number(value);
	return !isNaN(num) && num >= -180 && num <= 180;
}

// Lat/Lon Detection
export function detectCoordinateType(
	header: string,
	samples: string[]
): 'latitude' | 'longitude' | null {
	const headerLower = header.toLowerCase();

	// More flexible patterns that match any string containing l-a-t or l-o-n in that order
	const latPattern = /l.*?a.*?t/;
	const lonPattern = /l.*?o.*?n/;

	const isLatHeader = latPattern.test(headerLower);
	const isLonHeader = lonPattern.test(headerLower);

	if (!isLatHeader && !isLonHeader) return null;

	// Get first N non-empty samples
	const validSamples = samples.filter((s) => s?.trim());
	const samplesToCheck = validSamples.slice(
		0,
		Math.min(nonBlankValidSampleCount, validSamples.length)
	);
	if (!samplesToCheck.length) return null;

	// If any value passes validation, it's definitely that type
	const anyValid = samplesToCheck.some((value) =>
		isLatHeader ? isValidLatitude(value) : isValidLongitude(value)
	);

	if (anyValid) {
		return isLatHeader ? 'latitude' : 'longitude';
	}

	return null;
}

// Auto-detect the type of a column based on header and samples
export function detectType(header: string, samples: string[]): GpsTypes | null {
	console.log(`GPS detectType called for header "${header}" with ${samples.length} samples`);

	// First check if it's a GPS coordinate pair
	const validSamples = samples.filter((s) => s?.trim());
	console.log(`GPS detectType: ${validSamples.length} valid samples`);

	if (!validSamples.length) return null;

	const samplesToCheck = validSamples.slice(
		0,
		Math.min(nonBlankValidSampleCount, validSamples.length)
	);
	console.log(`GPS detectType: Checking ${samplesToCheck.length} samples`);

	// Check if any sample is a valid GPS coordinate pair
	const hasGpsCoordinate = samplesToCheck.some((value) => {
		const result = parseGpsCoordinate(value) !== null;
		console.log(`GPS detectType: Sample "${value}" is GPS coordinate: ${result}`);
		return result;
	});

	if (hasGpsCoordinate) {
		console.log(`GPS detectType: Detected GPS type for "${header}"`);
		return 'gps';
	}

	// Check if it's latitude or longitude - be more aggressive about detection
	const headerLower = header.toLowerCase();
	if (headerLower.includes('lat')) {
		console.log(`GPS detectType: Detected latitude type for "${header}" based on header name`);
		return 'latitude';
	}
	if (headerLower.includes('lon') || headerLower.includes('lng')) {
		console.log(`GPS detectType: Detected longitude type for "${header}" based on header name`);
		return 'longitude';
	}

	// If not found by header, try to detect by value patterns
	const coordinateType = detectCoordinateType(header, samplesToCheck);
	if (coordinateType) {
		console.log(
			`GPS detectType: Detected ${coordinateType} type for "${header}" based on value patterns`
		);
		return coordinateType;
	}

	console.log(`GPS detectType: No GPS type detected for "${header}"`);
	return null;
}

// Clean up coordinate input
function cleanCoordinateString(value: string): string {
	return value
		.trim()
		.replace(/\s+/g, ' ') // normalize spaces
		.replace(/[°˚⁰º]/g, '°') // normalize degree symbols
		.replace(/['′']/g, "'") // normalize minute symbols
		.replace(/["″"]/g, '"') // normalize second symbols
		.replace(/\s*([NSEW])\s*$/i, '$1'); // remove spaces before direction
}

// Parse DMS to decimal degrees
function parseDMS(value: string): number | null {
	const cleaned = cleanCoordinateString(value);

	// Try various patterns from most specific to least
	const patterns = [
		// 48° 51' 24.0" N or 48° 51' 24.0'' N
		/^(-?\d+)\s*°?\s*(\d+)\s*'?\s*(\d+(?:\.\d+)?)\s*(?:''|"|″)?\s*([NSEWnsew])?$/,
		// 48°51'24.0"N or 48°51'24.0''N
		/^(-?\d+)°(\d+)'(\d+(?:\.\d+)?)(?:''|"|″)?([NSEWnsew])?$/,
		// 48 51 24.0 N
		/^(-?\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s*([NSEWnsew])?$/,
		// 48° 51' N
		/^(-?\d+)\s*°?\s*(\d+)\s*'?\s*([NSEWnsew])?$/,
		// 48° N
		/^(-?\d+)\s*°?\s*([NSEWnsew])?$/
	];

	for (const pattern of patterns) {
		const match = cleaned.match(pattern);
		if (match) {
			const degrees = parseFloat(match[1]);
			const minutes = match[2] ? parseFloat(match[2]) : 0;
			const seconds = match[3] ? parseFloat(match[3]) : 0;
			const direction = match[match.length - 1]?.toUpperCase();

			if (minutes >= 60 || seconds >= 60) continue;

			let decimal = degrees + minutes / 60 + seconds / 3600;
			if (direction === 'S' || direction === 'W') {
				decimal = -decimal;
			}

			return decimal;
		}
	}
	return null;
}

// Validate and format a value based on its detected type
export function validateAndFormat(
	header: string,
	value: string
): {
	type: GpsTypes | null;
	isValid: boolean;
	formattedValue: string;
} {
	if (!value?.trim()) {
		return { type: null, isValid: true, formattedValue: value };
	}

	// For GPS coordinate pairs, try the new converter first
	if (value.includes(',')) {
		const converted = convertCoordinatePair(value);
		if (converted) {
			const gpsCoord = parseGpsCoordinate(converted);
			if (gpsCoord) {
				return {
					type: 'gps',
					isValid: true,
					formattedValue: formatGpsCoordinate(gpsCoord)
				};
			}
		}
	}

	// For single coordinates, use existing DMS conversion
	let formattedValue = value;
	if (isDMSFormat(value)) {
		const decimal = convertDMSToDecimal(value);
		if (decimal !== null) {
			formattedValue = decimal.toString();
		}
	}

	// Check if it's latitude or longitude
	const type = detectCoordinateType(header, [formattedValue]);
	if (type) {
		const isValid =
			type === 'latitude' ? isValidLatitude(formattedValue) : isValidLongitude(formattedValue);
		return {
			type,
			isValid,
			formattedValue: isValid ? formattedValue : value
		};
	}

	return { type: null, isValid: true, formattedValue: value };
}

// Type handlers that TransformManager can use
export const latitudeHandler = {
	validate: isValidLatitude,
	format: (value: string) => {
		if (isDMSFormat(value)) {
			const decimal = convertDMSToDecimal(value);
			return decimal !== null ? decimal.toFixed(6) : value;
		}
		return parseFloat(value).toFixed(6);
	},
	detect: (samples: string[], header?: string) =>
		detectCoordinateType(header || '', samples) === 'latitude'
};

export const longitudeHandler = {
	validate: isValidLongitude,
	format: (value: string) => {
		if (isDMSFormat(value)) {
			const decimal = convertDMSToDecimal(value);
			return decimal !== null ? decimal.toFixed(6) : value;
		}
		return parseFloat(value).toFixed(6);
	},
	detect: (samples: string[], header?: string) =>
		detectCoordinateType(header || '', samples) === 'longitude'
};
