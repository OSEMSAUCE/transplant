<script lang="ts">
	import { importedData } from '$lib/transferComponents/modelState.svelte';
	import { formatValue, matchesFormat } from './newFormatDetection';
	import FormatSelectorComponent from './FormatSelectorComponent.svelte';

	const { landUserTable, plantingUserTable, cropUserTable, landDbFormat, plantingDbFormat, cropDbFormat } = $props<{
		landUserTable: any[];
		plantingUserTable: any[];
		cropUserTable: any[];
		landDbFormat: Record<string, string>;
		plantingDbFormat: Record<string, string>;
		cropDbFormat: Record<string, string>;
	}>();

	const landColumns = Object.keys(landUserTable[0] || {});
	const plantingColumns = Object.keys(plantingUserTable[0] || {});
	const cropColumns = Object.keys(cropUserTable[0] || {});

	function clearDbColumn(dbTable: TableColumn[], index: number) {
		dbTable[index].values = ['', '', ''];
		importedData.columns[dbTable[index].modelRepColumnIndex].isMapped = false;
		importedData.columns[dbTable[index].modelRepColumnIndex].mappedTo = undefined;
		dbTable[index].modelRepColumnIndex = -1;
		console.log("clicked")
	}

	interface TableColumn {
		name: string;
		values: unknown[]; // Changed from never[] to unknown[]
		modelRepColumnIndex: number;
	}

	let plantingTable = $state<TableColumn[]>(createColumnState(plantingColumns));
	let landTable = $state<TableColumn[]>(createColumnState(landColumns));
	let cropTable = $state<TableColumn[]>(createColumnState(cropColumns));

	function createColumnState(columns: string[]) {
		return columns.map((column) => ({
			name: column,
			values: ['', '', ''],
			modelRepColumnIndex: -1
		}));
	}

	// 🌲️🌲️🌳️🌳️🌴️ DRAG DROP THING 🌲️🌲️🌳️🌳️🌴️
	// DONEwrite a function to say when a user clicks a cell, figure out what column it's in.
	// DONEwe need columns to be one unit that's draggable
	// DONEchange the visual representation of the column
	// DONEuser drags column data to a db table.
	// DONEwhen they drop data on the db table it needs to:
	// DONEin state it populate on that attribute on the db table.
	// in the view it must also populate on that attribute on the db table.
	// we need stat to update on "mapping" property
	// It also need to be normalized trees and land dont repeat
	// 	for planting table it needs to keep the relationship between land and tree(crop)

	$inspect(plantingTable);

	function dragoverHandler(ev: DragEvent) {
		ev.preventDefault();
	}

	// 18 Apr 2025 9:02 AM  Get state from top table and update local $state here.
	function dropHandler(ev: DragEvent, dbDropTable: TableColumn[]) {
		if (!ev.dataTransfer || !ev.target) return;
		ev.preventDefault();
		const draggedColumnIndex = Number(ev.dataTransfer.getData('text'));
		const targetColumnIndex = Number((ev.target as HTMLElement).dataset.columnIndex);
		dbDropTable[targetColumnIndex].modelRepColumnIndex = draggedColumnIndex;
		importedData.columns[draggedColumnIndex].isMapped = true;
		importedData.columns[draggedColumnIndex].mappedTo = `${dbDropTable[targetColumnIndex].name}`;
	}

	function plantingDropHandler(ev: DragEvent) {
		dropHandler(ev, plantingTable);
	}

	function landDropHandler(ev: DragEvent) {
		dropHandler(ev, landTable);
	}

	function cropDropHandler(ev: DragEvent) {
		dropHandler(ev, cropTable);
	}

</script>

<h3>Planting Table</h3>
<table>
	<thead>
		<tr>
			{#each plantingTable as column, index}
				<th
					data-header-name={column.name}
					data-column-index={index}
					ondragover={dragoverHandler}
					ondrop={plantingDropHandler}
				>
				<div class="column-header">
					<FormatSelectorComponent
					columnData={[]}
					currentFormat={plantingDbFormat[column.name]}
					currentColumnHeader={column.name}
					onformatchange={(event) => {
					}}
						isTransplant={true}
						isToggled={true}
					/>
						{column.name}
						<span onclick={() => clearDbColumn(plantingTable, index)} class="material-symbols-outlined">cancel</span>
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
						ondragover={dragoverHandler}
						ondrop={plantingDropHandler}
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

<h3>Land Table</h3>
<table>
	<thead>
		<tr>
			{#each landTable as column, index}
				<th
					data-header-name={column.name}
					data-column-index={index}
					ondragover={dragoverHandler}
					ondrop={landDropHandler}>{column.name}</th
				>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each importedData.columns[0].values.slice(0, 3) as _, rowIndex}
			<tr>
				{#each landTable as column, index}
					<td
						data-header-name={column.name}
						data-column-index={index}
						ondragover={dragoverHandler}
						ondrop={landDropHandler}
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

<h3>Crop Table</h3>
<table>
	<thead>
		<tr>
			{#each cropTable as column, index}
				<th
					data-header-name={column.name}
					data-column-index={index}
					ondragover={dragoverHandler}
					ondrop={cropDropHandler}>{column.name}</th
				>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each importedData.columns[0].values.slice(0, 3) as _, rowIndex}
			<tr>
				{#each cropTable as column, index}
					<td
						data-header-name={column.name}
						data-column-index={index}
						ondragover={dragoverHandler}
						ondrop={cropDropHandler}
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

