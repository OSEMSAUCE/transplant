<!-- TransForm.svelte -->
<script lang="ts">
  /// <reference lib="dom" />
  /// <reference lib="dom.iterable" />
  
  import '$lib/styles/tables.css';
  import { goto } from '$app/navigation';
  import { exportToCSV } from './csvExport';
  import Papa from 'papaparse';
  import type { RawCsvState, TransFormState, ColumnAnalysis } from '$lib/shared/types';

  const previewLimit = 1000; // Maximum number of rows to show in preview
  let fileInput: HTMLInputElement;

  // Raw CSV state using runes
  let rawCsvState = $state<RawCsvState>({
    fileName: '',
    totalRows: 0,
    csvColumns: [],
    csvStatus: 'csvanalyzing'
  });

  // Transform state using runes
  let transformState = $state<TransFormState>({
    transformedColumns: [],
    transformations: [],
    transformStatus: 'untransformed'
  });

  // Derived state
  let hasData = $derived(rawCsvState.csvColumns.length > 0);
  let showPreviewWarning = $derived(rawCsvState.totalRows > previewLimit);

  // Column analysis
  function analyzeColumn(values: string[]): ColumnAnalysis {
    const sampleSize = Math.min(values.length, 10);
    const sampleValues = values.slice(0, sampleSize);
    
    // Type detection logic
    const numberPattern = /^-?\d*\.?\d+$/;
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const urlPattern = /^https?:\/\/.+/;
    
    let numberCount = 0;
    let dateCount = 0;
    let emailCount = 0;
    let urlCount = 0;
    const invalidValues: string[] = [];
    
    values.forEach(value => {
      if (numberPattern.test(value)) numberCount++;
      else if (datePattern.test(value)) dateCount++;
      else if (emailPattern.test(value)) emailCount++;
      else if (urlPattern.test(value)) urlCount++;
      else if (!value.trim()) invalidValues.push(value);
    });
    
    const total = values.length;
    let suggestedType: ColumnAnalysis['suggestedType'] = 'string';
    let confidence = 0;
    
    if (numberCount / total > 0.8) {
      suggestedType = 'number';
      confidence = numberCount / total;
    } else if (dateCount / total > 0.8) {
      suggestedType = 'date';
      confidence = dateCount / total;
    } else if (emailCount / total > 0.8) {
      suggestedType = 'email';
      confidence = emailCount / total;
    } else if (urlCount / total > 0.8) {
      suggestedType = 'url';
      confidence = urlCount / total;
    }
    
    return {
      name: '',  // Will be set later
      suggestedType,
      currentType: 'string',
      confidence,
      sampleValues,
      invalidValues,
      totalRows: total,
      validRows: total - invalidValues.length
    };
  }

  // Handle file upload
  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    rawCsvState.fileName = file.name;
    rawCsvState.csvStatus = 'csvanalyzing';

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            rawCsvState.csvStatus = 'csverror';
            return;
          }

          rawCsvState.totalRows = results.data.length;
          
          // Analyze each column
          const analyzedColumns = Object.keys(results.data[0]).map(columnName => {
            const values = results.data.map(row => (row as Record<string, string>)[columnName] || '');
            const analysis = analyzeColumn(values);
            analysis.name = columnName;
            return analysis;
          });

          rawCsvState.csvColumns = analyzedColumns;
          rawCsvState.csvStatus = 'csvtransformed';

          // Start transformation
          transformState.transformedColumns = analyzedColumns;
          transformState.transformStatus = 'transforming';
        },
        error: () => {
          rawCsvState.csvStatus = 'csverror';
        }
      });
    };
    reader.readAsText(file);
  }

  // Function to handle column type changes
  function handleTypeChange(columnName: string, newType: ColumnAnalysis['suggestedType']) {
    transformState.transformations = [
      ...transformState.transformations,
      {
        originalColumn: columnName,
        transformedColumn: columnName,
        transformType: 'convert'
      }
    ];

    transformState.transformedColumns = transformState.transformedColumns.map(col => {
      if (col.name === columnName) {
        return { ...col, suggestedType: newType };
      }
      return col;
    });
  }

  // Function to proceed to mapping
  function proceedToMapping() {
    goto('/TransPlant');
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
  {#if rawCsvState.csvStatus === 'csverror'}
    <article class="error">
      Error processing CSV file
    </article>
  {/if}

  <!-- Data Preview -->
  {#if hasData}
    {#if showPreviewWarning}
      <div class="preview-warning">
        Showing first {previewLimit} of {rawCsvState.totalRows} rows in preview
      </div>
    {/if}

    <div class="data-preview">
      <table>
        <thead>
          <tr>
            {#each rawCsvState.csvColumns as column}
              <th>
                {column.name}
                <div class="type-info">
                  <select 
                    value={column.suggestedType}
                    on:change={(e) => handleTypeChange(column.name, e.target.value)}
                  >
                    <option value="string">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="email">Email</option>
                    <option value="url">URL</option>
                  </select>
                  <span class="confidence">
                    {(column.confidence * 100).toFixed(1)}% confident
                  </span>
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rawCsvState.csvColumns[0]?.sampleValues ?? [] as _, rowIndex}
            <tr>
              {#each rawCsvState.csvColumns as column}
                <td class:invalid={column.invalidValues.includes(column.sampleValues[rowIndex])}>
                  {column.sampleValues[rowIndex] ?? ''}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Action Buttons -->
    <div class="actions">
      <button class="secondary" on:click={() => resetStates()}>
        Clear
      </button>
      <button 
        class="primary" 
        on:click={proceedToMapping}
        disabled={transformState.transformStatus !== 'transformed'}
      >
        Proceed to Mapping
      </button>
    </div>
  {/if}
</main>

<style>
  article.error {
    background: var(--del-background-color);
    border-color: var(--del-color);
    color: var(--del-color);
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 0.25rem;
  }

  .container {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }

  th, td {
    padding: 0.5rem;
    text-align: left;
    border: 1px solid var(--border-color);
  }

  th {
    background: var(--background-color);
  }

  .type-info {
    font-size: 0.9em;
    margin-top: 0.5rem;
  }

  .confidence {
    font-size: 0.8em;
    color: var(--text-muted);
  }

  td.invalid {
    background-color: var(--del-background-color);
  }

  .preview-warning {
    background: var(--warning-background-color);
    border: 1px solid var(--warning-color);
    color: var(--warning-color);
    padding: 0.5rem;
    margin: 0.5rem 0;
    border-radius: 0.25rem;
  }

  .actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  button {
    min-width: 120px;
  }
</style>
