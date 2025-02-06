<!-- TransForm.svelte -->
<script lang="ts">
  import '$lib/styles/tables.css';
  import { transformStore } from '$lib/shared/csv/stores/transformStore';
  import Papa from 'papaparse';
  import type { CsvColumnType } from '$lib/shared/csv/validation/types';

  let fileInput: HTMLInputElement;
  let selectedFileName = '';

  function parseGpsCoordinate(value: string): number | null {
    if (!value) return null;
    const cleaned = value.trim();

    // Already decimal format
    if (/^-?\d+\.\d+$/.test(cleaned)) {
      return parseFloat(cleaned);
    }

    // DMS format with ° ' "
    const dmsMatch = cleaned.match(/^(-?\d+)°\s*(\d+)'\s*(\d+(\.\d+)?)''/i);
    if (dmsMatch) {
      const degrees = parseFloat(dmsMatch[1]);
      const minutes = parseFloat(dmsMatch[2]);
      const seconds = parseFloat(dmsMatch[3]);
      return degrees + (minutes / 60) + (seconds / 3600);
    }

    // Format like "N41 04 12" or "W0 11 24"
    const dirMatch = cleaned.match(/^([NSEW])?\s*(\d+)\s+(\d+)\s+(\d+(\.\d+)?)/i);
    if (dirMatch) {
      const direction = dirMatch[1]?.toUpperCase() || '';
      const degrees = parseFloat(dirMatch[2]);
      const minutes = parseFloat(dirMatch[3]);
      const seconds = parseFloat(dirMatch[4]);
      let decimal = degrees + (minutes / 60) + (seconds / 3600);
      if (direction === 'S' || direction === 'W') {
        decimal = -decimal;
      }
      return decimal;
    }

    return null;
  }

  function formatGpsCoordinate(value: string): string {
    const decimal = parseGpsCoordinate(value);
    if (decimal !== null) {
      return decimal.toFixed(7);
    }
    return value;
  }

  $: validationState = $transformStore;

  interface CsvRow {
    [key: string]: string;
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;
    
    selectedFileName = file.name;
    transformStore.setFile(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      Papa.parse<CsvRow>(csv, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            transformStore.setError(results.errors[0].message);
            return;
          }

          if (results.data.length === 0) {
            transformStore.setError('No data found in CSV file');
            return;
          }

          function detectType(values: string[]): CsvColumnType {
            // Skip empty values for type detection
            values = values.filter(v => v !== '' && v != null);
            if (values.length === 0) return 'string';

            // Try to detect numbers
            const isNumber = values.every(v => {
              // Remove commas and spaces
              const cleaned = v.replace(/[,\s]/g, '');
              // Check if it's a valid number
              return !isNaN(Number(cleaned)) && cleaned.length > 0;
            });
            if (isNumber) return 'number';

            // Try to detect GPS coordinates
            const isGps = values.every(v => {
              if (!v) return true; // Skip empty values
              
              // Try to parse as GPS coordinate
              const decimal = parseGpsCoordinate(v);
              if (decimal !== null) {
                return decimal >= -180 && decimal <= 180;
              }
              return false;
            });
            if (isGps) return 'gps';

            // Try to detect dates and years
            const isDate = values.every(v => {
              if (!v) return true; // Skip empty values
              try {
                // First check if it's a year between 1970 and 2027
                if (/^\d{4}$/.test(v)) {
                  const year = parseInt(v);
                  if (year >= 1970 && year <= 2027) return true;
                }

                // Handle formats like "6 Feb 25", "6 Feb 2025", "2025-02-06"
                const date = new Date(v);
                if (!isNaN(date.getTime())) return true;

                // Try parsing with custom formats
                const patterns = [
                  /^\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}$/, // 6 Feb 25 or 6 Feb 2025
                  /^\d{4}-\d{2}-\d{2}$/, // 2025-02-06
                  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/ // MM/DD/YY or MM/DD/YYYY
                ];
                return patterns.some(pattern => pattern.test(v));
              } catch {
                return false;
              }
            });
            if (isDate) return 'date';

            // Default to string
            return 'string';
          }

          // Initial analysis of columns
          const previewLimit = 1000;
          const previewData = results.data.slice(0, previewLimit);
          const totalRows = results.data.length;

          const columns = Object.keys(results.data[0]).map((name) => {
            const allValues = results.data.map((row) => row[name] || '');
            const previewValues = previewData.map((row) => row[name] || '');
            const suggestedType = detectType(allValues); // Use all values for type detection
            return {
              name,
              currentType: suggestedType,
              suggestedType,
              confidence: 1,
              sampleValues: previewValues,
              invalidValues: [],
              totalRows,
              validRows: totalRows,
            };
          });

          transformStore.updateAnalysis(columns);
          
          if (totalRows > previewLimit) {
            console.log(`Showing ${previewLimit} of ${totalRows} rows in preview`);
          }
        },
        error: (error) => {
          transformStore.setError(error.message);
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
      on:change={handleFileSelect}
      bind:this={fileInput}
      class="block w-full text-sm text-gray-500
        file:mr-4 file:py-2 file:px-4
        file:rounded-full file:border-0
        file:text-sm file:font-semibold
        file:bg-violet-50 file:text-violet-700
        hover:file:bg-violet-100"
    />
  </div>

  <!-- Analysis Results -->
  {#if validationState.status === 'analyzing'}
    <div class="animate-pulse">
      <p>Analyzing CSV file...</p>
    </div>
  {:else if validationState.status === 'error'}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <p>{validationState.error}</p>
    </div>
  {:else if validationState.columns.length > 0}
    {#if validationState.columns[0].totalRows > 1000}
      <div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-2 rounded mb-4">
        Showing first 1,000 of {validationState.columns[0].totalRows.toLocaleString()} rows in preview
      </div>
    {/if}
    <div class="bg-white shadow-md rounded-lg overflow-hidden">
      <table class="data-table">
          <!-- Type Information -->
          <tr class="bg-gray-800 text-white">
            {#each validationState.columns as column}
              <th>
                <div class="type-container">
                  <span class="type-value">{column.currentType}</span>
                </div>
                <div class="type-container mt-2">
                  <select
                    class="type-select"
                    value={column.suggestedType}
                    on:change={(e) => {
                      column.suggestedType = e.currentTarget.value;
                      transformStore.updateAnalysis(validationState.columns);
                    }}
                  >
                    <option value="string">text</option>
                    <option value="number">number</option>
                    <option value="date">date</option>
                    <option value="gps">gps</option>
                    <option value="email">email</option>
                    <option value="url">url</option>
                  </select>
                </div>
                {#if column.confidence < 1}
                  <div class="confidence-warning">
                    {(column.confidence * 100).toFixed()}% sure
                  </div>
                {/if}
              </th>
            {/each}
          </tr>
          <!-- Column Headers -->
          <tr class="bg-gray-100">
            {#each validationState.columns as column}
              <th>
                {column.name}
              </th>
            {/each}
          </tr>

          <!-- Data Rows -->
          {#if validationState.columns[0]?.sampleValues}
            {#each validationState.columns[0].sampleValues as _, rowIndex}
              <tr>
                {#each validationState.columns as column}
                  <td class:invalid-value={column.invalidValues.includes(column.sampleValues[rowIndex])}>
                    <div class="value-display">
                      <div class="original-value">{column.sampleValues[rowIndex] || ''}</div>
                      {#if column.currentType !== 'string'}
                        <div class="transformed-value">
                          {#if column.currentType === 'number'}
                            {column.sampleValues[rowIndex] ? Number(column.sampleValues[rowIndex].replace(/[,\s]/g, '')).toLocaleString() : ''}
                          {:else if column.currentType === 'date'}
                            {#if column.sampleValues[rowIndex]}
                              {(() => {
                                try {
                                  const value = column.sampleValues[rowIndex];
                                  // Check if it's just a year
                                  if (/^\d{4}$/.test(value)) {
                                    const year = parseInt(value);
                                    if (year >= 1970 && year <= 2027) {
                                      return new Date(year, 0, 1).toISOString();
                                    }
                                  }

                                  // Handle other date formats
                                  const date = new Date(value);
                                  if (!isNaN(date.getTime())) {
                                    return date.toISOString();
                                  }
                                  return null; // Don't show transformed if we can't parse
                                } catch {
                                  return null; // Don't show transformed if we can't parse
                                }
                              })()}
                            {/if}
                          {:else if column.currentType === 'gps'}
                            {(() => {
                              const transformed = formatGpsCoordinate(column.sampleValues[rowIndex]);
                              return transformed !== column.sampleValues[rowIndex] ? transformed : null;
                            })()}
                          {/if}
                        </div>
                      {/if}
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
  /* Value display styles */
  .value-display {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .original-value {
    font-weight: normal;
  }

  .transformed-value {
    font-size: 0.875rem;
    color: #6B7280;
    font-style: italic;
  }
</style>
