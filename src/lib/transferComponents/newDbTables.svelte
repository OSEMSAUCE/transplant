<script lang="ts">
	import { isColumnNormalizedByLand, findLandColumn } from './columnNormalizationUtils';
	import { importedData } from '$lib/transferComponents/modelState.svelte';
	import FormatSelectorComponent from './FormatSelectorComponent.svelte';
	import { dragColumnState } from '$lib/transferComponents/modelState.svelte';
	import type { ColumnFormat } from '$lib/types/columnModel';
	import type { asClassComponent } from 'svelte/legacy';

	const {
		// landUserTable,
		// cropUserTable,
		plantingUserTable,
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
		'landHolder',
		'gpsLat',
		'gpsLon',
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
		dbTable[index].values = ['', '', ''];
		importedData.columns[dbTable[index].modelRepColumnIndex].isMapped = false;
		importedData.columns[dbTable[index].modelRepColumnIndex].mappedTo = undefined;
		dbTable[index].modelRepColumnIndex = -1;
		console.log('clicked');
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

	function createColumnState(columns: string[], viewOnlyFields: string[] = []): TableColumn[] {
		return columns.map((col) => ({
			name: col,
			values: ['', '', ''],
			modelRepColumnIndex: -1,
			viewOnly: viewOnlyFields.includes(col)
		}));
	}

	$inspect(plantingTable);

	function dragoverHandler(ev: DragEvent) {
		// Always prevent default to allow drop
		ev.preventDefault();
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
		// Block drop for Land table if column is not normalized
		if (dbDropTable === landTable) {
			const draggedColumnIndex = Number(ev.dataTransfer?.getData('text') || '-1');
			if (draggedColumnIndex >= 0) {
				const draggedCol = importedData.columns[draggedColumnIndex];

				// Always allow the land column itself to be mapped to landName
				const targetColumn = (ev.target as HTMLElement).closest('th');
				if (targetColumn && targetColumn.dataset.headerName === 'landName') {
					console.log(`Allowing drop of ${draggedCol.headerName} to landName`);
				} else {
					// For other columns in the Land table, check normalization
					const landColIndex =
						landTable.find((col) => col.name === 'landName')?.modelRepColumnIndex ?? -1;

					// If landName isn't mapped yet, don't allow drops to other columns
					if (landColIndex === -1) {
						console.log(`Blocked drop: landName not mapped yet`);
						return;
					}

					const landCol = importedData.columns[landColIndex];
					if (!landCol) {
						console.log(`Blocked drop: landCol not found`);
						return;
					}

					// Skip normalization check if dragging the land column itself
					if (draggedCol.headerName === landCol.headerName) {
						console.log(`Allowing drop of land column ${draggedCol.headerName}`);
					} else {
						// Check normalization
						const isNormalized = isColumnNormalizedByLand(landCol.values, draggedCol.values);
						console.log(
							`Drop check: Column ${draggedCol.headerName} normalized by ${landCol.headerName}: ${isNormalized}`
						);

						if (!isNormalized) {
							console.log(
								`Blocked drop of ${draggedCol.headerName}: not normalized by ${landCol.headerName}`
							);
							return;
						}
					}
				}
			}
		}
		if (!ev.dataTransfer || !ev.target) return;
		ev.preventDefault();
		const draggedColumnIndex = Number(ev.dataTransfer.getData('text'));
		const targetColumnIndex = Number((ev.target as HTMLElement).dataset.columnIndex);
		const targetColumnName = dbDropTable[targetColumnIndex].name;

		// Don't allow dropping on view-only fields
		if (dbDropTable[targetColumnIndex].viewOnly) {
			console.log('Cannot map to view-only field');
			return;
		}

		const draggedColumnFormat = importedData.columns[draggedColumnIndex].currentFormat;
		const targetColumnFormat = dropFormat[targetColumnName];
		if (draggedColumnFormat !== targetColumnFormat) {
			console.log('Formats do not match');
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

		// DEBUG: Log the mapping details
		console.log('DEBUG MAPPING:', {
			table: tablePrefix.replace('.', ''),
			columnName: targetColumnName,
			mappedTo: importedData.columns[draggedColumnIndex].mappedTo,
			isPlantingTable: dbDropTable === plantingTable,
			isLandTable: dbDropTable === landTable,
			isCropTable: dbDropTable === cropTable
		});

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

		console.log(
			`Mapped column ${importedData.columns[draggedColumnIndex].headerName} to ${importedData.columns[draggedColumnIndex].mappedTo}`
		);
	}

	function plantingDropHandler(ev: DragEvent) {
		dropHandler(ev, plantingTable, plantingDbFormat);
	}

	function landDropHandler(ev: DragEvent) {
		dropHandler(ev, landTable, landDbFormat);
	}

	function cropDropHandler(ev: DragEvent) {
		dropHandler(ev, cropTable, cropDbFormat);
	}
</script>

<h3 class="table-title">Planting Table</h3>
<table class="no-table-bottom-margin">
	<thead>
		<tr>
			{#each plantingTable as column, index}
				<th
					data-header-name={column.name}
					data-column-index={index}
					ondragover={column.viewOnly ? null : dragoverHandler}
					ondrop={column.viewOnly ? null : plantingDropHandler}
					class:legal-droptarget={!column.viewOnly &&
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
						ondragover={column.viewOnly ? null : dragoverHandler}
						ondrop={column.viewOnly ? null : plantingDropHandler}
						class:legal-droptarget={!column.viewOnly &&
							dragColumnState.currentFormat === plantingDbFormat[column.name] &&
							column.modelRepColumnIndex === -1}
						class:view-only={column.viewOnly}
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

<h3 class="table-title">Land Table</h3>
<table
	class="no-table-bottom-margin land-table"
	class:greyed-out={!landTable.some(
		(col) => col.name === 'landName' && col.modelRepColumnIndex !== -1
	)}
>
	<thead>
		<tr>
			{#each landTable as column, index}
				<th
					data-header-name={column.name}
					data-column-index={index}
					ondragover={dragoverHandler}
					ondrop={(() => {
						// Don't allow drop for view-only columns
						if (column.viewOnly) return null;

						// Land table requires landName to be mapped first (except for landName itself)
						if (
							column.name !== 'landName' &&
							!landTable.some((col) => col.name === 'landName' && col.modelRepColumnIndex !== -1)
						) {
							return null;
						}

						// Use the standard drop handler - normalization is checked inside dropHandler
						return landDropHandler;
					})()}
					class:legal-droptarget={column.name === 'landName'
						? // For landName column, just check basic conditions
							!column.viewOnly &&
							column.modelRepColumnIndex === -1 &&
							dragColumnState.currentFormat === landDbFormat[column.name]
						: // For other columns, check normalization too
							!column.viewOnly &&
							landTable.some((col) => col.name === 'landName' && col.modelRepColumnIndex !== -1) &&
							dragColumnState.currentFormat === landDbFormat[column.name] &&
							column.modelRepColumnIndex === -1 &&
							(() => {
								// If no column is being dragged, not droppable
								if (dragColumnState.index == null) return false;

								// Get the dragged column
								const draggedCol = importedData.columns[dragColumnState.index];

								// For other columns, check normalization
								const landColIndex =
									landTable.find((col) => col.name === 'landName')?.modelRepColumnIndex ?? -1;
								if (landColIndex === -1) return false;

								const landCol = importedData.columns[landColIndex];
								if (!landCol) return false;

								// Always allow the land column itself
								if (draggedCol.headerName === landCol.headerName) return true;

								// Check normalization for all other columns
								const isNormalized = isColumnNormalizedByLand(landCol.values, draggedCol.values);
								console.log(
									`Drop target check: Column ${draggedCol.headerName} to ${column.name} - normalized: ${isNormalized}`
								);
								return isNormalized;
							})()}
					class:view-only={column.viewOnly ||
						(!landTable.some((col) => col.name === 'landName' && col.modelRepColumnIndex !== -1) &&
							column.name !== 'landName')}
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
						{#if !column.viewOnly && (landTable.some((col) => col.name === 'landName' && col.modelRepColumnIndex !== -1) || column.name === 'landName')}
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
					{#each landTable as column, index}
						<td
							data-header-name={column.name}
							data-column-index={index}
							ondragover={column.viewOnly ||
							!landTable.some((col) => col.name === 'landName' && col.modelRepColumnIndex !== -1)
								? null
								: dragoverHandler}
							ondrop={column.viewOnly ||
							!landTable.some((col) => col.name === 'landName' && col.modelRepColumnIndex !== -1)
								? null
								: landDropHandler}
							class:legal-droptarget={column.name === 'landName'
								? // For landName column, just check basic conditions
									!column.viewOnly &&
									column.modelRepColumnIndex === -1 &&
									dragColumnState.currentFormat === landDbFormat[column.name]
								: // For other columns, check normalization too
									!column.viewOnly &&
									landTable.some(
										(col) => col.name === 'landName' && col.modelRepColumnIndex !== -1
									) &&
									dragColumnState.currentFormat === landDbFormat[column.name] &&
									column.modelRepColumnIndex === -1 &&
									(() => {
										// If no column is being dragged, not droppable
										if (dragColumnState.index == null) return false;

										// Get the dragged column
										const draggedCol = importedData.columns[dragColumnState.index];

										// For other columns, check normalization
										const landColIndex =
											landTable.find((col) => col.name === 'landName')?.modelRepColumnIndex ?? -1;
										if (landColIndex === -1) return false;

										const landCol = importedData.columns[landColIndex];
										if (!landCol) return false;

										// Always allow the land column itself
										if (draggedCol.headerName === landCol.headerName) return true;

										// Check normalization for all other columns
										const isNormalized = isColumnNormalizedByLand(
											landCol.values,
											draggedCol.values
										);
										console.log(
											`Cell drop target check: Column ${draggedCol.headerName} to ${column.name} - normalized: ${isNormalized}`
										);
										return isNormalized;
									})()}
							class:view-only={column.viewOnly ||
								(!landTable.some(
									(col) => col.name === 'landName' && col.modelRepColumnIndex !== -1
								) &&
									column.name !== 'landName')}
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
							class:view-only={column.viewOnly || column.name !== 'landName'}
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

<h3 class="table-title">Crop Table</h3>
<table
	class:view-only-table={!cropTable.some(
		(col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1
	)}
>
	<thead>
		<tr>
			{#each cropTable as column, index}
				<th
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
					class:legal-droptarget={!column.viewOnly &&
						cropTable.some((col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1) &&
						dragColumnState.currentFormat === cropDbFormat[column.name] &&
						column.modelRepColumnIndex === -1}
					class:view-only={column.viewOnly ||
						(!cropTable.some((col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1) &&
							column.name !== 'cropName')}
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
							class:legal-droptarget={!column.viewOnly &&
								cropTable.some(
									(col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1
								) &&
								dragColumnState.currentFormat === cropDbFormat[column.name] &&
								column.modelRepColumnIndex === -1}
							class:view-only={column.viewOnly ||
								(!cropTable.some(
									(col) => col.name === 'cropName' && col.modelRepColumnIndex !== -1
								) &&
									column.name !== 'cropName')}
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
							class:legal-droptarget={!column.viewOnly &&
								column.name === 'cropName' &&
								dragColumnState.currentFormat === cropDbFormat[column.name] &&
								column.modelRepColumnIndex === -1}
							class:view-only={column.viewOnly || column.name !== 'cropName'}
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

<!-- Debug Button -->
<div style="margin: 1rem 0;">
	<button
		onclick={() => {
			console.log('DEBUG STATE:');
			console.log('Planting Table:', plantingTable);
			console.log('Land Table:', landTable);
			console.log('Crop Table:', cropTable);
			console.log('Imported Data:', importedData);

			// Check which columns are mapped
			const mappedColumns = importedData.columns.filter((col) => col.isMapped && col.mappedTo);
			console.log('Mapped Columns:', mappedColumns);

			// Check what would be filtered in dbButton.ts
			const landColumns = mappedColumns.filter((col) => col.mappedTo?.startsWith('land.'));
			const cropColumns = mappedColumns.filter((col) => col.mappedTo?.startsWith('crop.'));
			const plantingColumns = mappedColumns.filter((col) => col.mappedTo?.startsWith('planting.'));

			console.log('Land Columns:', landColumns);
			console.log('Crop Columns:', cropColumns);
			console.log('Planting Columns:', plantingColumns);
		}}>Debug Tables</button
	>
</div>

<style>
	.view-only {
		background-color: #808080;
		cursor: not-allowed;
		/* margin-bottom: -1rem; */
	}

	.view-only-table {
		opacity: 0.7;
		background-color: rgba(128, 128, 128, 0.2);
		/* margin-bottom: -1rem; */
	}

	.view-only-table th:not(.legal-droptarget),
	.view-only-table td:not(.legal-droptarget) {
		background-color: #808080;
		cursor: not-allowed;
	}

	.no-table-bottom-margin {
		margin-bottom: 0rem;
	}
</style>
