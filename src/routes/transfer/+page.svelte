<script lang="ts">
	import NewTableData from '$lib/transferComponents/newTableData.svelte';
	import TransferCSVImporter from '$lib/transferComponents/transferCSVImporter.svelte';
	import type { ColumnRep } from '$lib/types/columnModel';
	import { importedData, setImportedData } from '$lib/transferComponents/modelState.svelte';
	import ToggleComponent from '$lib/transferComponents/ToggleComponent.svelte';
	import NewDbTables from '$lib/transferComponents/newDbTables.svelte';
	

	const { data } = $props();

	const landUserTable = $derived(data?.landsDbTable || []);
	const plantingUserTable = $derived(data?.plantingDbTable || []);
	const cropUserTable = $derived(data?.cropDbTable || []);
	const landDbFormat = $derived(data?.landDbFormat || 'string');
	const plantingDbFormat = $derived(data?.plantingDbFormat || 'string');
	const cropDbFormat = $derived(data?.cropDbFormat || 'string');

	let pageIs = $state<'transfer' | 'transplant'>('transfer');
	function handleProcessed(csvImportToPage: ColumnRep[]) {
		setImportedData(csvImportToPage || []);
	}
	// Get column data
	function getColumnData(column: ColumnRep): Array<string | number | null> {
		console.log(`Processing column: ${column.headerName}`);
		// Return the values array directly since it's already part of ColumnRep
		return column.values ?? [];
	}
	// Whenever select dropdown changes, this updates. Handle format changes
	export function formatEvent(
		column: ColumnRep,
		event: CustomEvent<{ destinationFormat: string; headerName: string }>
	) {
		// this is dropdown value user chose.
		const selectedFormat = event.detail.destinationFormat as 'string' | 'number' | 'date' | 'gps';
		console.log(`Called from format event from table: ${selectedFormat}`);
		// Update column format in state
		// might be better to update main model
		column.currentFormat = selectedFormat;
		column.isFormatted = true;
	}
	// TRANSPLANT 🌲️🌲️🌳️🌳️🌴️🌲️🌲️🌳️🌳️🌴️🌲️🌲️🌳️🌳️🌴️🌲️🌲️🌳️🌳️🌴️🌲️🌲️🌳️🌳️🌴️🌲️🌲️🌳️🌳️🌴️🌲️🌲️🌳️🌳️🌴️

	// Make selectors disappear , make new psuedo selectors- appear. Or statement in HTML
	// make toggles disappear
	// make table dragable
	// load db tables.

	function changeView() {
		if (pageIs === 'transplant') {
			pageIs = 'transfer';
		} else {
			pageIs = 'transplant';
		}
		console.log('Page view changed to:', pageIs);
	}

	// Listen for reset to transfer mode event
	if (typeof window !== 'undefined') {
		window.addEventListener('resetToTransferMode', () => {
			if (pageIs === 'transplant') {
				pageIs = 'transfer';
				console.log('Reset to transfer mode from CSV import');
			}
		});
	}
</script>

<div
	style="display: flex; justify-content: space-between; align-items: center; gap: 0.1rem; margin-bottom: 1rem"
>
	<TransferCSVImporter onprocessed={handleProcessed} />

	{#if pageIs === 'transfer'}
		<button style="margin-left: auto" onclick={changeView}> Send to TransPlant </button>
	{:else}
		<button style="margin-left: auto" onclick={changeView}> Back to Transfer </button>
	{/if}
</div>

{#if importedData.columns.length > 0}
	<div class="table-container">
		<div class="table-header">
			{#if pageIs === 'transfer'}
				<div class="toggle-row">
					{#each importedData.columns as column}
						<ToggleComponent
							columnHeader={column.headerName}
							onToggle={(columnHeader, isActive) => (column.isToggled = isActive)}
						/>
					{/each}
				</div>
			{/if}

		</div>

		<NewTableData {pageIs} />
	</div>

	{#if pageIs === 'transplant'}
		<NewDbTables {landUserTable} {plantingUserTable} {cropUserTable} {landDbFormat} {plantingDbFormat} {cropDbFormat} />
	{/if}
{/if}

{#if importedData.columns}
	<h2>Current Column Model State</h2>
	<pre>
		{JSON.stringify(
			importedData.columns.map((col) => ({
				headerName: col.headerName,
				type: col.type,
				currentFormat: col.currentFormat, // Add this
				isToggled: col.isToggled,
				isGreyed: col.isGreyed.slice(0, 3),
				formattedValues: col.formattedValues.slice(0, 3),
				isMapped: col.isMapped,
				mappedTo: col.mappedTo,
				isFormatted: col.isFormatted,
				selectFormatCoercion: col.selectFormatCoercion, // Updated name
				wasFormatCoerced: col.wasFormatCoerced, // Updated name
				values: col.values.slice(0, 3)
			})),
			null,
			2
		)}
	  </pre>
{/if}
