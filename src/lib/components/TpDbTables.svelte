<script lang="ts">
	import {
		isGps,
		isLatitude,
		isLongitude,
		formatAllGpsTypes,
		formatValue
	} from './formatDetection2';
	import { isColumnNormalizedByLand } from './columnNormalizationUtils';
	import { importedData } from '$lib/components/modelState.svelte';
	

	import DbTableInstance from './DbTableInstance.svelte';

	// Function to pull GPS data for a given row index
	function pullFirstGpsSelected(rowIndex: number): GpsData {
		// First try to find a full GPS coordinate pair
		for (const column of importedData.columns) {
			if (
				column.currentFormat === 'gps' &&
				column.values[rowIndex] !== null &&
				column.values[rowIndex] !== ''
			) {
				const gpsValue = column.values[rowIndex];
				if (isGps(gpsValue)) {
					return { type: 'full', value: String(gpsValue) };
				}
			}
		}

		// Try to find a complete latitude/longitude pair
		let latValue: string | null = null;
		let lonValue: string | null = null;

		// First pass: look for explicit latitude and longitude columns
		for (const column of importedData.columns) {
			const value = column.values[rowIndex];

			if (value === null || value === '') continue;

			// Check for latitude column
			if (column.currentFormat === 'latitude' && !latValue) {
				if (isLatitude(value)) {
					latValue = typeof value === 'number' ? String(value) : value;
				}
			}
			// Check for longitude column
			else if (column.currentFormat === 'longitude' && !lonValue) {
				if (isLongitude(value)) {
					lonValue = typeof value === 'number' ? String(value) : value;
				}
			}
		}

		// If we found both valid lat and lon values, return them
		if (latValue !== null && lonValue !== null) {
			return {
				type: 'pair',
				lat: typeof latValue === 'number' ? String(latValue) : latValue,
				lon: typeof lonValue === 'number' ? String(lonValue) : lonValue
			};
		}

		// If we couldn't find a complete pair of valid coordinates, return null
		return null;
	}
	import { dragColumnState } from '$lib/components/modelState.svelte';
	import type { ColumnFormat } from '$lib/types/columnModel';
	import type { asClassComponent } from 'svelte/legacy';

	const {
		// landUserTable,
		// cropUserTable,
		// plantingUserTable,
		landDbFormat,
		plantingDbFormat,
		cropDbFormat
	} = $props<{
		landUserTable: any[];
		plantingUserTable: any[];
		cropUserTable: any[];
		landDbFormat: Record<string, string>;
		plantingDbFormat: Record<string, string>;
		cropDbFormat: Record<string, string>;
	}>();

	const plantingColumns = [
		'landName', // Show this instead of landId
		'cropName', // Show this instead of cropId
		'planted',
		'plantingDate'
		// ...any other fields you want
	];
	const landColumns = [
		'landName',
		'hectares',
		// 'gpsLat',
		// 'gpsLon',
		'landNotes'
		// "preparation",
		// "polygon",
		// "preparationType",
	];
	const cropColumns = [
		'cropName',
		'speciesId',
		// "species",
		'seed_info',
		'cropStock',
		'cropNotes'
	];

	function clearDbColumn(dbTable: TableColumn[], index: number) {
		// Get the column name and the column index that was mapped
		const columnName = dbTable[index].name;
		const modelRepColumnIndex = dbTable[index].modelRepColumnIndex;

		// Clear the current column
		dbTable[index].values = ['', '', ''];

		if (modelRepColumnIndex !== -1) {
			// Unmap the column in the imported data
			importedData.columns[modelRepColumnIndex].isMapped = false;
			importedData.columns[modelRepColumnIndex].mappedTo = undefined;

			// Clear the current column's mapping
			dbTable[index].modelRepColumnIndex = -1;

			// If this is landName or cropName, also clear it in other tables
			if (columnName === 'landName') {
				// Clear landName in the other table
				if (dbTable === landTable) {
					// Clear in planting table
					const plantingLandNameIndex = plantingTable.findIndex((col) => col.name === 'landName');
					if (plantingLandNameIndex !== -1) {
						plantingTable[plantingLandNameIndex].values = ['', '', ''];
						plantingTable[plantingLandNameIndex].modelRepColumnIndex = -1;
					}
				} else if (dbTable === plantingTable) {
					// Clear in land table
					const landNameIndex = landTable.findIndex((col) => col.name === 'landName');
					if (landNameIndex !== -1) {
						landTable[landNameIndex].values = ['', '', ''];
						landTable[landNameIndex].modelRepColumnIndex = -1;
					}
				}
			} else if (columnName === 'cropName') {
				// Clear cropName in the other table
				if (dbTable === cropTable) {
					// Clear in planting table
					const plantingCropNameIndex = plantingTable.findIndex((col) => col.name === 'cropName');
					if (plantingCropNameIndex !== -1) {
						plantingTable[plantingCropNameIndex].values = ['', '', ''];
						plantingTable[plantingCropNameIndex].modelRepColumnIndex = -1;
					}
				} else if (dbTable === plantingTable) {
					// Clear in crop table
					const cropNameIndex = cropTable.findIndex((col) => col.name === 'cropName');
					if (cropNameIndex !== -1) {
						cropTable[cropNameIndex].values = ['', '', ''];
						cropTable[cropNameIndex].modelRepColumnIndex = -1;
					}
				}
			}
		}

		// Cleared column and related columns
	}

	interface TableColumn {
		name: string;
		values: unknown[]; // Changed from never[] to unknown[]
		modelRepColumnIndex: number;
		viewOnly: boolean;
	}
	let plantingTable = $state<TableColumn[]>(createColumnState(plantingColumns));
	let landTable = $state<TableColumn[]>(createColumnState(landColumns, ['landName']));
	let cropTable = $state<TableColumn[]>(createColumnState(cropColumns, ['cropName']));

	function createColumnState(columns: string[], viewOnlyFields: string[] = []) {
		const result = columns.map((col) => ({
			name: col,
			values: ['', '', ''],
			modelRepColumnIndex: -1,
			viewOnly: viewOnlyFields.includes(col)
		}));
		return result;
	}

	// $inspect(plantingTable);

	function dragoverHandler(ev: DragEvent) {
		// Always prevent default to allow drop
		ev.preventDefault();
		// Set dropEffect to 'copy' to show a copy cursor
		if (ev.dataTransfer) {
			ev.dataTransfer.dropEffect = 'copy';
		}

		// Get the element that triggered the event
		const element = ev.currentTarget as HTMLElement;
		if (element) {
			const columnName = element.dataset.headerName;
			const columnIndex = element.dataset.columnIndex;
		}
	}

	// Helper function to get unique values from a column
	function getUniqueValues(columnIndex: number) {
		if (columnIndex === -1) return [];

		const values = importedData.columns[columnIndex].formattedValues;
		// Create a map to track unique values while preserving their order
		const uniqueMap = new Map();

		values.forEach((value, index) => {
			if (value !== null && value !== undefined && value !== '') {
				// Use the value as the key to ensure uniqueness
				if (!uniqueMap.has(value)) {
					uniqueMap.set(value, index);
				}
			}
		});

		// Return the indices of unique values in their original order
		return Array.from(uniqueMap.values());
	}

	// 18 Apr 2025 9:02 AM  Get state from top table and update local $state here.
	function dropHandler(
		ev: DragEvent,
		dbDropTable: TableColumn[],
		dropFormat: Record<string, string>
	) {
		// Always prevent default to allow drop
		ev.preventDefault();

		if (!ev.dataTransfer) return;

		// Get the dragged column index from dataTransfer
		const draggedColumnIndex = Number(ev.dataTransfer.getData('text') || '-1');
		if (draggedColumnIndex < 0) {
			return; // Invalid dragged column
		}

		// Find the drop target element (th or td) with column index
		// Use currentTarget (the element with the event listener) instead of target (which could be a child element)
		const dropElement = ev.currentTarget as HTMLElement;
		if (!dropElement) return;

		// Get the column index from the drop target
		const targetColumnIndexAttr = dropElement.dataset.columnIndex;
		if (targetColumnIndexAttr === undefined) return; // No column index found

		const targetColumnIndex = Number(targetColumnIndexAttr);
		if (isNaN(targetColumnIndex)) return; // Invalid column index

		// Get the target column name
		const targetColumnName = dbDropTable[targetColumnIndex].name;

		// Identify which table we're dropping on
		let tableName = 'unknown';
		if (dbDropTable === plantingTable) tableName = 'plantingTable';
		if (dbDropTable === landTable) tableName = 'landTable';
		if (dbDropTable === cropTable) tableName = 'cropTable';
		// Don't allow dropping on view-only fields
		if (dbDropTable[targetColumnIndex].viewOnly) {
			// Cannot map to view-only field
			return;
		}
		// Get the dragged column data
		const draggedCol = importedData.columns[draggedColumnIndex];

		// Block drop for Land table if column is not normalized
		if (dbDropTable === landTable) {
			// Always allow the land column itself to be mapped to landName
			if (targetColumnName === 'landName') {
				// Allowing drop to landName
			} else {
				// For other columns in the Land table, check normalization
				const landColIndex =
					landTable.find((col) => col.name === 'landName')?.modelRepColumnIndex ?? -1;
				// If landName isn't mapped yet, don't allow drops to other columns
				if (landColIndex === -1) {
					// Blocked drop: landName not mapped yet
					return;
				}

				const landCol = importedData.columns[landColIndex];
				if (!landCol) {
					// Blocked drop: landCol not found
					return;
				}

				// Skip normalization check if dragging the land column itself
				if (draggedCol.headerName === landCol.headerName) {
					// Allowing drop of land column
				} else {
					// Check normalization
					const isNormalized = isColumnNormalizedByLand(landCol.values, draggedCol.values);

					if (!isNormalized) {
						// Blocked drop: not normalized by land
						return;
					}
				}
			}
		}

		// Block drop for Crop table if column is not normalized
		if (dbDropTable === cropTable) {
			// Always allow the crop column itself to be mapped to cropName
			if (targetColumnName === 'cropName') {
				// Allowing drop to cropName
			} else {
				// For other columns in the Crop table, check normalization
				const cropColIndex =
					cropTable.find((col) => col.name === 'cropName')?.modelRepColumnIndex ?? -1;
				// If cropName isn't mapped yet, don't allow drops to other columns
				if (cropColIndex === -1) {
					// Blocked drop: cropName not mapped yet
					return;
				}

				const cropCol = importedData.columns[cropColIndex];
				if (!cropCol) {
					// Blocked drop: cropCol not found
					return;
				}

				// Skip normalization check if dragging the crop column itself
				if (draggedCol.headerName === cropCol.headerName) {
					// Allowing drop of crop column
				} else {
					// Check normalization
					const isNormalized = isColumnNormalizedByLand(cropCol.values, draggedCol.values);

					if (!isNormalized) {
						// Blocked drop: not normalized by crop
						return;
					}
				}
			}
		}

		// Check format compatibility
		const draggedColumnFormat = draggedCol.currentFormat;
		const targetColumnFormat = dropFormat[targetColumnName];

		// Don't allow dropping on view-only fields
		if (dbDropTable[targetColumnIndex].viewOnly) {
			// Cannot map to view-only field
			return;
		}
		if (draggedColumnFormat !== targetColumnFormat) {
			// Formats do not match
			return;
		}
		if (dbDropTable[targetColumnIndex].modelRepColumnIndex !== -1) {
			importedData.columns[dbDropTable[targetColumnIndex].modelRepColumnIndex].isMapped = false;
			importedData.columns[dbDropTable[targetColumnIndex].modelRepColumnIndex].mappedTo = undefined;
		}
		dbDropTable[targetColumnIndex].modelRepColumnIndex = draggedColumnIndex;
		importedData.columns[draggedColumnIndex].isMapped = true;
		// Add the appropriate table prefix to mappedTo
		let tablePrefix = '';
		if (dbDropTable === plantingTable) tablePrefix = 'planting.';
		if (dbDropTable === landTable) tablePrefix = 'land.';
		if (dbDropTable === cropTable) tablePrefix = 'crop.';

		importedData.columns[draggedColumnIndex].mappedTo = tablePrefix + targetColumnName;

		// Propagate landName and cropName between tables
		if (targetColumnName === 'landName' && dbDropTable === plantingTable) {
			// Find landName in landTable and update it
			const landNameIndex = landTable.findIndex((col) => col.name === 'landName');
			if (landNameIndex !== -1) {
				landTable[landNameIndex].modelRepColumnIndex = draggedColumnIndex;
			}
		} else if (targetColumnName === 'cropName' && dbDropTable === plantingTable) {
			// Find cropName in cropTable and update it
			const cropNameIndex = cropTable.findIndex((col) => col.name === 'cropName');
			if (cropNameIndex !== -1) {
				cropTable[cropNameIndex].modelRepColumnIndex = draggedColumnIndex;
			}
		} else if (targetColumnName === 'landName' && dbDropTable === landTable) {
			// If mapping directly to Land table, also propagate to Planting table
			const plantingLandNameIndex = plantingTable.findIndex((col) => col.name === 'landName');
			if (plantingLandNameIndex !== -1) {
				plantingTable[plantingLandNameIndex].modelRepColumnIndex = draggedColumnIndex;
			}
		} else if (targetColumnName === 'cropName' && dbDropTable === cropTable) {
			// If mapping directly to Crop table, also propagate to Planting table
			const plantingCropNameIndex = plantingTable.findIndex((col) => col.name === 'cropName');
			if (plantingCropNameIndex !== -1) {
				plantingTable[plantingCropNameIndex].modelRepColumnIndex = draggedColumnIndex;
			}
		}
	}

	function plantingDropHandler(ev: DragEvent) {
		// Get the target column name and dragged column index
		const targetColumnName = (ev.currentTarget as HTMLElement)?.getAttribute('data-header-name');
		const draggedColumnIndex = dragColumnState.index;
		// Update both the old plantingTable (for compatibility) and the new DbTableInstance data
		dropHandler(ev, plantingTable, plantingDbFormat);
		// Find the index of the target column in plantingColumns
		if (targetColumnName && draggedColumnIndex !== null) {
			// Find the corresponding column in plantingTable that was just updated
			const updatedColumn = plantingTable.find((col) => col.name === targetColumnName);
			if (updatedColumn) {
				// Also update landTable if this is landName
				if (targetColumnName === 'landName') {
					const landNameIndex = landTable.findIndex((col) => col.name === 'landName');
					if (landNameIndex !== -1) {
						landTable[landNameIndex].modelRepColumnIndex = draggedColumnIndex;
					}
				}
				// Also update cropTable if this is cropName
				if (targetColumnName === 'cropName') {
					const cropNameIndex = cropTable.findIndex((col) => col.name === 'cropName');
					if (cropNameIndex !== -1) {
						cropTable[cropNameIndex].modelRepColumnIndex = draggedColumnIndex;
					}
				}
			}
		}
	}

	function landDropHandler(ev: DragEvent) {
		dropHandler(ev, landTable, landDbFormat);
	}

	// Function to get land ID and polygon ID for a specific row
	function getLandIdForRow(rowIndex: number) {
		// Find the landName column
		const landNameCol = landTable.find((col) => col.name === 'landName');
		if (!landNameCol || landNameCol.modelRepColumnIndex === -1) return null;
		// Get the imported data column that maps to landName
		const importedCol = importedData.columns[landNameCol.modelRepColumnIndex];
		if (!importedCol) return null;
		// Get the land name for this row
		const landName = importedCol.values[rowIndex];
		if (!landName) return null;
		// In a real implementation, you would query the database or check the local state
		// to find the land record with this name and return its ID and polygonId
		// For now, we'll return a placeholder
		return {
			landId: `land-${rowIndex}`, // Placeholder
			polygonId: null // No polygon by default
		};
	}

	function pullFirstPolygonSelected(rowIndex: number) {
		// Try to find a polygon column
		for (const column of importedData.columns) {
			if (
				(column.currentFormat === 'polygon' || column.currentFormat === 'kml') &&
				column.values[rowIndex] !== null &&
				column.values[rowIndex] !== ''
			) {
				const rawPolygonValue = column.values[rowIndex];
				// Format the polygon value using the formatValue function
				const formattedValue = formatValue(column.currentFormat, rawPolygonValue);
				return {
					value: formattedValue || '',
					format: column.currentFormat
				};
			}
		}
		return null;
	}

	function cropDropHandler(ev: DragEvent) {
		dropHandler(ev, cropTable, cropDbFormat);
	}
