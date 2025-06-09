<script lang="ts">
	import { tick } from 'svelte';
	import TopForm from '$lib/transferComponents/topForm.svelte';

	// let projectName = $state('');
	// let organizationName = $state('');
	// let projectNotes = $state('');
	let projectName = $state('');
	let projectNotes = $state('');
	let organizationName = $state('');
	let source = $state('');

	// Effect to monitor changes to project metadata
	$effect(() => {
		console.log('Project metadata changed in +page.svelte:', {
			projectName,
			organizationName,
			projectNotes
		});
	});

	const addProjectName = (projectName: string, organizationName: string, projectNotes?: string) => {
		console.log('projectName', projectName);
		console.log('organizationName', organizationName);
		console.log('projectNotes', projectNotes);
	};

	let copied = $state(false);
	function copyColumnModelJson() {
		const json = JSON.stringify(
			importedData.columns.map((col) => ({
				headerName: col.headerName,
				type: col.type,
				currentFormat: col.currentFormat,
				isToggled: col.isToggled,
				isGreyed: col.isGreyed.slice(0, 3),
				formattedValues: col.formattedValues.slice(0, 3),
				isMapped: col.isMapped,
				mappedTo: col.mappedTo,
				isFormatted: col.isFormatted,
				selectFormatCoercion: col.selectFormatCoercion,
				wasFormatCoerced: col.wasFormatCoerced,
				values: col.values.slice(0, 3)
			})),
			null,
			2
		);
		navigator.clipboard.writeText(json).then(async () => {
			copied = true;
			await tick();
			setTimeout(() => (copied = false), 1200);
		});
	}

	import TpCsvTable from '$lib/transferComponents/TpCsvTable.svelte';
	import TransferCSVImporter from '$lib/transferComponents/transferCSVImporter.svelte';
	import type { ColumnRep } from '$lib/types/columnModel';
	import { importedData, setImportedData } from '$lib/transferComponents/modelState.svelte';
	import ToggleComponent from '$lib/transferComponents/ToggleComponent.svelte';
	import TpDbTables from '$lib/transferComponents/TpDbTables.svelte';
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

<TopForm
	{projectName}
	{organizationName}
	{projectNotes}
	{source}
	updateProjectData={(data) => {
		console.log('updateProjectData called with:', data);
		projectName = data.projectName;
		organizationName = data.organizationName;
		projectNotes = data.projectNotes;
		source = data.source ?? ''; // Add this line!
		console.log('Project metadata changed in +page.svelte:', data);
	}}
/>

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
					console.log('submitting to DB');
					console.log(projectName, organizationName, projectNotes);
					isSubmitting = true;
					submitResponse = null;
					submitResponse = await submitToDB(projectName, organizationName, projectNotes);
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

{#if pageIs === 'transplant'}
	<h5 style="text-align: center">~~~~~~~~~~~~~~~~~~~~~ CSV Import ~~~~~~~~~~~~~~~~~~~~~</h5>
{/if}

{#if importedData.columns.length > 0}
	<div class="table-container">
		<div class="table-header">
			{#if pageIs === 'transfer'}
				<div class="toggle-row">
					<!-- Empty placeholder for GPS column alignment -->
					<div class="column-toggle" style="visibility: hidden;"></div>
					{#each importedData.columns as column}
						<ToggleComponent
							columnHeader={column.headerName}
							onToggle={(columnHeader, isActive) => (column.isToggled = isActive)}
						/>
					{/each}
				</div>
			{/if}
		</div>

		<TpCsvTable {pageIs} />
	</div>

	{#if pageIs === 'transplant'}
		<h5 style="text-align: center">~~~~~~~~~~~~~~~~~~~~~ Database Tables ~~~~~~~~~~~~~~~~~~~~~</h5>
	{/if}

	{#if pageIs === 'transplant'}
		<TpDbTables
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
	<div style="display: flex; align-items: center; gap: 1.5rem; margin-top: 1.5rem;">
		<button
			aria-label="Copy column model JSON"
			style="background: none; border: none; cursor: pointer; padding: 0; font-size: 1.2rem;"
			onclick={copyColumnModelJson}
			title="Copy JSON to clipboard"
		>
			📋
		</button>
		<h3 style="margin: 0;">Current Column Model State</h3>
	</div>
	<pre>
		{JSON.stringify(
			importedData.columns.map((col) => ({
				headerName: col.headerName,
				type: col.type,
				currentFormat: col.currentFormat,
				isToggled: col.isToggled,
				isGreyed: col.isGreyed.slice(0, 3),
				formattedValues: col.formattedValues.slice(0, 3),
				isMapped: col.isMapped,
				mappedTo: col.mappedTo,
				isFormatted: col.isFormatted,
				selectFormatCoercion: col.selectFormatCoercion, // Updated name
				wasFormatCoerced: col.wasFormatCoerced // Updated name
			})),
			null,
			2
		)}
	</pre>
{/if}

<style>
	.spinner {
		display: inline-block;

		height: 1rem;
		margin-right: 0.5rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: #fff;
		animation: spin 1s ease-in-out infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
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
