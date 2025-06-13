<script lang="ts">
	console.log('CASCADE TEST: TpCsvTable.svelte loaded');
	import {
		getColumnCompatibility,
		findLandColumn,
		isColumnNormalizedByLand
	} from './columnNormalizationUtils';
	import FormatSelectorComponent from './FormatSelectorComponent.svelte';
	import type { ColumnFormat } from '$lib/types/columnModel';
	import { detectFormat, isGps, isLatitude, isLongitude } from './formatDetection2';
	import { importedData } from '$lib/transferComponents/modelState.svelte';
	import { dragColumnState } from '$lib/transferComponents/modelState.svelte';
	// Add this constant
	const max_transplant_rows = 3;

	// Accept pageIs as a prop
	const { pageIs = 'transfer' } = $props<{ pageIs?: 'transfer' | 'transplant' }>();

	// Derive if we're in transplant mode
	let isTransplant = $derived(pageIs === 'transplant');

	// Number formatting function
	function numberFormat(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'decimal',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(value);
	}

	// 🌲️🌲️🌳️🌳️🌴️ drag drop thing 🌲️🌲️🌳️🌳️🌴️
	// later we need to make the whole column draggable, not just the header 16 Apr 2025  7:56 AM

	function dragstartHandler(ev: DragEvent) {
		if (!ev.dataTransfer) return;

		const target = ev.target as HTMLElement;
		const columnIndex = Number(target.dataset.columnIndex);
		const columnName = target.dataset.headerName ?? '';
		// set drag column state, legal color thing.
		dragColumnState.headerName = columnName;
		dragColumnState.currentFormat = importedData.columns[columnIndex].currentFormat;
		dragColumnState.index = columnIndex;

		// Log compatibility info for debugging
		const landCol = findLandColumn(importedData.columns);
		if (landCol) {
			const draggedCol = importedData.columns[columnIndex];
			const compat = getColumnCompatibility(landCol.values, draggedCol.values);
			console.log(
				`Dragging column ${columnName} - compatibility with ${landCol.headerName}: ${compat}`
			);
		}

		console.log(dragColumnState);
		// Add class to all cells in this column
		document
			.querySelectorAll(`[data-column-index="${columnIndex}"]`)
			.forEach((el) => el.classList.add('dragging'));

		// Create a drag image showing the header and first few rows
		const dragPreview = document.createElement('div');
		dragPreview.className = 'drag-preview';
		dragPreview.innerHTML = `
			<div class="preview-header">${columnName}</div>
			${importedData.columns[columnIndex]?.values
				.slice(0, 3)
				.map((val) => `<div class="preview-row">${val}</div>`)
				.join('')}
		`;
		document.body.appendChild(dragPreview);
		ev.dataTransfer.setDragImage(dragPreview, 0, 0);
		ev.dataTransfer.setData('text', columnIndex.toString());
	}

	function dragEndHandler() {
		// Remove dragging class from all cells
		document.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
		// Clean up drag preview
		document.querySelector('.drag-preview')?.remove();
		dragColumnState.headerName = null;
		dragColumnState.currentFormat = null;
		dragColumnState.index = null;
	}

	function pullFirstGpsSelected(rowIndex: number) {
		// First try to find a full GPS coordinate pair
		for (const column of importedData.columns) {
			if (
				column.currentFormat === 'gps' &&
				column.values[rowIndex] !== null &&
				column.values[rowIndex] !== ''
			) {
				const gpsValue = column.values[rowIndex];
				if (isGps(gpsValue)) {
					return { type: 'full', value: gpsValue };
				}
			}
		}

		// Try to find a complete latitude/longitude pair
		let latValue: string | number | null = null;
		let lonValue: string | number | null = null;

		// First pass: look for explicit latitude and longitude columns
		for (const column of importedData.columns) {
			const value = column.values[rowIndex];

			if (value === null || value === '') continue;

			// Check for latitude column
			if (column.currentFormat === 'latitude' && !latValue) {
				if (isLatitude(value)) {
					latValue = value;
				}
			}
			// Check for longitude column
			else if (column.currentFormat === 'longitude' && !lonValue) {
				if (isLongitude(value)) {
					lonValue = value;
				}
			}
		}

		// If we found both valid lat and lon values, return them
		if (latValue !== null && lonValue !== null) {
			return { type: 'pair', lat: latValue, lon: lonValue };
		}

		// If we couldn't find a complete pair of valid coordinates, return null
		return null;
	}
	// Utility: Check if mapping between stringCol and gpsCol is consistent (1:1 or repeated-but-consistent)
	function isStringGpsMappingConsistent(stringCol: any, gpsCol: any) {
		const mapping = new Map();
		const reverse = new Map();
		for (let i = 0; i < stringCol.values.length; i++) {
			const str = stringCol.values[i];
			const gps = gpsCol.values[i];
			if (str == null || str === '' || gps == null || gps === '') continue; // Only non-null pairs
			if (mapping.has(str)) {
				if (mapping.get(str) !== gps) return false;
			} else {
				mapping.set(str, gps);
			}
			if (reverse.has(gps)) {
				if (reverse.get(gps) !== str) return false;
			} else {
				reverse.set(gps, str);
			}
		}
		return mapping.size > 0; // At least one mapping
	}

	// Memoize which string columns match GPS (Svelte 5 runes mode)
	const gpsMatchColumns = $derived(() => {
		const gpsCol = (importedData.columns as any[]).find((c: any) => c.currentFormat === 'gps');
		if (!gpsCol) return {};
		const result: Record<string, boolean> = {};
		for (const strCol of importedData.columns as any[]) {
			if (strCol.currentFormat !== 'string') continue;
			result[strCol.headerName] = isStringGpsMappingConsistent(strCol, gpsCol);
		}
		return result;
	});

	// Function to check compatibility between CSV and DB table
	function isCompatible(column: any) {
		const landCol = importedData.columns.find((col) => col.mappedTo?.includes('landName'));
		const cropCol = importedData.columns.find((col) => col.mappedTo?.includes('cropName'));
		const isPrimaryColumn =
			(landCol && column.headerName === landCol.headerName) ||
			(cropCol && column.headerName === cropCol.headerName);
		const isLandCompatible =
			!column.isMapped && !isPrimaryColumn && landCol
				? // Don't show compatibility for date columns or parcelOwnership
					column.currentFormat !== 'date' &&
					!column.headerName.toLowerCase().includes('ownership') &&
					column.currentFormat !== 'latitude' &&
					column.currentFormat !== 'longitude' &&
					column.currentFormat !== 'polygon' &&
					isColumnNormalizedByLand(landCol.values, column.values)
				: false;
		const isCropCompatible =
			!column.isMapped && !isPrimaryColumn && cropCol
				? // Don't show compatibility for date columns, number columns, or parcelOwnership
					column.currentFormat !== 'date' &&
					column.currentFormat !== 'number' &&
					column.currentFormat !== 'latitude' &&
					column.currentFormat !== 'longitude' &&
					column.currentFormat !== 'polygon' &&
					!column.headerName.toLowerCase().includes('ownership') &&
					isColumnNormalizedByLand(cropCol.values, column.values)
				: false;

		return { isLandCompatible, isCropCompatible };
	}

	// Helper: check if a value is unique and non-null in a column
	function isUniqueNonNull(values: any[], value: any): boolean {
		if (value === null || value === '') return false;
		return values.filter((v) => v !== null && v !== '' && v === value).length === 1;
	}

	// Helper: get the GPS column
	function getGpsColumn() {
		return importedData.columns.find((col) => col.currentFormat === 'gps');
	}

	// Cell-level GPS match for string columns
	function isCellGpsMatch(rowIndex: number, column: any): boolean {
		const cellValue = column.values[rowIndex];
		if (cellValue === null || cellValue === '') return false;
		const gpsCol = getGpsColumn();
		if (!gpsCol) return false;
		const gpsValue = gpsCol.values[rowIndex];
		if (gpsValue === null || gpsValue === '') return false;
		return (
			isUniqueNonNull(column.values, cellValue) &&
			isUniqueNonNull(gpsCol.values, gpsValue) &&
			cellValue === gpsValue
		);
	}

	// Cell-level GPS match for the GPS column itself
	function isGpsCellMatch(rowIndex: number): boolean {
		const gpsCol = getGpsColumn();
		if (!gpsCol) return false;
		const gpsValue = gpsCol.values[rowIndex];
		if (gpsValue === null || gpsValue === '') return false;
		// Now check if any string column in this row matches this value uniquely
		for (const column of importedData.columns) {
			if (column.currentFormat !== 'string') continue;
			const cellValue = column.values[rowIndex];
			if (cellValue === null || cellValue === '') continue;
			if (
				isUniqueNonNull(column.values, cellValue) &&
				isUniqueNonNull(gpsCol.values, gpsValue) &&
				cellValue === gpsValue
			) {
				return true;
			}
		}
		return false;
	}
