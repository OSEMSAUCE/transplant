<!-- TransForm.svelte -->
<script lang="ts">
  /// <reference lib="dom" />
  /// <reference lib="dom.iterable" />
  
  import '$lib/styles/tables.css';
  import { goto } from '$app/navigation';
  import type { ColumnAnalysis, CsvColumnType } from '$lib/shared/csv/validation/types';
  import { exportToCSV } from './csvExport';
  import Papa from 'papaparse';

  const previewLimit = 1000; // Maximum number of rows to show in preview

  // State management with runes
  let fileName = $state('');
  let totalRows = $state(0);
  let columns = $state<ColumnAnalysis[]>([]);
  let status = $state<'ready' | 'processing' | 'validated' | 'mapped' | 'error'>('ready');
  let error = $state<string | null>(null);

  // Derived state
  let hasData = $derived(columns.length > 0);
  let showPreviewWarning = $derived(totalRows > previewLimit);

  let fileInput: HTMLInputElement;

  interface GpsPoint {
    lat: number;
    lon: number;
  }

  interface ColumnData {
    name: string;
    sampleValues: string[];
    allValues: string[];
    previewValues: string[];
  }

  function parseGpsCoordinate(value: string, lonValue?: string): GpsPoint | null {
    console.log('Parsing GPS:', value, lonValue);
    if (!value) return null;
    const cleaned = value.trim();
    // ... rest of the function
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;
    fileName = file.name;
    status = 'processing';
    error = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      Papa.parse<CsvRow>(csv, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            error = results.errors[0].message;
            return;
          }

          totalRows = results.data.length;
          
          const regularColumns = Object.keys(results.data[0]).map((col) => {
            const values = results.data.map((row) => row[col] || '');
            return {
              name: col,
              allValues: values,
              // ... other properties
            };
          });

          const newColumns = regularColumns.map((col) => {
            const suggestedType = detectValueType(col.allValues);
            const analysis: ColumnAnalysis = {
              name: col.name,
              // ... other properties
            };
            return analysis;
          });

          columns = newColumns;
          status = 'validated';
        },
        error: (error: Error) => {
          error = error.message;
          status = 'error';
        },
      });
    };
    reader.readAsText(file);
  }
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">TransForm - CSV Cleanup</h1>

  <!-- File Upload -->
  <div class="mb-6">
    <input
      type="file"
      accept=".csv"
      bind:this={fileInput}
      on:change={handleFileSelect}
      class="hidden"
    />
    <button
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      on:click={() => fileInput.click()}
    >
      Upload CSV
    </button>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
      {error}
    </div>
  {/if}

  <!-- Data Preview -->
  {#if hasData}
    {#if showPreviewWarning}
      <div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-2 rounded mb-4">
        Showing first {previewLimit} of {totalRows.toLocaleString()} rows in preview
      </div>
    {/if}

    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <table class="data-table">
        <!-- Headers -->
        <tr class="bg-gray-800 text-white">
          {#each columns as column}
            <th>{column.name}</th>
          {/each}
        </tr>

        <!-- Data -->
        {#if columns[0]?.sampleValues}
          {#each columns[0].sampleValues as _value, rowIndex}
            <tr>
              {#each columns as column}
                <td>
                  <div class="value-display">
                    <div class="original-value">{column.sampleValues[rowIndex] || ''}</div>
                  </div>
                </td>
              {/each}
            </tr>
          {/each}
        {/if}
      </table>
    </div>
  {/if}
</div>

<style>
  .value-display {
    @apply p-2;
  }
  
  .data-table {
    @apply w-full;
  }
  
  .data-table th {
    @apply px-4 py-2 text-left;
  }
  
  .data-table td {
    @apply border-t border-gray-200;
  }
</style>
