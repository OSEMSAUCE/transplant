<script lang="ts">
	import { getColumnCompatibility, findLandColumn, isColumnNormalizedByLand } from './columnNormalizationUtils';
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
			console.log(`Dragging column ${columnName} - compatibility with ${landCol.headerName}: ${compat}`);
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
						// Only show compatibility borders after landName is mapped
						const landMapped = importedData.columns.some(c => c.mappedTo?.includes('land.landName'));
						
						// Don't show borders if land column isn't mapped yet
						if (!landMapped) return '';
						
						// Find the mapped land column
						const landColIndex = importedData.columns.findIndex(c => c.mappedTo?.includes('land.landName'));
						if (landColIndex === -1) return '';
						const landCol = importedData.columns[landColIndex];
						
						// Skip for the land column itself
						if (column.headerName === landCol.headerName) return '';
						
						// Skip for already mapped columns
						if (column.isMapped) return '';
						
						// Check compatibility
						const isNormalized = isColumnNormalizedByLand(landCol.values, column.values);
						console.log(`Column ${column.headerName} normalized by ${landCol.headerName}: ${isNormalized}`);
						
						// Blue for Land-compatible, Green for Planted-only
						if (isNormalized) return 'border: 2px solid #2196f3'; // blue for Land
						return 'border: 2px solid #43a047'; // green for Planted
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
