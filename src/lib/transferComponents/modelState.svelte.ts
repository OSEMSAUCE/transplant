import type { ColumnRep, ColumnFormat } from '$lib/types/columnModel';
import { formatValue } from './formatDetection2';

// This is the main program state.
export let importedData = $state<{ columns: ColumnRep[] }>({ columns: [] });

// Shared drag state for drag-and-drop operations between tables
export let dragColumnState = $state<{
	headerName: string | null;
	currentFormat: ColumnFormat | null;
	index: number | null;
}>({ headerName: null, currentFormat: null, index: null });

// Force a complete reset of the state when new data is loaded
export function setImportedData(data: ColumnRep[]) {
	// First completely clear out the existing state
	importedData.columns = [];

	// Force a browser reflow to ensure components are properly destroyed
	setTimeout(() => {
		// Then set the new data
		importedData.columns = data;

		// Log state reset for debugging
		console.log(`State reset: Loaded ${data.length} columns with fresh state`);
	}, 0);
}

export function formatGreyedStatus(
	columnData: ColumnRep[],
	index: number,
	detectedFormat: ColumnFormat
) {
	console.log(
		`FORMAT GREYED STATUS - Starting for column '${columnData[index].headerName}' with format ${detectedFormat}`
	);
	columnData[index].currentFormat = detectedFormat;
	// Set the isFormatted flag to true to indicate this column has been formatted
	columnData[index].isFormatted = true;

	for (let k = 0; k < columnData[index].values.length; ++k) {
		const originalValue = columnData[index].values[k];
		console.log(`FORMAT GREYED STATUS - Processing row ${k}, original value:`, originalValue);

		columnData[index].formattedValues[k] = formatValue(detectedFormat, columnData[index].values[k]);
		console.log(`FORMAT GREYED STATUS - Formatted value:`, columnData[index].formattedValues[k]);

		// Special handling for polygons - don't grey them out if they're detected as polygons
		// even if the formatting failed
		if (detectedFormat === 'polygon') {
			// For polygons, we'll use the original value if formatting returned null
			if (columnData[index].formattedValues[k] === null) {
				console.log(
					`FORMAT GREYED STATUS - Polygon formatting returned null, using original value`
				);
				columnData[index].formattedValues[k] = columnData[index].values[k];
				columnData[index].isGreyed[k] = false; // Never grey out polygons
			} else {
				columnData[index].isGreyed[k] = false;
			}
		} else {
			// For non-polygon formats, use the original logic
			columnData[index].isGreyed[k] = columnData[index].formattedValues[k] === null;
		}
	}

	// Log formatting information for debugging
	console.log(
		`FORMAT GREYED STATUS - Completed formatting column '${columnData[index].headerName}' to ${detectedFormat} format`
	);
}
