<script lang="ts">
	import {
		getColumnCompatibility,
		isColumnNormalizedByLand
	} from './columnNormalizationUtils';
	import {
		getDuplicatedMask,
		getDuplicatePatternMask,
		type DuplicatePattern
	} from './isDuplicateLogic';
	import FormatSelectorComponent from './FormatSelectorComponent.svelte';
	import { formatValue, isGps, isLatitude, isLongitude } from './formatDetection2';
	import { importedData } from '$lib/components/modelState.svelte';
	import { dragColumnState } from '$lib/components/modelState.svelte';
	import GpsColumn from './GpsColumn.svelte';

	// Add this constant
	const max_transplant_rows = 3;

	// Accept pageIs as a prop
	const { pageIs = 'transfer' } = $props<{ pageIs?: 'transfer' | 'transplant' }>();

	// Derive if we're in transplant mode
	let isTransplant = $derived(pageIs === 'transplant');

	// // Number formatting function
	// function numberFormat(value: number): string {
	// 	return new Intl.NumberFormat('en-US', {
	// 		style: 'decimal',
	// 		minimumFractionDigits: 0,
	// 		maximumFractionDigits: 2
	// 	}).format(value);
	// }
	// Compute duplicated masks for each column
	// This returns an array of boolean arrays, one for each column
	// Each inner array indicates which values in that column are duplicated
	const duplicatedMasks = $state<boolean[][]>([]);
	const patternMasks = $state<DuplicatePattern[][]>([]);

	// Update duplicated masks and pattern masks whenever importedData changes
	$effect(() => {
		const masks: boolean[][] = [];
		const patterns: DuplicatePattern[][] = [];
		
		for (const col of importedData.columns) {
			if (Array.isArray(col.values)) {
				// Populate isDuplicate with boolean duplicate mask
				col.isDuplicate = getDuplicatedMask(col.values);
			}
			if (col.type === 'string' && Array.isArray(col.values)) {
				// col.isDuplicate = getDuplicatedMask(col.values);
				// Get duplicate pattern masks
				const patternMask = getDuplicatePatternMask(col.values);
				patterns.push(patternMask);
				
				// Also update the boolean masks for backward compatibility
				masks.push(patternMask.map(pattern => pattern !== 'none'));
			} else {
				// For non-string columns, create arrays of false/none values
				masks.push(Array(col.values.length).fill(false));
				patterns.push(Array(col.values.length).fill('none'));
			}
		}
		
		// Update the state variables with new masks
		duplicatedMasks.length = 0;
		masks.forEach(mask => duplicatedMasks.push(mask));
		 
		patternMasks.length = 0;
		patterns.forEach(pattern => patternMasks.push(pattern));
		
		// Log pattern counts for debugging
		let landPatternCount = 0;
		let cropPatternCount = 0;
		for (const patternArray of patterns) {
			landPatternCount += patternArray.filter(p => p === 'landDuplicatePattern').length;
			cropPatternCount += patternArray.filter(p => p === 'cropDuplicatePattern').length;
		}
		console.log(`Found ${landPatternCount} landDuplicatePattern and ${cropPatternCount} cropDuplicatePattern duplicates across all columns`);
	});

	// // Svelte 5: use $effect for side effects like logging
	// $effect(() => {
	// 	// Only run this effect when duplicatedMasks has been populated
	// 	if (duplicatedMasks.length === 0) return;

	// 	for (const [colIdx, col] of importedData.columns.entries()) {
	// 		if (col.type === 'string' && Array.isArray(col.values)) {
	// 			const mask = duplicatedMasks[colIdx];
	// 			if (mask) {
	// 				const hasDuplicates = mask.some(Boolean);
	// 				if (hasDuplicates) {
	// 					console.log(
	// 						`Column "${col.headerName || col.name || colIdx}" has duplicated values in these rows:`,
	// 						mask
	// 							.map((isDup: boolean, rowIdx: number) => (isDup ? rowIdx : null))
	// 							.filter((idx: number | null) => idx !== null)
	// 					);
	// 				} else {

	// 				}
	// 			}
	// 		}
	// 	}
	// });

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
		// const landCol = findLandColumn(importedData.columns);
		// if (landCol) {
		// 	const draggedCol = importedData.columns[columnIndex];
		// 	const compat = getColumnCompatibility(landCol.values, draggedCol.values);
		// }
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

	interface GpsData {
		type: 'full' | 'pair';
		value?: string;
		lat?: number;
		lon?: number;
	}

	function pullFirstGpsSelected(rowIndex: number): GpsData | null {
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

		// Try to find a complete latitude/longitude pair using column names
		let latValue: string | number | null = null;
		let lonValue: string | number | null = null;

		for (const column of importedData.columns) {
			const value = column.values[rowIndex];
			if (value === null || value === '') continue;

			const name = column.headerName?.toLowerCase().replace(/[\s_]+/g, '');

			// Check for latitude column
			if (!latValue && name && name.includes('lat')) {
				if (isLatitude(value)) {
					latValue = Number(value);
				}
			}
			// Check for longitude column
			else if (!lonValue && name && name.includes('lon')) {
				if (isLongitude(value)) {
					lonValue = Number(value);
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
</script>

<table class="data-table" style="table-layout: fixed;">
	<thead>
		<tr>
			<!-- The GPS column is always first and separate from the iteration -->
			<!-- 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️  -->

			<GpsColumn header />

			<!-- The Polygon column is second and separate from the iteration -->
			<th class="polygon-column">
				<div class="column-header">
					<span class="format-label">Polygon</span>
				</div>
				<div class="header-name"></div>
			</th>
			<!-- 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️  -->

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
				<GpsColumn {gpsData} isMatch={true} />
				<!-- I think you mean the structure up top is supposed to be also in the GPS column file and then I move those parameters I guess in like this. Thank you. -->
				<!-- Polygon column cell -->
				<td style="position: relative; padding: 4px;">
					<div
						class="polygon-cell"
						style="display: flex; justify-content: center; width: 100%; margin: 0;"
					>
						{#key rowIndex}
							{@const polygonData = pullFirstPolygonSelected(rowIndex)}
							{#if polygonData}
								<span class="polygon-coordinates">
									{polygonData.value}
								</span>
							{:else if gpsData}
								<span class="polygon-placeholder">
									<span class="material-symbols-outlined"></span>
								</span>
							{/if}
						{/key}
					</div>
				</td>

				<!-- BODY isCompatible function between CSVTable and dbTable -->
				{#each importedData.columns.filter( (c) => (isTransplant ? c.isToggled : true) ) as column, index}
					{@const { isLandCompatible, isCropCompatible } = isCompatible(column)}
					{@const columnMask = duplicatedMasks[index] || []}
					{@const isDuplicated = columnMask[rowIndex] || false}
					{@const patternMask = patternMasks[index] || []}
					{@const duplicatePattern = patternMask[rowIndex] || 'none'}
					<td
						class:isCropCompatible
						class:isLandCompatible
						class:greyed-out={isTransplant
							? column.isMapped
							: !(column.isToggled && !column.isGreyed[rowIndex])}
						class:isDuplicated={isDuplicated && column.type === 'string'}
						class:landDuplicatePattern={duplicatePattern === 'landDuplicatePattern' && column.type === 'string'}
						class:cropDuplicatePattern={duplicatePattern === 'cropDuplicatePattern' && column.type === 'string'}
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
	/* Styling for duplicated cells - keeping for backward compatibility */
	.isDuplicated {
		background-color: rgba(213, 106, 44, 0.1) !important;
		position: relative;
	}

	.isDuplicated::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 2px;
	}

	/* Make sure the duplicate highlighting doesn't interfere with other styles */
	.isDuplicated:hover {
		background-color: rgba(255, 220, 200, 0.6) !important;
	}
	
	/* Styling for land pattern duplicated cells (blue) */
	.landDuplicatePattern {
		background-color: rgba(65, 105, 225, 0.2) !important; /* Royal blue with opacity */
		position: relative !important;
	}

	.landDuplicatePattern::after {
		content: '' !important;
		position: absolute !important;
		bottom: 0 !important;
		left: 0 !important;
		width: 100% !important;
		height: 2px !important;
	}

	/* Make sure the duplicate highlighting doesn't interfere with other styles */
	.landDuplicatePattern:hover {
		background-color: rgba(65, 105, 225, 0.3) !important; /* Slightly darker blue on hover */
	}
	
	/* Styling for crop pattern duplicated cells (green) */
	.cropDuplicatePattern {
		background-color: rgba(76, 175, 80, 0.2) !important; /* Green with opacity */
		position: relative !important;
	}

	.cropDuplicatePattern::after {
		content: '' !important;
		position: absolute !important;
		bottom: 0 !important;
		left: 0 !important;
		width: 100% !important;
		height: 2px !important;
	}

	/* Make sure the duplicate highlighting doesn't interfere with other styles */
	.cropDuplicatePattern:hover {
		background-color: rgba(76, 175, 80, 0.3) !important; /* Slightly darker green on hover */
	}
</style>
