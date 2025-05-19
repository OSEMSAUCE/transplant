<script lang="ts">
	import NewTableData from '$lib/transferComponents/newTableData.svelte';
	import TransferCSVImporter from '$lib/transferComponents/transferCSVImporter.svelte';
	import type { ColumnRep } from '$lib/types/columnModel';
	import { importedData, setImportedData } from '$lib/transferComponents/modelState.svelte';
	import ToggleComponent from '$lib/transferComponents/ToggleComponent.svelte';
	import NewDbTables from '$lib/transferComponents/newDbTables.svelte';
	import { submitToDB } from '$lib/transferComponents/dbButton';
	let isSubmitting = $state(false);
	let submitResponse = $state<{ success: boolean; error?: string; result?: any } | null>(null);
	

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

	// Make selectors disappear , make new pseudo selectors- appear. Or statement in HTML
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

<div style="display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.2rem;">
	<div>
		<TransferCSVImporter onprocessed={handleProcessed} />
	</div>
	<div style="display: flex; align-items: center; gap: 0.5rem; margin-left: auto;">
		{#if pageIs === 'transfer'}
			<button onclick={changeView}>Send to TransPlant</button>
		{/if}
		{#if pageIs === 'transplant'}
			<button 
				onclick={async () => {
					isSubmitting = true;
					submitResponse = null;
					submitResponse = await submitToDB();
					isSubmitting = false;
				}}
				disabled={isSubmitting}
			>
				{#if isSubmitting}
					<span class="spinner"></span>
				{/if}
				Submit to DB
			</button>
			<button onclick={changeView}>Back to Transfer</button>
			{#if submitResponse}
				<div class={submitResponse.success ? 'success-message' : 'error-message'}>
					{submitResponse.success ? 'Success!' : submitResponse.error}
				</div>
			{/if}
		{/if}
	</div>
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
	<NewDbTables
  {landUserTable}
  {plantingUserTable}
  {cropUserTable}
  {landDbFormat}
  {plantingDbFormat}
  {cropDbFormat}
  
/>
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

<style>
	.spinner {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		margin-right: 0.5rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: #fff;
		animation: spin 1s ease-in-out infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.success-message {
		background-color: #d4edda;
		color: #155724;
		padding: 0.5rem;
		border-radius: 0.25rem;
		margin-left: 0.5rem;
	}

	.error-message {
		background-color: #f8d7da;
		color: #721c24;
		padding: 0.5rem;
		border-radius: 0.25rem;
		margin-left: 0.5rem;
	}
</style>
