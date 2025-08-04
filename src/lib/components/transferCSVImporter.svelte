<script lang="ts">
	import { detectFormat } from './formatDetection2';
	import Papa from 'papaparse';
	import type { ColumnRep } from '$lib/types/columnModel';
	import { BaseColumnModel } from '$lib/types/columnModel';
	import { formatGreyedStatus } from './modelState.svelte';
	import { validateCSVData } from '$lib/schemas/zodValidation';
	import type { ColumnFormat } from '$lib/types/columnModel';

	const { onprocessed } = $props<{
		onprocessed: (data: ColumnRep[]) => void;
	}>();

	let file = $state<File | null>(null);
	let error = $state<string | null>(null);
	let isLoading = $state(false);
	let fileName = $state<string>('');
	let validationWarnings = $state<string[]>([]);
	let fixedRowsCount = $state<number>(0);

	async function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		file = input.files?.[0] ?? null;
		fileName = file?.name || '';

		if (!file) {
			error = 'No file selected';
			return;
		}

		// Reset to transfer mode when loading new CSV
		if (typeof window !== 'undefined') {
			const event = new CustomEvent('resetToTransferMode');
			window.dispatchEvent(event);
		}
		if (file.type !== 'text/csv') {
			error = 'Please upload a CSV file';
			return;
		}
		try {
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

				// First pass: detect formats for each column
				const headers = Object.keys(data[0]);
				const columnFormats: Record<string, ColumnFormat> = {};

				headers.forEach((header) => {
					const columnValues = data.map((row) => row[header]);
					columnFormats[header] = detectFormat(columnValues, header);
				});

				// Validate and clean data using Zod
				const validationResult = validateCSVData(data, columnFormats);

				// Update state with validation results
				validationWarnings = validationResult.warnings;
				fixedRowsCount = validationResult.totalFixed;

				// Use cleaned data for further processing
				const cleanedData = validationResult.validRows;

				// Show validation summary if there were issues
				if (validationResult.invalidRows.length > 0) {
					const invalidCount = validationResult.invalidRows.length;
					validationWarnings.unshift(
						`⚠️ ${invalidCount} rows had validation errors and were skipped`
					);
				}

				if (fixedRowsCount > 0) {
					validationWarnings.unshift(`✅ Auto-fixed data issues in ${fixedRowsCount} rows`);
				}

				// Transform cleaned data into ColumnRep format
				const columnData: ColumnRep[] = headers.map((header) => {
					// Create a column model with detected format
					const columnModel = new BaseColumnModel(header);

					// Add cleaned values
					const tempValues = cleanedData.map((row) => row[header]);
					const detectedFormat = columnFormats[header];

					// Return the column model as a ColumnRep
					return {
						...columnModel,
						type: detectedFormat,
						values: tempValues,
						isGreyed: Array(tempValues.length).fill(false),
						formattedValues: Array(tempValues.length).fill(null)
					};
				});

				// Apply formatting and greyed status
				for (let i = 0; i < columnData.length; ++i) {
					formatGreyedStatus(columnData, i, columnData[i].type as ColumnFormat);
				}

				onprocessed?.(columnData);
			}

			processCSV(results);
		} catch (err) {
			error = 'Failed to parse CSV file';
			console.error('CSV parsing error:', err);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="file-input-container">
	<div
		style="display: flex; flex-direction: column; align-items: flex-start; margin-bottom: -0.8rem;"
	>
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
	</div>
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

{#if validationWarnings.length > 0}
	<div class="validation-summary">
		<h4>Data Validation Summary:</h4>
		<ul>
			{#each validationWarnings.slice(0, 5) as warning}
				<li class="warning">{warning}</li>
			{/each}
			{#if validationWarnings.length > 5}
				<li class="info">...and {validationWarnings.length - 5} more warnings</li>
			{/if}
		</ul>
	</div>
{/if}

<style>
	.validation-summary {
		margin-top: 1rem;
		padding: 0.75rem;
		border-radius: 4px;
		background-color: #f8f9fa;
		border-left: 4px solid #007bff;
	}

	.validation-summary h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.9rem;
		color: #495057;
	}

	.validation-summary ul {
		margin: 0;
		padding-left: 1.2rem;
		font-size: 0.85rem;
	}

	.validation-summary li {
		margin-bottom: 0.25rem;
	}

	.validation-summary .warning {
		color: #856404;
	}

	.validation-summary .info {
		color: #6c757d;
		font-style: italic;
	}

	.error {
		color: #dc3545;
		font-weight: 500;
	}
</style>
