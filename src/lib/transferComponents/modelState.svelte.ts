import type { ColumnRep, ColumnFormat } from '$lib/types/columnModel';
import { formatValue } from './newFormatDetection';


// This is the main program state. 
export let importedData = $state<{ columns: ColumnRep[] }>({ columns: [] });

// Shared drag state for drag-and-drop operations between tables
export let dragColumnState = $state<{
	headerName: string | null;
	currentFormat: ColumnFormat | null;
	index: number | null;
}>(
	{ headerName: null, currentFormat: null, index: null }
);

// NEW PLAN: formattedData We need this. 24 Apr 2025  8:57 AM
//  open "file:///Users/chri sharris/Pictures/Monosnap/2025-04-24_09-00(1).png"

export function setImportedData(data: ColumnRep[]) {
	importedData.columns = data;
}

export function formatGreyedStatus(columnData: ColumnRep[], index: number, detectedFormat: ColumnFormat) {
	columnData[index].currentFormat = detectedFormat;
	for (let k = 0; k < columnData[index].values.length; ++k) {
		columnData[index].formattedValues[k] = formatValue(detectedFormat, columnData[index].values[k]);
		columnData[index].isGreyed[k] = columnData[index].formattedValues[k] === null;
	}
}