<script lang="ts">
	// 29 Apr 2025  To DO 9:04 AM
	// make drag drop prevent wrog types
	// go to newTablesData - dragstartHandler - make a dynamic class thing to show user wrong types.
	import { importedData } from '$lib/transferComponents/modelState.svelte';
	import FormatSelectorComponent from './FormatSelectorComponent.svelte';
	import { dragColumnState } from '$lib/transferComponents/modelState.svelte';
	import type { ColumnFormat } from '$lib/types/columnModel';

	const {
		landUserTable,
		plantingUserTable,
		cropUserTable,
		landDbFormat,
		plantingDbFormat,
		cropDbFormat,
		landsDbTable,
		cropsDbTable
	} = $props<{
		landUserTable: any[];
		plantingUserTable: any[];
		cropUserTable: any[];
		landDbFormat: Record<string, string>;
		plantingDbFormat: Record<string, string>;
		cropDbFormat: Record<string, string>;
		landsDbTable: { landId: string; landName: string }[];
		cropsDbTable: { cropId: string; cropName: string }[];
	}>();

	function getLandNameById(landId: string) {
		return landsDbTable.find((l) => l.landId === landId)?.landName || landId;
	}
	function getCropNameById(cropId: string) {
		return cropsDbTable.find((c) => c.cropId === cropId)?.cropName || cropId;
	}

	const plantingColumns = [
		'landName', // Show this instead of landId
		'cropName', // Show this instead of cropId
		'planted',
		'plantingDate'
		// ...any other fields you want
	];
	const landColumns = [
		'landName',
		'hectares',
		'landHolder',
		'gpsLat',
		'gpsLon',
		'landNotes'
		// "preparation",
		// "polygon",
		// "preparationType",
	];
	const cropColumns = [
		'cropName',
		'speciesId',
		// "species",
		'seed_info',
		'cropStock',
		'cropNotes'
	];

	function clearDbColumn(dbTable: TableColumn[], index: number) {
		dbTable[index].values = ['', '', ''];
		importedData.columns[dbTable[index].modelRepColumnIndex].isMapped = false;
		importedData.columns[dbTable[index].modelRepColumnIndex].mappedTo = undefined;
		dbTable[index].modelRepColumnIndex = -1;
		console.log('clicked');
	}

	interface TableColumn {
		name: string;
		values: unknown[]; // Changed from never[] to unknown[]
		modelRepColumnIndex: number;
		viewOnly: boolean;
	}

	let plantingTable = $state<TableColumn[]>(createColumnState(plantingColumns));
	let landTable = $state<TableColumn[]>(createColumnState(landColumns, ['landName']));
	let cropTable = $state<TableColumn[]>(createColumnState(cropColumns, ['cropName']));

	function createColumnState(columns: string[], viewOnlyFields: string[] = []): TableColumn[] {
		return columns.map(col => ({
			name: col,
			values: ['', '', ''],
			modelRepColumnIndex: -1,
			viewOnly: viewOnlyFields.includes(col)
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
	function dropHandler(ev: DragEvent, dbDropTable: TableColumn[], dropFormat: Record<string, string>) {
		if (!ev.dataTransfer || !ev.target) return;
		ev.preventDefault();
		const draggedColumnIndex = Number(ev.dataTransfer.getData('text'));
		const targetColumnIndex = Number((ev.target as HTMLElement).dataset.columnIndex);
		const targetColumnName = dbDropTable[targetColumnIndex].name;
		
		// Don't allow dropping on view-only fields
		if (dbDropTable[targetColumnIndex].viewOnly) {
			console.log('Cannot map to view-only field');
			return;
		}
		
		const draggedColumnFormat = importedData.columns[draggedColumnIndex].currentFormat;
		const targetColumnFormat = dropFormat[targetColumnName];
		if (draggedColumnFormat !== targetColumnFormat) {
			console.log('Formats do not match');
			return;
		}
		if (dbDropTable[targetColumnIndex].modelRepColumnIndex !== -1) {
			importedData.columns[dbDropTable[targetColumnIndex].modelRepColumnIndex].isMapped = false;
			importedData.columns[dbDropTable[targetColumnIndex].modelRepColumnIndex].mappedTo = undefined;
		}
		dbDropTable[targetColumnIndex].modelRepColumnIndex = draggedColumnIndex;
		importedData.columns[draggedColumnIndex].isMapped = true;
		importedData.columns[draggedColumnIndex].mappedTo = targetColumnName;
		
		// Propagate landName and cropName between tables
		if (targetColumnName === 'landName' && dbDropTable === plantingTable) {
			// Find landName in landTable and update it
			const landNameIndex = landTable.findIndex(col => col.name === 'landName');
			if (landNameIndex !== -1) {
				landTable[landNameIndex].modelRepColumnIndex = draggedColumnIndex;
			}
		} else if (targetColumnName === 'cropName' && dbDropTable === plantingTable) {
			// Find cropName in cropTable and update it
			const cropNameIndex = cropTable.findIndex(col => col.name === 'cropName');
			if (cropNameIndex !== -1) {
				cropTable[cropNameIndex].modelRepColumnIndex = draggedColumnIndex;
			}
		}
		
		console.log(`Mapped column ${importedData.columns[draggedColumnIndex].headerName} to ${importedData.columns[draggedColumnIndex].mappedTo}`);
		console.log(
			`Mapped column ${importedData.columns[draggedColumnIndex].headerName} to ${importedData.columns[draggedColumnIndex].mappedTo}`
		);
	}

	function plantingDropHandler(ev: DragEvent) {
		dropHandler(ev, plantingTable, plantingDbFormat);
	}

	function landDropHandler(ev: DragEvent) {
		dropHandler(ev, landTable, landDbFormat);
	}

	function cropDropHandler(ev: DragEvent) {
		dropHandler(ev, cropTable, cropDbFormat);
	}
</script>

<style>
  .view-only {
    background-color: #f0f0f0;
    cursor: not-allowed;
  }
  
  .badge {
    font-size: 0.7rem;
    background-color: #6c757d;
    color: white;
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
    margin-left: 0.3rem;
  }
</style>

<h3>Planting Table</h3>
<table>
	<thead>
		<tr>
			{#each plantingTable as column, index}
				<th
					data-header-name={column.name}
					data-column-index={index}
					ondragover={column.viewOnly ? null : dragoverHandler}
					ondrop={column.viewOnly ? null : plantingDropHandler}
					class:legal-droptarget={!column.viewOnly && dragColumnState.currentFormat === plantingDbFormat[column.name] && column.modelRepColumnIndex === -1}
					class:view-only={column.viewOnly}
				>
					<div class="column-header">
						<FormatSelectorComponent
							columnData={[]}
							currentFormat={plantingDbFormat[column.name]}
							currentColumnHeader={column.name}
							onformatchange={(event) => {}}
							isTransplant={true}
							isToggled={true}
						/>
						{column.name}
						{#if !column.viewOnly}
						<span onclick={() => clearDbColumn(plantingTable, index)} class="material-symbols-outlined">cancel</span>
						{:else}
						<span class="badge">view only</span>
						{/if}
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
						ondragover={column.viewOnly ? null : dragoverHandler}
						ondrop={column.viewOnly ? null : plantingDropHandler}
						class:legal-droptarget={!column.viewOnly && dragColumnState.currentFormat === plantingDbFormat[column.name] && column.modelRepColumnIndex === -1}
						class:view-only={column.viewOnly}
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
					ondragover={column.viewOnly ? null : dragoverHandler}
					ondrop={column.viewOnly ? null : landDropHandler}
					class:legal-droptarget={!column.viewOnly && dragColumnState.currentFormat === landDbFormat[column.name] && column.modelRepColumnIndex === -1}
					class:view-only={column.viewOnly}
				>
					<div class="column-header">
						<FormatSelectorComponent
							columnData={[]}
							currentFormat={landDbFormat[column.name]}
							currentColumnHeader={column.name}
							onformatchange={(event) => {}}
							isTransplant={true}
							isToggled={true}
						/>
						{column.name}
						{#if !column.viewOnly}
						<span onclick={() => clearDbColumn(landTable, index)} class="material-symbols-outlined">cancel</span>
						{:else}
						<span class="badge">view only</span>
						{/if}
					</div>
				</th>
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
						ondragover={column.viewOnly ? null : dragoverHandler}
						ondrop={column.viewOnly ? null : landDropHandler}
						class:legal-droptarget={!column.viewOnly && dragColumnState.currentFormat === landDbFormat[column.name] && column.modelRepColumnIndex === -1}
						class:view-only={column.viewOnly}
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
					ondragover={column.viewOnly ? null : dragoverHandler}
					ondrop={column.viewOnly ? null : cropDropHandler}
					class:legal-droptarget={!column.viewOnly && dragColumnState.currentFormat === cropDbFormat[column.name] && column.modelRepColumnIndex === -1}
					class:view-only={column.viewOnly}
				>
					<div class="column-header">
						<FormatSelectorComponent
							columnData={[]}
							currentFormat={cropDbFormat[column.name]}
							currentColumnHeader={column.name}
							onformatchange={(event) => {}}
							isTransplant={true}
							isToggled={true}
						/>
						{column.name}
						{#if !column.viewOnly}
						<span onclick={() => clearDbColumn(cropTable, index)} class="material-symbols-outlined">cancel</span>
						{:else}
						<span class="badge">view only</span>
						{/if}
					</div>
				</th>
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
						class:legal-droptarget={dragColumnState.currentFormat === cropDbFormat[column.name] &&
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
	</tbody>
</table>
