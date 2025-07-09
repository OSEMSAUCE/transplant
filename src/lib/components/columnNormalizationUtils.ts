

// create a css class for cells that are duplicated in an attribute column.

/**
 * Returns a boolean array indicating which values in the input array are duplicated (appear more than once).
 * @param values - Array of cell values (string | number | null)
 * @returns Boolean array: true if value is duplicated, false otherwise
 */
export function getDuplicatedMask(values: (string | number | null)[]): boolean[] {
	const valueCount = new Map<string | number, number>();
	for (const val of values) {
		if (val === null || val === '') continue;
		valueCount.set(val, (valueCount.get(val) || 0) + 1);
	}
	console.log(values) 
	return values.map(val => (val === null || val === '') ? false : (valueCount.get(val) ?? 0) > 1);
}




// Checks if a column is normalized by land
// @param landCol - Array of land values
// @param attrCol - Array of attribute values to check
// @returns true if normalized (one value per land), false otherwise
export function isColumnNormalizedByLand(
	landCol: (string | number | null)[],
	attrCol: (string | number | null)[]
): boolean {
	if (!landCol || !attrCol || landCol.length !== attrCol.length) return false;

	// Map each land value to a set of its attribute values
	const landToAttr = new Map<string, Set<string>>();

	for (let i = 0; i < landCol.length; i++) {
		const land = landCol[i];
		const attr = attrCol[i];

		// Skip empty values
		if (land == null || land === '') continue;

		// Initialize set for this land if needed
		if (!landToAttr.has(String(land))) {
			landToAttr.set(String(land), new Set());
		}

		// Add attribute value to the set (if not empty)
		if (attr != null && attr !== '') {
			landToAttr.get(String(land))!.add(String(attr));
		}
	}

	// Check if any land has more than one unique attribute value
	for (const [land, attrSet] of landToAttr.entries()) {
		if (attrSet.size > 1) {
			// Removed console.log for cleaner code
			return false;
		}
	}

	return true;
}

/**
 * Determines the compatibility of a column with tables
 * @param landCol - Array of land values
 * @param attrCol - Array of attribute values to check
 * @returns 'land' if compatible with Land table, 'planted' if not, 'both' if no land column
 */
export function getColumnCompatibility(
	landCol: (string | number | null)[],
	attrCol: (string | number | null)[]
): 'land' | 'planted' | 'both' {
	if (!landCol) return 'both';

	const normalized = isColumnNormalizedByLand(landCol, attrCol);
	return normalized ? 'land' : 'planted';
}
