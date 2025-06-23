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
	}, 0);
}

// 2025-06-23 WE NEED THIS TO GET POLYGON VALUES FROM THE COLUMN
// Find polygon column in importedData
export function findPolygonColumn(): ColumnRep | undefined {
	return importedData.columns.find(col => col.currentFormat === 'polygon');
}

// Get polygon data for a specific land name
export function getPolygonValueForLand(landName: string): string | null {
	const polygonCol = findPolygonColumn();
	if (!polygonCol) return null;
	
	const landCol = importedData.columns.find(col => col.mappedTo === 'land.landName');
	if (!landCol) return null;
	
	const rowIndex = landCol.values.findIndex(value => value === landName);
	if (rowIndex === -1) return null;
	
	return polygonCol.values[rowIndex] as string || null;
}




export function formatGreyedStatus(
	columnData: ColumnRep[],
	index: number,
	detectedFormat: ColumnFormat
) {
	columnData[index].currentFormat = detectedFormat;
	// Set the isFormatted flag to true to indicate this column has been formatted
	columnData[index].isFormatted = true;

	for (let k = 0; k < columnData[index].values.length; ++k) {
		const originalValue = columnData[index].values[k];

		columnData[index].formattedValues[k] = formatValue(detectedFormat, columnData[index].values[k]);

		// Special handling for polygons - don't grey them out if they're detected as polygons
		// even if the formatting failed
		if (detectedFormat === 'polygon') {
			// For polygons, we'll use the original value if formatting returned null
			if (columnData[index].formattedValues[k] === null) {
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
}
