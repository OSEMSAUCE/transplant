/**
 * Utility to check normalization of a column relative to land column.
 * A column is normalized if for each unique land value, there is at most one unique attribute value.
 *
 * Example of normalized column (can go in Land table):
 * land_id | attribute
 * -------------------
 * land1   | value1
 * land1   | value1
 * land2   | value2
 *
 * Example of non-normalized column (cannot go in Land table):
 * land_id | attribute
 * -------------------
 * land1   | value1
 * land1   | value2 <-- different value for same land
 * land2   | value3
 */



// isNormalized

/**
 * Returns a CSS class string for conditional cell formatting based on duplication and normalization status.
 * @param isDuplicated - Whether the cell value is duplicated
 * @param isNormalized - Whether the cell/column is normalized
 * @returns A string with the appropriate class name(s) for styling
 */
export function isNormalized(isDuplicated: boolean, isNormalized: boolean): string {
	if (isDuplicated && isNormalized) return 'cell-normalized-duplicated';
	if (isDuplicated) return 'cell-duplicated';
	if (isNormalized) return 'cell-normalized';
	return '';
}



/**
 * Find the land column in the imported data
 * @param columns - Array of column data
 * @returns The land column or undefined if not found
 */
export function findLandColumn(columns: any[]): any {
	// Try different possible names for the land column
	return columns.find(
		(c) =>
			c.headerName?.toLowerCase().includes('land') &&
			!c.headerName?.toLowerCase().includes('holder') &&
			!c.headerName?.toLowerCase().includes('notes')
	);
}

/**
 * Checks if a column is normalized by land
 * @param landCol - Array of land values
 * @param attrCol - Array of attribute values to check
 * @returns true if normalized (one value per land), false otherwise
 */
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