</script>

<table class="data-table" style="table-layout: fixed;">
	<thead>
		<tr>
			<!-- The GPS column is always first and separate from the iteration -->
			<th class="gps-column">
				<div class="column-header">
					<span class="format-label">GPS</span>
				</div>
				<div class="header-name"></div>
			</th>
			<!-- HEAD isCompatible function between CSVTable and dbTable -->
			{#each importedData.columns.filter( (c) => (isTransplant ? c.isToggled : true) ) as column, index}
				{@const { isLandCompatible, isCropCompatible } = isCompatible(column)}

				<th
					class:isCropCompatible
					class:isLandCompatible
					data-header-name={column.headerName}
					data-column-index={index}
					draggable={!column.isMapped}
					ondragstart={dragstartHandler}
					ondragend={dragEndHandler}
				>
					<div class="column-header">
						<FormatSelectorComponent
							columnData={column.values}
							currentFormat={column.currentFormat}
							currentColumnHeader={column.headerName}
							onformatchange={(event) => {
								const selectedFormat = event.detail.destinationFormat;
								column.currentFormat = selectedFormat;
								column.isFormatted = true;
							}}
							{isTransplant}
							isToggled={column.isToggled}
						/>
					</div>
					<div class="header-name" id={column.headerName}>
						{column.headerName}
					</div>
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each importedData.columns[0].values.slice(0, isTransplant ? max_transplant_rows : undefined) as _, rowIndex}
			{@const gpsData = pullFirstGpsSelected(rowIndex)}
			<tr>
				<td style="position: relative;">
					{#if gpsData}
						<div class="gps-cell">
							<span class="gps-coordinates">
								{#if gpsData.type === 'full'}
									{gpsData.value}
								{:else if gpsData.type === 'pair'}
									{gpsData.lat}, {gpsData.lon}
								{/if}
							</span>
						</div>
					{/if}
				</td>

				<!-- BODY isCompatible function between CSVTable and dbTable -->
				{#each importedData.columns.filter( (c) => (isTransplant ? c.isToggled : true) ) as column, index}
					{@const { isLandCompatible, isCropCompatible } = isCompatible(column)}
					<td
						class:isCropCompatible
						class:isLandCompatible
						class:greyed-out={isTransplant
							? column.isMapped
							: !(column.isToggled && !column.isGreyed[rowIndex])}
						class:isGpsMatch={column.currentFormat === 'string' &&
							gpsMatchColumns()?.[column.headerName]}
						data-header-name={column.headerName}
						data-column-index={index}
						draggable={!column.isMapped}
						ondragstart={dragstartHandler}
						ondragend={dragEndHandler}
					>
						{#if isTransplant && (column.isGreyed[rowIndex] || !column.isToggled)}
							<!-- Empty cell when greyed in transplant mode -->
						{:else}
							{column.formattedValues[rowIndex] === null
								? column.values[rowIndex]
								: column.formattedValues[rowIndex]}
						{/if}
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.isLandCompatible {
		border-top: 1px solid #2196f3;
		border-bottom: 1px solid #2196f3;
	}
	.isCropCompatible {
		border-top: 1px solid #4caf50;
		border-bottom: 1px solid #4caf50;
	}

	.isCropCompatible.isLandCompatible {
		border-left: 1px solid #2196f3;
		border-top: 1px solid #2196f3;
		border-bottom: 1px solid #4caf50;
		border-right: 1px solid #4caf50;
	}

	.isLandCompatible.isCropCompatible.isGpsCompatible {
		border-left: 1px solid #2196f3;
		border-right: 1px solid #4caf50;
		border-top: 1px solid #f38e1b;
		border-bottom: 1px solid #f38e1b;
	}

	.isLandCompatible.isGpsCompatible {
		border-top: 1px solid #f38e1b;
		border-bottom: 1px solid #f38e1b;
		border-left: 1px solid #2196f3;
		border-right: 1px solid #2196f3;
	}
	.isCropCompatible.isGpsCompatible {
		border-top: 1px solid #f38e1b;
		border-bottom: 1px solid #f38e1b;
		border-left: 1px solid #4caf50;
		border-right: 1px solid #4caf50;
	}
</style>
