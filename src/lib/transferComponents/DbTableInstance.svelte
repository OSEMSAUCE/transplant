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
    import { dragColumnState } from '$lib/transferComponents/modelState.svelte';
  
	// export let showGpsAndPolygonCols = false;

	// 
	// function showGpsAndPolygonCols() {
	// 	// go get the gps and polygon cols and render them at the beginning of the instance with prop showGpsAndPolygonCols=true 
	// 	return true;
	// }

	const landColumns = [
	{ name: 'landName', label: 'Land Name', modelRepColumnIndex: 0, viewOnly: false },
	{ name: 'hectares', label: 'Hectares', modelRepColumnIndex: 1, viewOnly: false },
	{ name: 'landNotes', label: 'Notes', modelRepColumnIndex: 2, viewOnly: false }
];

	let {
		tableColumns,
		title,
		naturaKey,
		viewOnlyNaturaKey = false,
		dragoverHandler,
		dropHandler,
		dbFormat,
		clearDbColumn,
		getUniqueValues,
		pullFirstGpsSelected,
		pullFirstPolygonSelected,
		getLandIdForRow,
		showGpsAndPolygonCols,
	} = $props();

	// Debug the props
console.log(`DbTableInstance initialized for ${title} with naturaKey:`, naturaKey, 'viewOnlyNaturaKey:', viewOnlyNaturaKey);

// Debug the naturaKey prop
console.log(`DbTableInstance initialized for ${title} with naturaKey:`, naturaKey);
    
    interface TableColumn {
		name: string;
		values: unknown[]; // Changed from never[] to unknown[]
		modelRepColumnIndex: number;
		viewOnly: boolean;
	}


	
	let table = $state<TableColumn[]>(createColumnState(tableColumns, [])); // Don't make naturaKey view-only
	

	function createColumnState(columns: string[], viewOnlyFields: string[] = []): TableColumn[] {
		console.log('Creating column state with columns:', columns);
		console.log('viewOnlyFields:', viewOnlyFields);
		console.log('naturaKey:', naturaKey, 'viewOnlyNaturaKey:', viewOnlyNaturaKey);
		
		const result = columns.map((col) => ({
			name: col,
			values: ['', '', ''],
			modelRepColumnIndex: -1,
			// Make the natural key column view-only if viewOnlyNaturaKey is true
			viewOnly: viewOnlyFields.includes(col) || (viewOnlyNaturaKey && col === naturaKey)
		}));
		console.log(`DbTableInstance (${title}): Created column state with naturaKey=${naturaKey}, viewOnlyNaturaKey=${viewOnlyNaturaKey}:`, result);
		return result;
	}


</script>


<div class="db-table-container">
	<div class="db-table-dashboard">
		<h3 class="table-title">{title}</h3>
		<p>stuff</p>
		<p>more stuff</p>
	</div>
<table
	class="no-table-bottom-margin land-table"
	class:greyed-out={!table.some(
		(col) => col.name === naturaKey && col.modelRepColumnIndex !== -1
	)}
