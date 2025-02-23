<script lang="ts">
	/// <reference types="svelte" />
	import { createEventDispatcher } from 'svelte';
	import type { HTMLSelectElement } from 'svelte/elements';
	import ToggleOff from './toggleOff.svelte';
	import GpsColumn from './GpsColumn.svelte';

	let toggledColumns = $state<Record<string, boolean>>({});

	function handleColumnToggle(columnHeader: string, isActive: boolean) {
		toggledColumns = { ...toggledColumns, [columnHeader]: !isActive };
		console.log('Column toggled:', columnHeader, isActive);
	}

	const { rows, invalidCells, columnTypes } = $props<{
		rows: Record<string, string>[];
		invalidCells: Record<string, Set<number>>;
		columnTypes: Record<string, string>;
	}>();

	let columnHeaders = $derived(rows.length > 0 ? Object.keys(rows[0]) : []);
	let previewRows = $derived(rows.slice(0, 500));

	const dispatch = createEventDispatcher<{
		typeChange: { columnHeader: string; type: string };
	}>();

	function handleTypeChange(columnHeader: string, event: Event) {
		const select = event.target as HTMLSelectElement;
		dispatch('typeChange', { columnHeader, type: select.value });
	}

	function isGreyedOut(columnHeader: string, rowIndex: number): boolean {
		return toggledColumns[columnHeader] || invalidCells[columnHeader]?.has(rowIndex);
	}
</script>

<div>
	<div class="header-container">
		<div class="header-actions">
			<slot name="file-input" />
		</div>
	</div>
	<div class="table-container">
		<table>
			<thead>
				<tr class="header-text">
					<th>
						<div class="header-name">GPS</div>
					</th>
					{#each columnHeaders as columnHeader}
						<th>
							<div class="header-controls">
								<ToggleOff {columnHeader} onToggle={handleColumnToggle} />
								<select
									value={columnTypes[columnHeader]}
									onchange={(e) => handleTypeChange(columnHeader, e)}
								>
									<option value="string">Text</option>
									<option value="number">Number</option>
									<option value="date">Date</option>
									<option value="gps">GPS</option>
									<option value="latitude">Latitude</option>
									<option value="longitude">Longitude</option>
									<option value="delete">Delete</option>
								</select>
							</div>
							<div class="header-name">
								{columnHeader}
							</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each previewRows as row, rowIndex (rowIndex)}
					<tr>
						<GpsColumn
							{row}
							{columnHeaders}
							{toggledColumns}
							{columnTypes}
							{invalidCells}
							{rowIndex}
						/>
						{#each columnHeaders as columnHeader (columnHeader)}
							<td
								class:number-cell={columnTypes[columnHeader] === 'number'}
								class:coord-cell={columnTypes[columnHeader] === 'latitude' ||
									columnTypes[columnHeader] === 'longitude'}
								class:greyed-out={isGreyedOut(columnHeader, rowIndex)}
							>
								{row[columnHeader]}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.table-container {
		overflow-x: auto;
		max-width: 100%;
	}

	.number-cell {
		text-align: right;
	}

	.greyed-out {
		opacity: 0.5;
		background-color: #f8f8f8;
	}
	
	.header-container {
		margin-bottom: 1rem;
	}

	.header-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}
</style>
