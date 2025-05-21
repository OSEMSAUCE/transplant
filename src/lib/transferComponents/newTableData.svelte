<script lang="ts">
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

	// Diagnostic function to print exact format selector layout
	function logTableStructure() {
		// Wait for DOM to be fully rendered
		setTimeout(() => {
			console.log('=== TABLE STRUCTURE DIAGNOSTIC ===');
			const table = document.querySelector('.data-table');
			if (!table) {
				console.log('Table not found in DOM');
				return;
			}
			
			// Log data model order
			console.log('DATA MODEL ORDER:');
			importedData.columns.forEach((col, idx) => {
				console.log(`[${idx}] ${col.headerName}: ${col.currentFormat}`);
			});
			
			// Log actual DOM order
			console.log('\nDOM STRUCTURE:');
			const headers = Array.from(table.querySelectorAll('th.data-column'));
			headers.forEach((header, idx) => {
				const headerName = header.getAttribute('data-header-name');
				const uiIndex = header.getAttribute('data-column-index');
				const dataIndex = header.getAttribute('data-real-index');
				const formatSelector = header.querySelector('select');
				const format = formatSelector ? formatSelector.value : 'unknown';
				
				console.log(`UI[${uiIndex}] Data[${dataIndex}] "${headerName}": Format selector shows "${format}"`);
			});
			
			console.log('===========================');
		}, 500); // Give DOM time to render
	}

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
</script>