>
	<thead>
		<!-- 🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️ -->
		<tr>
			{#if showGpsAndPolygonCols}
			<!-- The GPS column is always first and separate from the iteration -->
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
			{/if}
				
			<!-- Iterate over table columns -->
			{#each table as column, index}
				<th
					data-header-name={column.name}
					data-column-index={index}
					ondragover={(e) => {
						console.log(`Header dragover for ${title}, column ${column.name}, naturaKey=${naturaKey}`);
						return dragoverHandler(e);
					}}
					ondrop={(() => {
						console.log(`Drop attempt on header for ${title}, column ${column.name}`);
						console.log('naturaKey value:', naturaKey);
						console.log('Is viewOnly:', column.viewOnly);
						console.log('viewOnlyNaturaKey setting:', viewOnlyNaturaKey);
						console.log('Has naturaKey mapped:', table.some((col) => col.name === naturaKey && col.modelRepColumnIndex !== -1));

						// Don't allow drop for view-only columns
						if (column.viewOnly) {
							console.log(`Blocking drop on ${column.name}: column is viewOnly`);
							return null;
						}

						// Table requires naturaKey to be mapped first (except for naturaKey itself)
						if (
							column.name !== naturaKey &&
							!table.some((col) => col.name === naturaKey && col.modelRepColumnIndex !== -1)
						) {
							console.log('Blocking drop: naturaKey not mapped yet and this is not naturaKey column');
							return null;
						}

						// Use the standard drop handler - normalization is checked inside dropHandler
						console.log('Allowing drop, using standard dropHandler');
						return dropHandler;
					})()}
					class:legal-droptarget={column.name === naturaKey
						? // For naturaKey column, just check basic conditions
							!column.viewOnly &&
							column.modelRepColumnIndex === -1 &&
							dragColumnState.currentFormat === dbFormat[column.name]
						: // For other columns, check normalization too
							!column.viewOnly &&
							table.some((col) => col.name === naturaKey && col.modelRepColumnIndex !== -1) &&
							dragColumnState.currentFormat === dbFormat[column.name] &&
							column.modelRepColumnIndex === -1 &&
							(() => {
								// If no column is being dragged, not droppable
								if (dragColumnState.index == null) return false;

								// Get the dragged column
								const draggedCol = importedData.columns[dragColumnState.index];

								// For other columns, check normalization
								const landColIndex =
									table.find((col) => col.name === naturaKey)?.modelRepColumnIndex ?? -1;
								if (landColIndex === -1) return false;

								const landCol = importedData.columns[landColIndex];
								if (!landCol) return false;

								// Always allow the land column itself
								if (draggedCol.headerName === landCol.headerName) return true;

								// Check normalization for all other columns
								const isNormalized = isColumnNormalizedByLand(landCol.values, draggedCol.values);
								return isNormalized;
							})()}
				>
					<div class="column-header">
						<FormatSelectorComponent
							columnData={[]}
							currentFormat={dbFormat[column.name]}
							currentColumnHeader={column.name}
							onformatchange={(event) => {}}
							isTransplant={true}
							isToggled={true}
						/>
						{column.name}
						{#if !column.viewOnly && (table.some((col) => col.name === naturaKey && col.modelRepColumnIndex !== -1) || column.name === naturaKey)}
							<button
								type="button"
								onclick={() => clearDbColumn(table, index)}
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
		{#if table.some((col) => col.name === naturaKey && col.modelRepColumnIndex !== -1)}
			{@const landNameColumn = table.find((col) => col.name === naturaKey)}
			{@const uniqueIndices = getUniqueValues(landNameColumn?.modelRepColumnIndex ?? -1)}
			{#each uniqueIndices.slice(0, 3) as uniqueRowIndex, displayIndex}
			<tr>
<!-- 🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️🔥️ -->
 				{#if showGpsAndPolygonCols}
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
				{/if}
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
									<span
										class="polygon-coordinates"
									
									>
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
				<!-- {/if} -->
				{#each table as column, index}
					<td
						data-header-name={column.name}
						data-column-index={index}
						ondragover={(e) => {
							const hasNaturaKeyMapped = table.some((col) => col.name === naturaKey && col.modelRepColumnIndex !== -1);
							if (column.viewOnly || (column.name === naturaKey && viewOnlyNaturaKey) || (!hasNaturaKeyMapped && column.name !== naturaKey)) {
								return null;
							} else {
								return dragoverHandler(e);
							}
						}}
						ondrop={(e) => {
							const hasNaturaKeyMapped = table.some((col) => col.name === naturaKey && col.modelRepColumnIndex !== -1);
							if (column.viewOnly || (column.name === naturaKey && viewOnlyNaturaKey) || (!hasNaturaKeyMapped && column.name !== naturaKey)) {
								return null;
							} else {
								return dropHandler(e);
							}
						}}
						class:legal-droptarget={column.name === naturaKey
							? !column.viewOnly && column.modelRepColumnIndex === -1 && dragColumnState.currentFormat === dbFormat[column.name]
							: !column.viewOnly && table.some((col) => col.name === naturaKey && col.modelRepColumnIndex !== -1) && dragColumnState.currentFormat === dbFormat[column.name] && column.modelRepColumnIndex === -1 && (() => {
								if (dragColumnState.index == null) return false;
								const draggedCol = importedData.columns[dragColumnState.index];
								const landColIndex = table.find((col) => col.name === naturaKey)?.modelRepColumnIndex ?? -1;
								if (landColIndex === -1) return false;
								const landCol = importedData.columns[landColIndex];
								if (!landCol) return false;
								if (draggedCol.headerName === landCol.headerName) return true;
								const isNormalized = isColumnNormalizedByLand(landCol.values, draggedCol.values);
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
				{#if showGpsAndPolygonCols}
				<!-- <td style="position: relative;"></td>
				<td style="position: relative;"></td> -->
				{/if}
				
				<!-- <td style="position: relative;"></td>
				<td style="position: relative;"></td> -->
				{#each table as column, index}
					<td
						data-header-name={column.name}
						data-column-index={index}
						ondragover={column.viewOnly || column.name !== naturaKey ? null : dragoverHandler}
						ondrop={column.viewOnly || column.name !== naturaKey ? null : dropHandler}
						class:legal-droptarget={!column.viewOnly &&
							column.name === naturaKey &&
							dragColumnState.currentFormat === dbFormat[column.name] &&
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
