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

  // Types for upload state management
  interface UploadedColumn {
    uploadColumnName: string;
    uploadDataType: 'string' | 'number' | 'gps' | 'date' | 'boolean';
    uploadValues: string[];
    mappedTo?: {
      targetTable: 'land' | 'crop' | 'planting' | 'species' | 'organization';
      targetField: string;
    };
  }

  // State management with runes
  let fileName = $state('');
  let totalRows = $state(0);
  let columns = $state<ColumnAnalysis[]>([]);
  let status = $state<'ready' | 'processing' | 'validated' | 'mapped' | 'error'>('ready');
  let error = $state<string | null>(null);
  let uploadColumns = $state<UploadedColumn[]>([]);

  // State management functions
  function resetUploadState() {
    fileName = '';
    totalRows = 0;
    columns = [];
    status = 'ready';
    error = null;
    uploadColumns = [];
  }

  function updateUploadState(newData: Partial<typeof uploadState>) {
    if (newData.fileName !== undefined) fileName = newData.fileName;
    if (newData.totalRows !== undefined) totalRows = newData.totalRows;
    if (newData.columns !== undefined) columns = newData.columns;
    if (newData.status !== undefined) status = newData.status;
    if (newData.uploadColumns !== undefined) uploadColumns = newData.uploadColumns;
  }

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

<main class="container">
  <h1>TransForm - CSV Cleanup</h1>

  <!-- File Upload -->
  <article>
    <input
      type="file"
      accept=".csv"
      bind:this={fileInput}
      on:change={handleFileSelect}
      style="display: none;"
    />
    <button
      class="primary"
      on:click={() => fileInput.click()}
    >
      Upload CSV
    </button>
  </article>

  <!-- Error Display -->
  {#if error}
    <article class="error">
      {error}
    </article>
  {/if}

  <!-- Data Preview -->
  {#if hasData}
    {#if showPreviewWarning}
      <article class="info">
        Showing first {previewLimit} of {totalRows.toLocaleString()} rows in preview
      </article>
    {/if}

    <article>
      <table class="data-table">
        <!-- Headers -->
        <thead>
          <tr>
            {#each columns as column}
              <th scope="col">{column.name}</th>
            {/each}
          </tr>
        </thead>

        <!-- Data -->
        <tbody>
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
        </tbody>
      </table>
    </article>
  {/if}
</main>

<style>
  article.error {
    background: var(--del-background-color);
    border-color: var(--del-color);
    color: var(--del-color);
  }

  article.info {
    background: var(--ins-background-color);
    border-color: var(--ins-color);
    color: var(--ins-color);
  }
</style>
