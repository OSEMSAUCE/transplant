<!-- TransForm.svelte -->
<script lang="ts">
  /// <reference lib="dom" />
  /// <reference lib="dom.iterable" />
  
  import '$lib/styles/tables.css';
  import { goto } from '$app/navigation';
  import { exportToCSV } from './csvExport';
  import Papa from 'papaparse';
  import type { 
    RawCsvState, 
    TransFormState, 
    ColumnAnalysis, 
    CsvColumnType,
    GpsPoint,
    CsvRow,
    ValidationState
  } from '$lib/shared/csv/validation/types';

  // Constants
  const previewLimit = 1000; // Maximum number of rows to show in preview
  const maxFileSize = 10 * 1024 * 1024; // 10MB max file size

  // DOM References
  let fileInput: HTMLInputElement;

  // State Management with Runes
  let rawCsvState = $state<RawCsvState>({
    fileName: '',
    totalRows: 0,
    csvColumns: [],
    csvStatus: 'ready'
  });

  let transformState = $state<TransFormState>({
    transformedColumns: [],
    transformations: [],
    transformStatus: 'untransformed'
  });

  // Derived State
  let hasData = $derived(rawCsvState.csvColumns.length > 0);
  let showPreviewWarning = $derived(rawCsvState.totalRows > previewLimit);

  // Computed State
  $: validationState: ValidationState = {
    columnsData: rawCsvState.csvColumns,
    columns: rawCsvState.csvColumns,
    csvStatus: rawCsvState.csvStatus === 'csverror' ? 'csverror' : 
               hasData ? 'validated' : 'ready',
    error: rawCsvState.error,
    fileName: rawCsvState.fileName
  };

  // File Upload and CSV Parsing
  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // Update file name
    rawCsvState.fileName = file.name;
    rawCsvState.csvStatus = 'csvanalyzing';

    // Reset states
    rawCsvState.csvColumns = [];
    rawCsvState.totalRows = 0;
    transformState.transformedColumns = [];
    transformState.transformations = [];
    transformState.transformStatus = 'untransformed';

    try {
      // Read and parse CSV
      const text = await file.text();
      Papa.parse<CsvRow>(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            rawCsvState.error = results.errors[0].message;
            rawCsvState.csvStatus = 'csverror';
            return;
          }

          if (results.data.length === 0) {
            rawCsvState.error = 'No data found in CSV file';
            rawCsvState.csvStatus = 'csverror';
            return;
          }

          // Process columns
          const columns: ColumnAnalysis[] = Object.keys(results.data[0]).map(colName => {
            const values = results.data.map(row => row[colName] || '');
            return {
              name: colName,
              currentType: 'string',
              suggestedType: 'string',
              confidence: 0,
              totalRows: results.data.length,
              validRows: 0,
              sampleValues: values.slice(0, previewLimit),
              allValues: values,
              previewValues: values.slice(0, previewLimit),
              invalidValues: []
            };
          });

          // Update state
          rawCsvState.csvColumns = columns;
          rawCsvState.totalRows = results.data.length;
          rawCsvState.csvStatus = 'ready';
        },
        error: (error: Error) => {
          rawCsvState.error = error.message;
          rawCsvState.csvStatus = 'csverror';
        }
      });
    } catch (error) {
      rawCsvState.error = error instanceof Error ? error.message : 'Error processing file';
      rawCsvState.csvStatus = 'csverror';
    }
  }

  function resetStates() {
    rawCsvState = $state<RawCsvState>({
      fileName: '',
      totalRows: 0,
      csvColumns: [],
      csvStatus: 'ready'
    });

    transformState = $state<TransFormState>({
      transformedColumns: [],
      transformations: [],
      transformStatus: 'untransformed'
    });

    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Column Type Detection
  function analyzeColumnType(values: string[]): { suggestedType: CsvColumnType; confidence: number } {
    const numberPattern = /^-?\d*\.?\d+$/;
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const urlPattern = /^https?:\/\/.+/;
    const gpsPattern = /^\d+\.\d+,\s*\d+\.\d+$/;

    let counts = {
      number: 0,
      date: 0,
      email: 0,
      url: 0,
      gps: 0
    };

    const total = values.length;
    values.forEach(value => {
      if (!value.trim()) return;
      if (numberPattern.test(value)) counts.number++;
      else if (datePattern.test(value)) counts.date++;
      else if (emailPattern.test(value)) counts.email++;
      else if (urlPattern.test(value)) counts.url++;
      else if (gpsPattern.test(value)) counts.gps++;
    });

    const typeConfidence = Object.entries(counts).map(([type, count]) => ({
      type: type as CsvColumnType,
      confidence: count / total
    }));

    const bestMatch = typeConfidence.reduce((best, current) => 
      current.confidence > best.confidence ? current : best,
      { type: 'string' as CsvColumnType, confidence: 0 }
    );

    return {
      suggestedType: bestMatch.confidence > 0.8 ? bestMatch.type : 'string',
      confidence: bestMatch.confidence
    };
  }

  function handleTypeChange(columnName: string, newType: CsvColumnType) {
    const columnIndex = rawCsvState.csvColumns.findIndex(col => col.name === columnName);
    if (columnIndex === -1) return;

    rawCsvState.csvColumns[columnIndex].currentType = newType;
    // We'll add validation and transformation logic later
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
    {#if rawCsvState.fileName}
      <span class="filename">{rawCsvState.fileName}</span>
    {/if}
  </article>

  <!-- Error Display -->
  {#if rawCsvState.csvStatus === 'csverror'}
    <article class="error">
      {rawCsvState.error || 'Error processing CSV file'}
    </article>
  {/if}

  <!-- Loading State -->
  {#if rawCsvState.csvStatus === 'csvanalyzing'}
    <article class="info">
      Analyzing CSV file...
    </article>
  {/if}

  <!-- Data Preview -->
  {#if hasData}
    {#if showPreviewWarning}
      <div class="preview-warning">
        Showing first {previewLimit} of {rawCsvState.totalRows.toLocaleString()} rows in preview
      </div>
    {/if}

    <div class="data-preview">
      <table>
        <thead>
          <tr class="header-row">
            {#each rawCsvState.csvColumns as column}
              <th>
                {column.name}
                <div class="type-info">
                  <select 
                    value={column.suggestedType}
                    on:change={(e) => handleTypeChange(column.name, e.target.value as CsvColumnType)}
                  >
                    <option value="string">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="email">Email</option>
                    <option value="url">URL</option>
                    <option value="gps">GPS</option>
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
                <td class:invalid={column.invalidValues?.includes(column.sampleValues[rowIndex])}>
                  <div class="value-display">
                    <div class="original-value">{column.sampleValues[rowIndex] ?? ''}</div>
                  </div>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Action Buttons -->
    <div class="actions">
      <button class="secondary" on:click={resetStates}>
        Clear
      </button>
      <button 
        class="primary" 
        on:click={() => goto('/map')}
        disabled={!hasData || rawCsvState.csvStatus !== 'ready'}
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

  article.info {
    background: var(--primary-background-color);
    border-color: var(--primary-color);
    color: var(--primary-color);
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 0.25rem;
  }

  .filename {
    margin-left: 1rem;
    color: var(--text-muted);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    border: 1px solid var(--border-color);
  }

  th, td {
    padding: 0.5rem;
    text-align: left;
    border: 1px solid var(--border-color);
  }

  .header-row {
    background: var(--primary);
    color: white;
  }

  .header-row th {
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .type-info {
    font-size: 0.9em;
    margin-top: 0.5rem;
  }

  .confidence {
    font-size: 0.8em;
    color: rgba(255, 255, 255, 0.7);
    display: block;
    margin-top: 0.25rem;
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
          <tr class="header-row">
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
                <td class:invalid={column.invalidValues?.includes(column.sampleValues[rowIndex])}>
                  <div class="value-display">
                    <div class="original-value">{column.sampleValues[rowIndex] ?? ''}</div>
                    {#if column.transformedValues?.[rowIndex]}
                      <div class="transformed-value">{column.transformedValues[rowIndex]}</div>
                    {/if}
                  </div>
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
    border: 1px solid var(--border-color);
  }

  th, td {
    padding: 0.5rem;
    text-align: left;
    border: 1px solid var(--border-color);
  }

  .header-row {
    background: var(--primary);
    color: white;
  }

  .header-row th {
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .header-row select {
    background: white;
    color: var(--primary);
    border: none;
    padding: 0.25rem;
    border-radius: 0.25rem;
    width: 100%;
  }

  .type-info {
    font-size: 0.9em;
    margin-top: 0.5rem;
  }

  .confidence {
    font-size: 0.8em;
    color: rgba(255, 255, 255, 0.7);
    display: block;
    margin-top: 0.25rem;
  }

  td.invalid {
    background-color: var(--del-background-color);
  }

  .value-display {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .original-value {
    color: var(--text-color);
  }

  .transformed-value {
    color: var(--success);
    font-size: 0.9em;
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
