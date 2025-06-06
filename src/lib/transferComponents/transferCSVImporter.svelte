
<script lang="ts">
	import { detectFormat} from './formatDetection2';
	import Papa from 'papaparse';
	import type { ColumnRep } from '$lib/types/columnModel';
	import { BaseColumnModel } from '$lib/types/columnModel';
	import { formatGreyedStatus } from './modelState.svelte';

	const { onprocessed } = $props<{
		onprocessed: (data: ColumnRep[]) => void;
	}>();

	let file = $state<File | null>(null);
	let error = $state<string | null>(null);
	let isLoading = $state(false);
	let fileName = $state<string>('');

	async function handleFileSelect(event: Event) {
		console.log('File select event triggered');
		const input = event.target as HTMLInputElement;
		file = input.files?.[0] ?? null;
		fileName = file?.name || '';

		if (!file) {
			console.log('No file selected');
			error = 'No file selected';
			return;
		}

		// Reset to transfer mode when loading new CSV
		if (typeof window !== 'undefined') {
			const event = new CustomEvent('resetToTransferMode');
			window.dispatchEvent(event);
		}

		console.log('Selected file:', file.name, file.type, file.size + ' bytes');

		if (file.type !== 'text/csv') {
			console.log('Invalid file type:', file.type);
			error = 'Please upload a CSV file';
			return;
		}

		try {
			console.log('Starting CSV parsing');
			isLoading = true;
			error = null;

			const results = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
				Papa.parse(file!, {
					header: true,
					skipEmptyLines: true,
					complete: resolve,
					transform: (value) => value.trim(),
					error: reject
				});
			});

			console.log('CSV parsing completed');

			function processCSV(results: Papa.ParseResult<any>) {
				if (results.errors.length > 0) {
					error = results.errors.map((e) => e.message).join(', ');
					return;
				}

				const data = results.data;
				if (!data || data.length === 0) {
					error = 'No data found in CSV';
					return;
				}

				// Transform data into ColumnRep format
				const headers = Object.keys(data[0]);
				const columnData: ColumnRep[] = headers.map((header) => {
					// Create a string column model with defaults
					const columnModel = new BaseColumnModel(header);

					// Add values manually since we're not using StringColumnModel
					const tempValues = data.map((row) => row[header]);

					// Return the column model as a ColumnRep
					return {
						...columnModel,
						type: 'string', // Default type
						values: tempValues,
						isGreyed: Array(tempValues.length).fill(false),
						formattedValues: Array(tempValues.length).fill(null)
					};
				});
				// CHECKS FORMATTING AND GREYED 25 Apr 2025  9:19 AM
				for (let i = 0; i < columnData.length; ++i) {
					const detectedFormat = detectFormat(columnData[i].values, columnData[i].headerName);
					formatGreyedStatus(columnData, i, detectedFormat);
				}
				console.log('Dispatching processed data:', columnData);
				onprocessed?.(columnData);
			}

			processCSV(results);
		} catch (err) {
			console.error('CSV parsing failed:', err);
			error = 'Failed to parse CSV file';
		} finally {
			console.log('Processing complete');
			isLoading = false;
		}
	}
</script>

<div class="file-input-container">
	<button
		onclick={() => {
			const fileInput = document.getElementById('hidden-file-input');
			if (fileInput) fileInput.click();
		}}
		disabled={isLoading}
	>
		Load CSV
	</button>
	<span style="color: grey; font-size: 0.7rem">{fileName}</span>
	<input
		id="hidden-file-input"
		type="file"
		accept=".csv"
		onchange={handleFileSelect}
		disabled={isLoading}
		hidden
	/>
</div>
{#if error}
	<p class="error">{error}</p>
{/if}

{#if isLoading}
	<p>Loading...</p>
{/if}
