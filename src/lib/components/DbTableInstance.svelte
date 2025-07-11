<script lang="ts">
	import { isGps, isLongitude, formatAllGpsTypes, formatValue } from './formatDetection2';
	import { isColumnNormalizedByLand } from './columnNormalizationUtils';
	import { importedData } from '$lib/components/modelState.svelte';
	import FormatSelectorComponent from './FormatSelectorComponent.svelte';
	import { dragColumnState } from '$lib/components/modelState.svelte';
	import GpsColumn from './GpsColumn.svelte';

	const landColumns = [
		{ name: 'landName', label: 'Land Name', modelRepColumnIndex: 0, viewOnly: false },
		{ name: 'hectares', label: 'Hectares', modelRepColumnIndex: 1, viewOnly: false },
		{ name: 'landNotes', label: 'Notes', modelRepColumnIndex: 2, viewOnly: false }
	];

	let {
		tableColumns,
		tableState = null, // New prop to allow parent to pass and bind to table state
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
		showGpsAndPolygonCols
	} = $props();

	interface TableColumn {
		name: string;
		values: unknown[]; // Changed from never[] to unknown[]
		modelRepColumnIndex: number;
		viewOnly: boolean;
	}

	// Use the passed tableState if available, otherwise create a new one
	let table = $state<TableColumn[]>(tableState || createColumnState(tableColumns, []));

	// We're now handling polygons directly in the column structure
	// No need for special polygon data collection

	function createColumnState(columns: string[], viewOnlyFields: string[] = []): TableColumn[] {
		const result = columns.map((col) => ({
			name: col,
			values: ['', '', ''],
			modelRepColumnIndex: -1,
			// Make the natural key column view-only if viewOnlyNaturaKey is true
			viewOnly: viewOnlyFields.includes(col) || (viewOnlyNaturaKey && col === naturaKey)
		}));
		return result;
	}

	// We're now handling polygons directly in the column structure
	// No need for special polygon data collection functions
</script>

<table
	class="no-table-bottom-margin land-table"
	class:greyed-out={!table.some((col) => col.name === naturaKey && col.modelRepColumnIndex !== -1)}
>
	<thead>
		<tr>
			<th class="extra-column">{title}</th>
			<!-- 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️  -->
			{#if showGpsAndPolygonCols}
				<GpsColumn header />
				<th class="polygon-column">
					<div class="column-header">
						<span class="format-label">Polygon</span>
					</div>
				</th>
			{/if}
			<!-- 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️  -->

			<!-- Iterate over table columns -->
			{#each table as column, index}
				<th
					class={'col-' + column.name}
					data-header-name={column.name}
					data-column-index={index}
					ondragover={(e) => {
						return dragoverHandler(e);
					}}
					ondrop={(() => {
						// Don't allow drop for view-only columns
						if (column.viewOnly) {
							return null;
						}

						// Table requires naturaKey to be mapped first (except for naturaKey itself)
						if (
							column.name !== naturaKey &&
							!table.some((col) => col.name === naturaKey && col.modelRepColumnIndex !== -1)
						) {
							return null;
						}

						// Use the standard drop handler - normalization is checked inside dropHandler
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
					<td class="extra-column">more data</td>
					{#if showGpsAndPolygonCols}
						<GpsColumn rowIndex={uniqueRowIndex} />
						{@const landId = getLandIdForRow(uniqueRowIndex)}
						{@const polygonData = pullFirstPolygonSelected(uniqueRowIndex)}
						<td class="polygon-column">
							<div class="polygon-cell centered-cell-content">
								{#if landId && landId.polygonId}
									<span>Polygon ID: {landId.polygonId}</span>
								{:else if polygonData}
									<span class="polygon-coordinates">
										{polygonData.value}
									</span>
								{:else}
									<span class="polygon-placeholder">
										<span class="material-symbols-outlined"></span>
									</span>
								{/if}
							</div>
						</td>
					{/if}
					<!-- 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️  -->
					{#each table as column, index}
						<td
							class={'col-' + column.name}
							data-header-name={column.name}
							data-column-index={index}
							ondragover={(e) => {
								const hasNaturaKeyMapped = table.some(
									(col) => col.name === naturaKey && col.modelRepColumnIndex !== -1
								);
								if (
									column.viewOnly ||
									(column.name === naturaKey && viewOnlyNaturaKey) ||
									(!hasNaturaKeyMapped && column.name !== naturaKey)
								) {
									return null;
								} else {
									return dragoverHandler(e);
								}
							}}
							ondrop={(e) => {
								const hasNaturaKeyMapped = table.some(
									(col) => col.name === naturaKey && col.modelRepColumnIndex !== -1
								);
								if (
									column.viewOnly ||
									(column.name === naturaKey && viewOnlyNaturaKey) ||
									(!hasNaturaKeyMapped && column.name !== naturaKey)
								) {
									return null;
								} else {
									return dropHandler(e);
								}
							}}
							class:legal-droptarget={column.name === naturaKey
								? !column.viewOnly &&
									column.modelRepColumnIndex === -1 &&
									dragColumnState.currentFormat === dbFormat[column.name]
								: !column.viewOnly &&
									table.some((col) => col.name === naturaKey && col.modelRepColumnIndex !== -1) &&
									dragColumnState.currentFormat === dbFormat[column.name] &&
									column.modelRepColumnIndex === -1 &&
									(() => {
										if (dragColumnState.index == null) return false;
										const draggedCol = importedData.columns[dragColumnState.index];
										const landColIndex =
											table.find((col) => col.name === naturaKey)?.modelRepColumnIndex ?? -1;
										if (landColIndex === -1) return false;
										const landCol = importedData.columns[landColIndex];
										if (!landCol) return false;
										if (draggedCol.headerName === landCol.headerName) return true;
										const isNormalized = isColumnNormalizedByLand(
											landCol.values,
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
					<td class="extra-column">more data</td>
					{#each table as column, index}
						<td
							class={'col-' + column.name}
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

<style>
	.centered-cell-content {
		display: flex;
		justify-content: center;
		width: 100%;
		margin: 0;
	}
</style>
