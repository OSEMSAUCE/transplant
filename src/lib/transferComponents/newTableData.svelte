<script lang="ts">
	import type { ColumnRep } from '$lib/types/columnModel';
	import FormatSelectorComponent from './FormatSelectorComponent.svelte';
	import { importedData } from '$lib/transferComponents/modelState.svelte';
	import { formatValue, matchesFormat } from './newFormatDetection';

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

		// Add class to all cells in this column
		document
			.querySelectorAll(`[data-column-index="${columnIndex}"]`)
			.forEach((el) => el.classList.add('dragging'));

		// Create a drag image showing the header and first few rows
		const dragPreview = document.createElement('div');
		dragPreview.className = 'drag-preview';
		dragPreview.innerHTML = `
			<div class="preview-header">${columnName}</div>
			${importedData.columns[columnIndex]?.values.slice(0, 3)
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
	}
</script>

<table>
	<thead>
		<tr>
			{#each importedData.columns.filter( (c) => (isTransplant ? c.isToggled : true) ) as column, index}
				<th
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
								// Update column format directly
								const selectedFormat = event.detail.destinationFormat;
								column.currentFormat = selectedFormat;
								column.isFormatted = true;
							}}
							{isTransplant}
							isToggled={column.isToggled}
						/>
						<div style="height: 0.5rem"></div>
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
				class:greyed-out={isTransplant ? column.isMapped : !(column.isToggled && !column.isGreyed[rowIndex])}
				data-header-name={column.headerName}
				data-column-index={index}
				draggable={!column.isMapped}
				ondragstart={dragstartHandler}
				ondragend={dragEndHandler}
			>
						{#if isTransplant && (column.isGreyed[rowIndex] || !column.isToggled)}

							<!-- Empty cell when greyed in transplant mode -->
						{:else}
							{column.formattedValues[rowIndex] === null ? column.values[rowIndex] : column.formattedValues[rowIndex]}
						{/if}
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

