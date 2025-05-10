<script lang="ts">
	import {
		getColumnCompatibility,
		findLandColumn,
		isColumnNormalizedByLand
	} from './columnNormalizationUtils';
	import type { ColumnRep } from '$lib/types/columnModel';
	import FormatSelectorComponent from './FormatSelectorComponent.svelte';
	import { importedData } from '$lib/transferComponents/modelState.svelte';
	import { formatValue, matchesFormat } from './newFormatDetection';
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
</script>

<table class="transplant-toggle-table">
	<thead>
		<tr>
			{#each importedData.columns.filter( (c) => (isTransplant ? c.isToggled : true) ) as column, index}
				<th
					data-header-name={column.headerName}
					data-column-index={index}
					draggable={!column.isMapped}
					ondragstart={dragstartHandler}
					ondragend={dragEndHandler}
					style={(() => {
						// Skip for already mapped columns
						if (column.isMapped) {
							console.log(`Column ${column.headerName} is already mapped, skipping style`);
							return '';
						}
						
						// Check if landName is mapped
						const landMapped = importedData.columns.some((c) => c.mappedTo?.includes('land.landName'));
						console.log(`landName is mapped: ${landMapped}`);
						
						// Check if cropName is mapped
						const cropMapped = importedData.columns.some((c) => c.mappedTo?.includes('crop.cropName'));
						console.log(`cropName is mapped: ${cropMapped}`);
						
						// Don't show any borders if neither landName nor cropName has been mapped
						if (!landMapped && !cropMapped) {
							console.log('Neither landName nor cropName is mapped, skipping style');
							return '';
						}
						
						// Get column indices
						const landColIndex = landMapped ? 
							importedData.columns.findIndex((c) => c.mappedTo?.includes('land.landName')) : -1;
						console.log(`landColIndex: ${landColIndex}`);
						
						const cropColIndex = cropMapped ? 
							importedData.columns.findIndex((c) => c.mappedTo?.includes('crop.cropName')) : -1;
						console.log(`cropColIndex: ${cropColIndex}`);
						
						// Skip for the primary columns themselves
						if ((landMapped && landColIndex !== -1 && column.headerName === importedData.columns[landColIndex].headerName) ||
						    (cropMapped && cropColIndex !== -1 && column.headerName === importedData.columns[cropColIndex].headerName)) {
							console.log(`Column ${column.headerName} is a primary column, skipping style`);
							return '';
						}
						
						// Check Land compatibility
						let isLandCompatible = false;
						if (landMapped && landColIndex !== -1) {
							const landCol = importedData.columns[landColIndex];
							isLandCompatible = isColumnNormalizedByLand(landCol.values, column.values);
							console.log(`Column ${column.headerName} land compatibility: ${isLandCompatible}`);
						}
						
						// Check Crop compatibility
						let isCropCompatible = false;
						if (cropMapped && cropColIndex !== -1) {
							const cropCol = importedData.columns[cropColIndex];
							isCropCompatible = isColumnNormalizedByLand(cropCol.values, column.values);
							console.log(`Column ${column.headerName} crop compatibility: ${isCropCompatible}`);
						}
						
						// Apply appropriate styling based on compatibility
						if (isLandCompatible && isCropCompatible) {
							// Both compatible - use a combined style
							console.log(`Column ${column.headerName} is compatible with both tables, applying combined style`);
							return 'border: 5px solid #2196f3 !important; border-bottom: 5px solid #4caf50 !important; background-color: rgba(33, 150, 243, 0.2) !important;';
						} else if (isLandCompatible) {
							// Land compatible - blue outline
							console.log(`Column ${column.headerName} is compatible with Land table, applying blue style`);
							return 'border: 5px solid #2196f3 !important; background-color: rgba(33, 150, 243, 0.2) !important;';
						} else if (isCropCompatible) {
							// Crop compatible - green outline
							console.log(`Column ${column.headerName} is compatible with Crop table, applying green style`);
							return 'border: 5px solid #4caf50 !important; background-color: rgba(76, 175, 80, 0.2) !important;';
						}
						
						// Default - no special styling
						console.log(`Column ${column.headerName} is not compatible with any table, no style applied`);
						return '';
					})()}
				>
					<div class="column-header">
						<FormatSelectorComponent
							columnData={column.values}
							currentFormat={column.currentFormat}
							currentColumnHeader={column.headerName}
							onformatchange={(event) => {
								// Update column format directly
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
			<tr>
				{#each importedData.columns.filter( (c) => (isTransplant ? c.isToggled : true) ) as column, index}
					<td
						class:greyed-out={isTransplant
							? column.isMapped
							: !(column.isToggled && !column.isGreyed[rowIndex])}
						data-header-name={column.headerName}
						data-column-index={index}
						draggable={!column.isMapped}
						ondragstart={dragstartHandler}
						ondragend={dragEndHandler}
						style={(() => {
							// Skip for already mapped columns
							if (column.isMapped) return '';
							
							// Check if landName is mapped
							const landMapped = importedData.columns.some((c) => c.mappedTo?.includes('land.landName'));
							
							// Check if cropName is mapped
							const cropMapped = importedData.columns.some((c) => c.mappedTo?.includes('crop.cropName'));
							
							// Don't show any borders if neither landName nor cropName has been mapped
							if (!landMapped && !cropMapped) return '';
							
							// Get column indices
							const landColIndex = landMapped ? 
								importedData.columns.findIndex((c) => c.mappedTo?.includes('land.landName')) : -1;
							
							const cropColIndex = cropMapped ? 
								importedData.columns.findIndex((c) => c.mappedTo?.includes('crop.cropName')) : -1;
							
							// Skip for the primary columns themselves
							if ((landMapped && landColIndex !== -1 && column.headerName === importedData.columns[landColIndex].headerName) ||
							    (cropMapped && cropColIndex !== -1 && column.headerName === importedData.columns[cropColIndex].headerName)) {
								return '';
							}
							
							// Check Land compatibility
							let isLandCompatible = false;
							if (landMapped && landColIndex !== -1) {
								const landCol = importedData.columns[landColIndex];
								isLandCompatible = isColumnNormalizedByLand(landCol.values, column.values);
							}
							
							// Check Crop compatibility
							let isCropCompatible = false;
							if (cropMapped && cropColIndex !== -1) {
								const cropCol = importedData.columns[cropColIndex];
								isCropCompatible = isColumnNormalizedByLand(cropCol.values, column.values);
							}
							
							// Apply appropriate styling based on compatibility
							if (isLandCompatible && isCropCompatible) {
								// Both compatible - use a combined style
								return 'border: 3px solid #2196f3 !important; border-bottom: 3px solid #4caf50 !important;';
							} else if (isLandCompatible) {
								// Land compatible - blue outline
								return 'border: 3px solid #2196f3 !important;';
							} else if (isCropCompatible) {
								// Crop compatible - green outline
								return 'border: 3px solid #4caf50 !important;';
							}
							
							// Default - no special styling
							return '';
						})()}
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

<button style="margin-top: 10px; padding: 5px; background-color: #333; color: white;" onclick={() => {
	console.log('Debug button clicked');
	console.log('All columns:', importedData.columns);
	
	// Find all columns with headerName containing 'website'
	const websiteColumns = importedData.columns.filter(c => 
		c.headerName.toLowerCase().includes('website') || 
		c.headerName.toLowerCase().includes('organisation'));
	console.log('Website columns:', websiteColumns);
	
	// Find all headers and apply blue border
	const headers = document.querySelectorAll('th');
	console.log(`Found ${headers.length} headers`);
	
	headers.forEach((header) => {
		const headerName = (header as HTMLElement).dataset.headerName;
		if (headerName && headerName.toLowerCase().includes('website')) {
			console.log(`Applying blue style to ${headerName}`);
			(header as HTMLElement).style.border = '3px solid #2196f3';
			(header as HTMLElement).style.backgroundColor = 'rgba(33, 150, 243, 0.2)';
		}
	});
	
	// Also style all cells for website columns
	const cells = document.querySelectorAll('td');
	console.log(`Found ${cells.length} cells`);
	
	cells.forEach((cell) => {
		const headerName = (cell as HTMLElement).dataset.headerName;
		if (headerName && headerName.toLowerCase().includes('website')) {
			console.log(`Applying blue style to cell for ${headerName}`);
			(cell as HTMLElement).style.border = '3px solid #2196f3';
			(cell as HTMLElement).style.backgroundColor = 'rgba(33, 150, 243, 0.2)';
		}
	});
}}>Apply Blue Border to Website Columns</button>