<!-- Run diagnostic logging when table is created -->
{#if importedData.columns.length > 0}
	{@const callDiagnostics = logTableStructure()}
{/if}

<table class="data-table" style="table-layout: fixed;">
	<thead>
		<tr>
			<!-- The GPS column is always first and separate from the iteration -->
			<th class="gps-column">
				<div class="column-header">
					<span class="format-label">GPS</span>
				</div>
				<div class="header-name">GPS</div>
			</th>
			<!-- Iterate over actual data columns -->
			{#each importedData.columns.filter((c) => (isTransplant ? c.isToggled : true)) as column, index}
				{@const landCol = importedData.columns.find((col) => col.mappedTo?.includes('landName'))}
				{@const cropCol = importedData.columns.find((col) => col.mappedTo?.includes('cropName'))}
				{@const isPrimaryColumn =
					column.mappedTo?.includes('landName') || column.mappedTo?.includes('cropName')}
				{@const isLandCompatible =
					!column.isMapped && !isPrimaryColumn && landCol
						? // Don't show compatibility for date columns, number columns, or parcelOwnership
							column.currentFormat !== 'date' &&
							column.currentFormat !== 'number' &&
							!column.headerName.toLowerCase().includes('ownership') &&
							isColumnNormalizedByLand(landCol.values, column.values)
						: false}
				{@const isCropCompatible =
					!column.isMapped && !isPrimaryColumn && cropCol
						? // Don't show compatibility for date columns, number columns, or parcelOwnership
							column.currentFormat !== 'date' &&
							column.currentFormat !== 'number' &&
							!column.headerName.toLowerCase().includes('ownership') &&
							isColumnNormalizedByLand(cropCol.values, column.values)
						: false}
				<!-- Debugging logs removed -->
				<th
					class="data-column"
					data-header-name={column.headerName}
					data-column-index={index}
					data-real-index={importedData.columns.findIndex(col => col.headerName === column.headerName)}
					draggable={!column.isMapped}
					ondragstart={dragstartHandler}
					ondragend={dragEndHandler}
					style={`position: relative; ${isLandCompatible ? 'border: 1px solid #2196f3;' : ''} ${isCropCompatible ? 'border: 1px solid #4caf50;' : ''} ${isLandCompatible && isCropCompatible ? 'border-left: 1px solid #2196f3; border-top: 1px solid #2196f3; border-right: 1px solid #4caf50; border-bottom: 1px solid #4caf50;' : ''}`}
				>
					<!-- Column with unique identifier to ensure format selectors align properly -->
					<div class="column-container" id={`col-${column.headerName}-container`}>
						<!-- Small index indicator to help debug -->
						<small style="font-size: 8px; position: absolute; top: 0; right: 3px; color: #999;">[{index}]</small>
						
						<div class="column-header" id={`col-${column.headerName}-selector`}>
							<!-- Label indicating which column this format selector controls -->
							<div style="font-size: 9px; color: #666; margin-bottom: 2px; background: rgba(0,0,0,0.03); padding: 1px 3px; border-radius: 2px; text-align: center;">
								For: {column.headerName}
							</div>
							
							<FormatSelectorComponent
								columnData={column.values}
								currentFormat={column.currentFormat}
								currentColumnHeader={column.headerName}
								onformatchange={(event) => {
									// Update column format directly
									const selectedFormat = event.detail.destinationFormat;
									column.currentFormat = selectedFormat;
									column.isFormatted = true;
									console.log(`Format updated for ${column.headerName}: ${selectedFormat}`);
								}}
								{isTransplant}
								isToggled={column.isToggled}
							/>
						</div>
						
						<div class="header-name" id={column.headerName}>
							{column.headerName}
						</div>
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
				<!-- Two new empty data columns for alignment -->
				{#each importedData.columns.filter( (c) => (isTransplant ? c.isToggled : true) ) as column, index}
					{@const landCol = importedData.columns.find((col) => col.mappedTo?.includes('landName'))}
					{@const cropCol = importedData.columns.find((col) => col.mappedTo?.includes('cropName'))}
					{@const isPrimaryColumn =
						(landCol && column.headerName === landCol.headerName) ||
						(cropCol && column.headerName === cropCol.headerName)}
					{@const isLandCompatible =
						!column.isMapped && !isPrimaryColumn && landCol
							? // Don't show compatibility for date columns or parcelOwnership
								column.currentFormat !== 'date' &&
								!column.headerName.toLowerCase().includes('ownership') &&
								isColumnNormalizedByLand(landCol.values, column.values)
							: false}
					{@const isCropCompatible =
						!column.isMapped && !isPrimaryColumn && cropCol
							? // Don't show compatibility for date columns, number columns, or parcelOwnership
								column.currentFormat !== 'date' &&
								column.currentFormat !== 'number' &&
								!column.headerName.toLowerCase().includes('ownership') &&
								isColumnNormalizedByLand(cropCol.values, column.values)
							: false}
					<!-- Debugging logs removed -->
					<td
						class:greyed-out={isTransplant
							? column.isMapped
							: !(column.isToggled && !column.isGreyed[rowIndex])}
						data-header-name={column.headerName}
						data-column-index={index}
						draggable={!column.isMapped}
						ondragstart={dragstartHandler}
						ondragend={dragEndHandler}
						style={`position: relative; ${isLandCompatible ? 'border: 1px solid #2196f3;' : ''} ${isCropCompatible ? 'border: 1px solid #4caf50;' : ''} ${isLandCompatible && isCropCompatible ? 'border-left: 1px solid #2196f3; border-top: 1px solid #2196f3; border-right: 1px solid #4caf50; border-bottom: 1px solid #4caf50;' : ''}`}
					>
						<!-- Icons commented out for now, can be re-enabled for debugging
						{#if isLandCompatible}
							<div style="position: absolute; top: 2px; left: 2px; font-size: 20px; z-index: 100; background-color: rgba(255,255,255,0.7); padding: 2px; border-radius: 4px;">🗺️️</div>
						{/if}
						{#if isCropCompatible}
							<div style="position: absolute; top: 2px; right: 2px; font-size: 20px; z-index: 100; background-color: rgba(255,255,255,0.7); padding: 2px; border-radius: 4px;">🌳️</div>
						{/if}
						-->
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

<!-- Visual cues now integrated into the main styling logic -->
<!-- <style>
	.transplant-toggle-table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1rem;
	}

	.transplant-toggle-table th,
	.transplant-toggle-table td {
		border: 1px solid #ddd;
		padding: 0.5rem;
		text-align: left;
	}

	.transplant-toggle-table th {
		background-color: #f2f2f2;
		position: relative;
	}

	.column-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-name {
		font-weight: bold;
		margin-top: 0.5rem;
	}

	.greyed-out {
		color: #aaa;
		background-color: #f9f9f9;
	}

	.dragging {
		opacity: 0.5;
	}

	.drag-preview {
		position: absolute;
		background: white;
		border: 1px solid #ccc;
		padding: 8px;
		border-radius: 4px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
		z-index: 1000;
		pointer-events: none;
		max-width: 200px;
		overflow: hidden;
	}

	.preview-header {
		font-weight: bold;
		margin-bottom: 4px;
		border-bottom: 1px solid #eee;
		padding-bottom: 4px;
	}

	.preview-row {
		padding: 2px 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* GPS cell styling */
	.gps-cell {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.5rem;
	}

	.gps-icon {
		color: #e74c3c;
		font-size: 1.2rem;
	}

	.gps-coordinates {
		font-size: 0.85rem;
		color: #333;
	}
</style> -->
