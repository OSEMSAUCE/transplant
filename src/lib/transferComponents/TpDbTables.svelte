<script lang="ts">
	import {
		isGps,
		isLatitude,
		isLongitude,
		formatAllGpsTypes,
		formatValue
	} from './formatDetection2';
	import { isColumnNormalizedByLand, findLandColumn } from './columnNormalizationUtils';
	import { importedData } from '$lib/transferComponents/modelState.svelte';
	import FormatSelectorComponent from './FormatSelectorComponent.svelte';

	import DbTableInstance from './DbTableInstance.svelte';

	type GpsData =
		| { type: 'full'; value: string }
		| { type: 'pair'; lat: string; lon: string }
		| null;

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
	import { dragColumnState } from '$lib/transferComponents/modelState.svelte';
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

	console.log('Creating plantingTable with columns:', plantingColumns);
	let plantingTable = $state<TableColumn[]>(createColumnState(plantingColumns));
	console.log('Initial plantingTable state:', plantingTable);
	let landTable = $state<TableColumn[]>(createColumnState(landColumns, ['landName']));
	let cropTable = $state<TableColumn[]>(createColumnState(cropColumns, ['cropName']));

	function createColumnState(columns: string[], viewOnlyFields: string[] = []) {
		const result = columns.map((col) => ({
			name: col,
			values: ['', '', ''],
			modelRepColumnIndex: -1,
			viewOnly: viewOnlyFields.includes(col)
		}));
		console.log(`createColumnState for [${columns.join(', ')}] created:`, result);
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
			console.log('Dragover on column:', columnName, 'index:', columnIndex);
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
		console.log('Drop event - draggedColumnIndex:', draggedColumnIndex);
		if (draggedColumnIndex < 0) {
			console.log('Invalid dragged column index, aborting drop');
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

		console.log(
			`Drop target: ${tableName}, column: ${targetColumnName}, index: ${targetColumnIndex}`
		);

		// Don't allow dropping on view-only fields
		if (dbDropTable[targetColumnIndex].viewOnly) {
			console.log('Target is view-only, aborting drop');
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
		console.log(
			`Setting ${tableName}[${targetColumnIndex}].modelRepColumnIndex from ${dbDropTable[targetColumnIndex].modelRepColumnIndex} to ${draggedColumnIndex}`
		);
		dbDropTable[targetColumnIndex].modelRepColumnIndex = draggedColumnIndex;
		importedData.columns[draggedColumnIndex].isMapped = true;
		console.log(
			`Column mapping updated: ${targetColumnName} in ${tableName} now maps to importedData.columns[${draggedColumnIndex}]`
		);

		// Add the appropriate table prefix to mappedTo
		let tablePrefix = '';
		if (dbDropTable === plantingTable) tablePrefix = 'planting.';
		if (dbDropTable === landTable) tablePrefix = 'land.';
		if (dbDropTable === cropTable) tablePrefix = 'crop.';

		importedData.columns[draggedColumnIndex].mappedTo = tablePrefix + targetColumnName;

		// Propagate landName and cropName between tables
		if (targetColumnName === 'landName' && dbDropTable === plantingTable) {
			console.log('Mapping landName in plantingTable, draggedColumnIndex:', draggedColumnIndex);
			// Find landName in landTable and update it
			const landNameIndex = landTable.findIndex((col) => col.name === 'landName');
			console.log('landNameIndex in landTable:', landNameIndex);
			if (landNameIndex !== -1) {
				console.log('Setting landTable[landNameIndex].modelRepColumnIndex to', draggedColumnIndex);
				landTable[landNameIndex].modelRepColumnIndex = draggedColumnIndex;
				console.log(
					'landTable after update:',
					landTable.map((col) => ({ name: col.name, modelRepColumnIndex: col.modelRepColumnIndex }))
				);
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

		// Column mapping completed
	}

	function plantingDropHandler(ev: DragEvent) {
		console.log('plantingDropHandler called');
		console.log(
			'plantingTable before:',
			plantingTable.map((col) => ({ name: col.name, modelRepColumnIndex: col.modelRepColumnIndex }))
		);

		// Get the target column name and dragged column index
		const targetColumnName = (ev.currentTarget as HTMLElement)?.getAttribute('data-header-name');
		const draggedColumnIndex = dragColumnState.index;

		console.log(
			`Drop on plantingColumns - target: ${targetColumnName}, dragged index: ${draggedColumnIndex}`
		);

		// Update both the old plantingTable (for compatibility) and the new DbTableInstance data
		dropHandler(ev, plantingTable, plantingDbFormat);

		// Find the index of the target column in plantingColumns
		if (targetColumnName && draggedColumnIndex !== null) {
			// Find the corresponding column in plantingTable that was just updated
			const updatedColumn = plantingTable.find((col) => col.name === targetColumnName);

			if (updatedColumn) {
				console.log(
					`Column ${targetColumnName} updated in plantingTable with modelRepColumnIndex: ${updatedColumn.modelRepColumnIndex}`
				);

				// Also update landTable if this is landName
				if (targetColumnName === 'landName') {
					const landNameIndex = landTable.findIndex((col) => col.name === 'landName');
					if (landNameIndex !== -1) {
						landTable[landNameIndex].modelRepColumnIndex = draggedColumnIndex;
						console.log(
							`Updated landTable[${landNameIndex}].modelRepColumnIndex to ${draggedColumnIndex}`
						);
					}
				}

				// Also update cropTable if this is cropName
				if (targetColumnName === 'cropName') {
					const cropNameIndex = cropTable.findIndex((col) => col.name === 'cropName');
					if (cropNameIndex !== -1) {
						cropTable[cropNameIndex].modelRepColumnIndex = draggedColumnIndex;
						console.log(
							`Updated cropTable[${cropNameIndex}].modelRepColumnIndex to ${draggedColumnIndex}`
						);
					}
				}
			}
		}

		console.log(
			'plantingTable after:',
			plantingTable.map((col) => ({ name: col.name, modelRepColumnIndex: col.modelRepColumnIndex }))
		);
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
					value: formattedValue || 'Polygon',
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

<!-- <dir style="border: 1px solid #ccc; padding: 0rem"> -->
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
<!-- </dir> -->

<div class="db-table-container">
	<div class="db-table-dashboard">
		<h3 class="table-title">Planting Table OLD</h3>
		<p>stuff</p>
		<p>more stuff</p>
	</div>
	<table class="no-table-bottom-border planting-table" class:greyed-out={false}>
		<thead>
			<tr>
				{#each plantingTable as column, index}
					<th
						data-header-name={column.name}
						data-column-index={index}
						ondragover={dragoverHandler}
						ondrop={(() => {
							// Don't allow drop for view-only columns
							if (column.viewOnly) return null;

							// Planting table requires landName and cropName to be mapped first (except for those columns themselves)
							if (
								column.name !== 'landName' &&
								column.name !== 'cropName' &&
								!plantingTable.some(
									(col) => col.name === 'landName' && col.modelRepColumnIndex !== -1
								)
							) {
								return null;
							}

							// Use the standard drop handler - normalization is checked inside dropHandler
							return plantingDropHandler;
						})()}
						class:legal-droptarget={column.name === 'landName' || column.name === 'cropName'
							? // For key columns, just check basic conditions
								!column.viewOnly &&
								column.modelRepColumnIndex === -1 &&
								dragColumnState.currentFormat === plantingDbFormat[column.name]
							: // For other columns, check that landName is mapped
								!column.viewOnly &&
								plantingTable.some(
									(col) => col.name === 'landName' && col.modelRepColumnIndex !== -1
								) &&
								dragColumnState.currentFormat === plantingDbFormat[column.name] &&
								column.modelRepColumnIndex === -1}
					>
						<div class="column-header">
							<FormatSelectorComponent
								columnData={[]}
								currentFormat={plantingDbFormat[column.name]}
								currentColumnHeader={column.name}
								onformatchange={(event) => {}}
								isTransplant={true}
								isToggled={true}
							/>
							{column.name}
							{#if !column.viewOnly}
								<button
									type="button"
									onclick={() => clearDbColumn(plantingTable, index)}
									class="material-symbols-outlined"
									aria-label="Clear column">cancel</button
								>
							{/if}
						</div>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each importedData.columns[0].values.slice(0, 3) as _, rowIndex}
				<tr>
					{#each plantingTable as column, index}
						<td
							data-header-name={column.name}
							data-column-index={index}
							ondragover={column.viewOnly ||
							!(
								column.name === 'landName' ||
								column.name === 'cropName' ||
								plantingTable.some(
									(col) => col.name === 'landName' && col.modelRepColumnIndex !== -1
								)
							)
								? null
								: dragoverHandler}
							ondrop={column.viewOnly ||
							!(
								column.name === 'landName' ||
								column.name === 'cropName' ||
								plantingTable.some(
									(col) => col.name === 'landName' && col.modelRepColumnIndex !== -1
								)
							)
								? null
								: plantingDropHandler}
							class:legal-droptarget={column.name === 'landName' || column.name === 'cropName'
								? // For key columns, just check basic conditions
									!column.viewOnly &&
									column.modelRepColumnIndex === -1 &&
									dragColumnState.currentFormat === plantingDbFormat[column.name]
								: // For other columns, check that landName is mapped
									!column.viewOnly &&
									plantingTable.some(
										(col) => col.name === 'landName' && col.modelRepColumnIndex !== -1
									) &&
									dragColumnState.currentFormat === plantingDbFormat[column.name] &&
									column.modelRepColumnIndex === -1}
						>
							{#if column.modelRepColumnIndex !== -1}
								{importedData.columns[column.modelRepColumnIndex].formattedValues[rowIndex]}
							{:else}
								{''}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<div class="db-table-container">
	<div class="db-table-dashboard">
		<h3 class="table-title">Land Table OLD</h3>
		<p>stuff</p>
		<p>more stuff</p>
	</div>
	<table
		class="no-table-bottom-border land-table"
		class:greyed-out={!landTable.some(
			(col) => col.name === 'landName' && col.modelRepColumnIndex !== -1
		)}
	>
		<thead>
			<tr>
				<th class="gps-column">
					<div class="column-header">
						<span class="format-label">GPS</span>
					</div>
					<div class="header-name"></div>
				</th>
				<!-- The Polygon column is second and separate from the iteration -->
				<th class="polygon-column">
					<div class="column-header">
						<span class="format-label">Polygon</span>
					</div>
					<div class="header-name"></div>
				</th>
				<!-- Iterate over land table columns -->
				{#each landTable as column, index}
					<th
						data-header-name={column.name}
						data-column-index={index}
						ondragover={dragoverHandler}
						ondrop={(() => {
							// Don't allow drop for view-only columns
							if (column.viewOnly) return null;

							// Planting-style: Always allow drop on landName, require landName mapped for others
							if (
								column.name !== 'landName' &&
								!landTable.some((col) => col.name === 'landName' && col.modelRepColumnIndex !== -1)
							) {
								return null;
							}

							return landDropHandler;
						})()}
						class:legal-droptarget={column.name === 'landName'
							? // For key column, just check basic conditions
								!column.viewOnly &&
								column.modelRepColumnIndex === -1 &&
								dragColumnState.currentFormat === landDbFormat[column.name]
							: // For other columns, check that landName is mapped
								!column.viewOnly &&
								landTable.some(
									(col) => col.name === 'landName' && col.modelRepColumnIndex !== -1
								) &&
								dragColumnState.currentFormat === landDbFormat[column.name] &&
								column.modelRepColumnIndex === -1}
					>
						<div class="column-header">
							<FormatSelectorComponent
								columnData={[]}
								currentFormat={landDbFormat[column.name]}
								currentColumnHeader={column.name}
								onformatchange={(event) => {}}
								isTransplant={true}
								isToggled={true}
							/>
							{column.name}
							{#if !column.viewOnly}
								<button
									type="button"
									onclick={() => clearDbColumn(landTable, index)}
									class="material-symbols-outlined"
									aria-label="Clear column">cancel</button
								>
							{/if}
						</div>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#if landTable.some((col) => col.name === 'landName' && col.modelRepColumnIndex !== -1)}
				{@const landNameColumn = landTable.find((col) => col.name === 'landName')}
				{@const uniqueIndices = getUniqueValues(landNameColumn?.modelRepColumnIndex ?? -1)}
				{#each uniqueIndices.slice(0, 3) as uniqueRowIndex, displayIndex}
					<tr>
						<!-- GPS column cell is always first -->
						<td style="position: relative; padding: 8px;">
							{#key uniqueRowIndex}
								{@const gpsResult = pullFirstGpsSelected(uniqueRowIndex)}
								{#if gpsResult}
									<span class="gps-coordinates">
										{#if gpsResult.type === 'full'}
											{@const formattedGps = formatAllGpsTypes(gpsResult.value, 'gps')}
											{formattedGps}
										{:else if gpsResult.type === 'pair'}
											{@const formattedGps = formatAllGpsTypes(gpsResult.value, 'gps')}
											{formattedGps}
										{/if}
									</span>
								{/if}
							{/key}
						</td>
						<!-- Polygon column cell is second -->
						<td style="position: relative; padding: 4px;">
							<div
								class="polygon-cell"
								style="display: flex; justify-content: center; width: 100%; margin: 0;"
							>
								{#key uniqueRowIndex}
									{@const landId = getLandIdForRow(uniqueRowIndex)}
									{@const gpsResult = pullFirstGpsSelected(uniqueRowIndex)}
									{@const polygonData = pullFirstPolygonSelected(uniqueRowIndex)}
									{#if landId && landId.polygonId}
										<span>Polygon ID: {landId.polygonId}</span>
									{:else if polygonData}
										<span class="polygon-coordinates">
											{polygonData.value}
										</span>
									{:else if gpsResult}
										<span class="polygon-placeholder">
											<span class="material-symbols-outlined">crop_square</span>
										</span>
									{/if}
								{/key}
							</div>
						</td>
						{#each landTable as column, index}
							<td
								data-header-name={column.name}
								data-column-index={index}
								ondragover={column.viewOnly ||
								!(
									column.name === 'landName' ||
									landTable.some((col) => col.name === 'landName' && col.modelRepColumnIndex !== -1)
								)
									? null
									: dragoverHandler}
								ondrop={column.viewOnly ||
								!(
									column.name === 'landName' ||
									landTable.some((col) => col.name === 'landName' && col.modelRepColumnIndex !== -1)
								)
									? null
									: landDropHandler}
								class:legal-droptarget={column.name === 'landName'
									? // For landName column, just check basic conditions
										!column.viewOnly &&
										column.modelRepColumnIndex === -1 &&
										dragColumnState.currentFormat === landDbFormat[column.name]
									: // For other columns, check that landName is mapped
										!column.viewOnly &&
										landTable.some(
											(col) => col.name === 'landName' && col.modelRepColumnIndex !== -1
										) &&
										dragColumnState.currentFormat === landDbFormat[column.name] &&
										column.modelRepColumnIndex === -1}
							>
								{#if column.modelRepColumnIndex !== -1}
									{importedData.columns[column.modelRepColumnIndex].formattedValues[uniqueRowIndex]}
								{:else}
									{''}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			{:else}
				{#each importedData.columns[0].values.slice(0, 3) as _, rowIndex}
					<tr>
						<td style="position: relative;"></td>
						<td style="position: relative;"></td>
						{#each landTable as column, index}
							<td
								data-header-name={column.name}
								data-column-index={index}
								ondragover={column.viewOnly || column.name !== 'landName' ? null : dragoverHandler}
								ondrop={column.viewOnly || column.name !== 'landName' ? null : landDropHandler}
								class:legal-droptarget={!column.viewOnly &&
									column.name === 'landName' &&
									dragColumnState.currentFormat === landDbFormat[column.name] &&
									column.modelRepColumnIndex === -1}
							>
								{#if column.modelRepColumnIndex !== -1}
									{importedData.columns[column.modelRepColumnIndex].formattedValues[rowIndex]}
								{:else}
									{''}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>

<div class="db-table-container">
	<div class="db-table-dashboard">
		<h3 class="table-title">Crop Table OLD</h3>
		<p>stuff</p>
		<p>more stuff</p>
	</div>
	<table
		class="no-table-bottom-border crop-table"
		class:greyed-out={!cropTable.some(
			(col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1
		)}
	>
		<thead>
			<tr>
				{#each cropTable as column, index}
					<th
						data-header-name={column.name}
						data-column-index={index}
						ondragover={dragoverHandler}
						ondrop={(() => {
							// Don't allow drop for view-only columns
							if (column.viewOnly) return null;

							// Crop table requires cropName to be mapped first (except for cropName itself)
							if (
								column.name !== 'cropName' &&
								!cropTable.some((col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1)
							) {
								return null;
							}

							// Use the standard drop handler - normalization is checked inside dropHandler
							return cropDropHandler;
						})()}
						class:legal-droptarget={column.name === 'cropName'
							? // For cropName column, just check basic conditions
								!column.viewOnly &&
								column.modelRepColumnIndex === -1 &&
								dragColumnState.currentFormat === cropDbFormat[column.name]
							: // For other columns, check normalization too
								!column.viewOnly &&
								cropTable.some(
									(col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1
								) &&
								dragColumnState.currentFormat === cropDbFormat[column.name] &&
								column.modelRepColumnIndex === -1 &&
								(() => {
									// If no column is being dragged, not droppable
									if (dragColumnState.index == null) return false;

									// Get the dragged column
									const draggedCol = importedData.columns[dragColumnState.index];

									// For other columns, check normalization
									const cropColIndex =
										cropTable.find((col) => col.name === 'cropName')?.modelRepColumnIndex ?? -1;
									if (cropColIndex === -1) return false;

									const cropCol = importedData.columns[cropColIndex];
									if (!cropCol) return false;

									// Always allow the crop column itself
									if (draggedCol.headerName === cropCol.headerName) return true;

									// Check normalization for all other columns
									const isNormalized = isColumnNormalizedByLand(cropCol.values, draggedCol.values);
									return isNormalized;
								})()}
					>
						<div class="column-header">
							<FormatSelectorComponent
								columnData={[]}
								currentFormat={cropDbFormat[column.name]}
								currentColumnHeader={column.name}
								onformatchange={(event) => {}}
								isTransplant={true}
								isToggled={true}
							/>
							{column.name}
							{#if !column.viewOnly && (cropTable.some((col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1) || column.name === 'cropName')}
								<button
									type="button"
									onclick={() => clearDbColumn(cropTable, index)}
									class="material-symbols-outlined"
									aria-label="Clear column">cancel</button
								>
							{/if}
						</div>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#if cropTable.some((col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1)}
				{@const cropNameColumn = cropTable.find((col) => col.name === 'cropName')}
				{@const uniqueIndices = getUniqueValues(cropNameColumn?.modelRepColumnIndex ?? -1)}
				{#each uniqueIndices.slice(0, 3) as uniqueRowIndex, displayIndex}
					<tr>
						{#each cropTable as column, index}
							<td
								data-header-name={column.name}
								data-column-index={index}
								ondragover={column.viewOnly ||
								!cropTable.some((col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1)
									? null
									: dragoverHandler}
								ondrop={column.viewOnly ||
								!cropTable.some((col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1)
									? null
									: cropDropHandler}
								class:legal-droptarget={column.name === 'cropName'
									? // For cropName column, just check basic conditions
										!column.viewOnly &&
										column.modelRepColumnIndex === -1 &&
										dragColumnState.currentFormat === cropDbFormat[column.name]
									: // For other columns, check normalization too
										!column.viewOnly &&
										cropTable.some(
											(col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1
										) &&
										dragColumnState.currentFormat === cropDbFormat[column.name] &&
										column.modelRepColumnIndex === -1 &&
										(() => {
											// If no column is being dragged, not droppable
											if (dragColumnState.index == null) return false;

											// Get the dragged column
											const draggedCol = importedData.columns[dragColumnState.index];

											// For other columns, check normalization
											const cropColIndex =
												cropTable.find((col) => col.name === 'cropName')?.modelRepColumnIndex ?? -1;
											if (cropColIndex === -1) return false;

											const cropCol = importedData.columns[cropColIndex];
											if (!cropCol) return false;

											// Always allow the crop column itself
											if (draggedCol.headerName === cropCol.headerName) return true;

											// Check normalization for all other columns
											const isNormalized = isColumnNormalizedByLand(
												cropCol.values,
												draggedCol.values
											);
											return isNormalized;
										})()}
							>
								{#if column.modelRepColumnIndex !== -1}
									{importedData.columns[column.modelRepColumnIndex].formattedValues[uniqueRowIndex]}
								{:else}
									{''}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			{:else}
				{#each importedData.columns[0].values.slice(0, 3) as _, rowIndex}
					<tr>
						{#each cropTable as column, index}
							<td
								data-header-name={column.name}
								data-column-index={index}
								ondragover={column.viewOnly || column.name !== 'cropName' ? null : dragoverHandler}
								ondrop={column.viewOnly || column.name !== 'cropName' ? null : cropDropHandler}
								class:legal-droptarget={column.name === 'cropName' &&
									!column.viewOnly &&
									dragColumnState.currentFormat === cropDbFormat[column.name] &&
									column.modelRepColumnIndex === -1}
							>
								{#if column.modelRepColumnIndex !== -1}
									{importedData.columns[column.modelRepColumnIndex].formattedValues[rowIndex]}
								{:else}
									{''}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>

<style>
</style>
