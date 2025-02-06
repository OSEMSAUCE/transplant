<!-- TransForm.svelte -->
<script lang="ts">
  import '$lib/styles/tables.css';
  import { transformStore } from '$lib/shared/csv/stores/transformStore';
  import Papa from 'papaparse';
  import type { CsvColumnType } from '$lib/shared/csv/validation/types';

  let fileInput: HTMLInputElement;
  let selectedFileName = '';

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

            // Try to detect dates in various formats
            const isDate = values.every(v => {
              // Try different date formats
              try {
                // Handle formats like "6 Feb 25", "6 Feb 2025", "2025-02-06"
                const date = new Date(v);
                if (!isNaN(date.getTime())) return true;

                // Try parsing with custom formats if needed
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
          const columns = Object.keys(results.data[0]).map((name) => {
            const sampleValues = results.data.slice(0, 5).map((row) => row[name] || '');
            const suggestedType = detectType(sampleValues);
            return {
            name,
            currentType: suggestedType,
            suggestedType,
            confidence: 1,
            sampleValues,
            invalidValues: [],
            totalRows: results.data.length,
            validRows: results.data.length,
          };
          });

          transformStore.updateAnalysis(columns);
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
                    {#if column.currentType === 'number'}
                      {column.sampleValues[rowIndex] ? Number(column.sampleValues[rowIndex].replace(/[,\s]/g, '')).toLocaleString() : ''}
                    {:else if column.currentType === 'date'}
                      {#if column.sampleValues[rowIndex]}
                        {(() => {
                          try {
                            const date = new Date(column.sampleValues[rowIndex]);
                            if (!isNaN(date.getTime())) {
                              return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                            }
                            return column.sampleValues[rowIndex];
                          } catch {
                            return column.sampleValues[rowIndex];
                          }
                        })()}
                      {/if}
                    {:else if column.currentType === 'gps'}
                      {#if column.sampleValues[rowIndex]}
                        {(() => {
                          const cleaned = column.sampleValues[rowIndex].replace(/[°'"\s]/g, '');
                          const num = Number(cleaned);
                          return !isNaN(num) ? num.toFixed(6) : column.sampleValues[rowIndex];
                        })()}
                      {/if}
                    {:else}
                      {column.sampleValues[rowIndex] || ''}
                    {/if}
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
  /* Add any component-specific styles here */
</style>
