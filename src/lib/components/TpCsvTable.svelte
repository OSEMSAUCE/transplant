<script lang="ts">
	import { isColumnNormalizedByLand } from './columnNormalizationUtils';
	import {
		getDuplicatedMask,
		getDuplicatePattern,
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

	// Compute duplicated masks for each column
	// This returns an array of boolean arrays, one for each column
	// Each inner array indicates which values in that column are duplicated
	let duplicatedMasks = $state<boolean[][]>([]);
	let patternMasks = $state<DuplicatePattern[][]>([]);
	let bruteForcePatterns = $state<boolean[][]>([]);
	let bruteForcePatternColumnIndices = $state<number[][]>([]);

	import { findBruteForceDuplicatePatterns } from './isDuplicateLogic';

	$effect(() => {
		// Brute-force pattern finding
		const { patterns, patternColumnIndices } = findBruteForceDuplicatePatterns(
			importedData.columns
		);
		bruteForcePatterns = patterns;
		bruteForcePatternColumnIndices = patternColumnIndices;

		// Restore coloring logic
		const dMasks: boolean[][] = [];
		const pMasks: DuplicatePattern[][] = [];
		for (let i = 0; i < importedData.columns.length; i++) {
			const col = importedData.columns[i];
			if (Array.isArray(col.values)) {
				dMasks.push(getDuplicatedMask(col.values));
				pMasks.push(getDuplicatePattern(col.values));
			} else {
				dMasks.push(Array(col.values));
				pMasks.push(Array(col.values));
			}
		}
		duplicatedMasks = dMasks;
		patternMasks = pMasks;
	});
	// Update duplicated masks and pattern masks whenever importedData changes

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
			<!-- 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ GPS📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️ 📌️  -->

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
						class:landDuplicatePattern={column.duplicatePattern === 'landDuplicatePattern' &&
							column.type === 'string' &&
							duplicatedMasks[index]?.[rowIndex]}
						class:cropDuplicatePattern={column.duplicatePattern === 'cropDuplicatePattern' &&
							column.type === 'string' &&
							duplicatedMasks[index]?.[rowIndex]}
						class:randomDuplicatePattern={column.duplicatePattern === 'randomDuplicatePattern' &&
							column.type === 'string' &&
							duplicatedMasks[index]?.[rowIndex]}
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
	/* Styling for duplicate patterns */

	/* Styling for land pattern duplicated cells (blue) */
	.landDuplicatePattern {
		background-color: rgba(33, 150, 243, 0.18) !important; /* Blue with opacity */
		position: relative !important;
	}
	.landDuplicatePattern:hover {
		background-color: rgba(33, 150, 243, 0.32) !important; /* Darker blue on hover */
	}

	/* Styling for crop pattern duplicated cells (green) */
	.cropDuplicatePattern {
		background-color: rgba(76, 175, 80, 0.18) !important; /* Green with opacity */
		position: relative !important;
	}
	.cropDuplicatePattern:hover {
		background-color: rgba(76, 175, 80, 0.32) !important; /* Darker green on hover */
	}

	/* Styling for random pattern duplicated cells (orange) */
	.randomDuplicatePattern {
		background-color: rgba(255, 152, 0, 0.18) !important; /* Orange with opacity */
		position: relative !important;
	}
	.randomDuplicatePattern:hover {
		background-color: rgba(255, 152, 0, 0.32) !important; /* Darker orange on hover */
	}

	/* Data type formatting colors - use consistent colors for format types */
	.format-string select, .string-column {
		background-color: rgba(156, 39, 176, 0.4) !important; /* Purple for strings */
		border: 2px solid transparent;
		transition: all 0.2s ease-in-out;
	}

	.format-number select, .number-column {
		background-color: rgba(63, 81, 181, 0.4) !important; /* Blue for numbers */
		border: 2px solid transparent;
		transition: all 0.2s ease-in-out;
	}

	.format-date select, .date-column {
		background-color: rgba(233, 30, 99, 0.4) !important; /* Pink for dates */
		border: 2px solid transparent;
		transition: all 0.2s ease-in-out;
	}

	.format-gps select, .gps-column {
		background-color: rgba(0, 150, 136, 0.4) !important; /* Teal for GPS */
		border: 2px solid transparent;
		transition: all 0.2s ease-in-out;
	}

	/* Enhanced drag feedback */
	[draggable=true] {
		cursor: grab;
		position: relative;
		overflow: visible;
	}

	[draggable=true]:hover::after {
		content: "⟷";
		position: absolute;
		right: 4px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 14px;
		color: rgba(0, 0, 0, 0.5);
	}

	/* Dragging state */
	.dragging {
		opacity: 0.7;
		border: 2px dashed #666 !important;
	}



	@keyframes pulse {
		0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.5); }
		70% { box-shadow: 0 0 0 5px rgba(76, 175, 80, 0); }
		100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
	}

	/* Improved drag preview */
	.drag-preview {
		position: absolute;
		pointer-events: none;
		z-index: 9999;
		background: white;
		border: 1px solid #ccc;
		box-shadow: 0 2px 5px rgba(0,0,0,0.2);
		padding: 5px;
		border-radius: 4px;
		max-width: 200px;
	}

	.preview-header {
		font-weight: bold;
		border-bottom: 1px solid #eee;
		padding-bottom: 3px;
		margin-bottom: 3px;
	}

	.preview-row {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 2px 0;
	}

	/* Format compatibility indicators */
	.isLandCompatible, .isCropCompatible {
		cursor: copy;
		position: relative;
		animation: pulse 1.5s infinite;
		border: 2px dashed #4caf50 !important;
	}

	.isLandCompatible::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		width: 4px;
		height: 100%;
		background-color: rgba(33, 150, 243, 0.8); /* Blue indicator */
	}

	.isCropCompatible::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		width: 4px;
		height: 100%;
		background-color: rgba(76, 175, 80, 0.8); /* Green indicator */
	}
</style>