</script>

<DbTableInstance
	tableColumns={plantingColumns}
	tableState={plantingTable}
	title="Planting Table"
	naturaKey="landName"
	viewOnlyNaturaKey={false}
	{dragoverHandler}
	dropHandler={plantingDropHandler}
	dbFormat={plantingDbFormat}
	{clearDbColumn}
	{getUniqueValues}
	{pullFirstGpsSelected}
	{pullFirstPolygonSelected}
	{getLandIdForRow}
	showGpsAndPolygonCols={false}
/>

<DbTableInstance
	tableColumns={landColumns}
	tableState={landTable}
	title="Land Table"
	naturaKey="landName"
	viewOnlyNaturaKey={true}
	{dragoverHandler}
	dropHandler={landDropHandler}
	dbFormat={landDbFormat}
	{clearDbColumn}
	{getUniqueValues}
	{pullFirstGpsSelected}
	{pullFirstPolygonSelected}
	{getLandIdForRow}
	showGpsAndPolygonCols={true}
/>

<DbTableInstance
	tableColumns={cropColumns}
	tableState={cropTable}
	title="Crop Table"
	naturaKey="cropName"
	viewOnlyNaturaKey={true}
	{dragoverHandler}
	dropHandler={cropDropHandler}
	dbFormat={cropDbFormat}
	{clearDbColumn}
	{getUniqueValues}
	{pullFirstGpsSelected}
	{pullFirstPolygonSelected}
	{getLandIdForRow}
	showGpsAndPolygonCols={false}
/>

<style>
</style>
