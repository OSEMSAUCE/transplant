<script lang="ts">
  /// <reference types="svelte" />
  // @ts-expect-error - PapaParse lacks TypeScript definitions
  import Papa from 'papaparse';
  import { onMount } from 'svelte';

  type CsvRow = Record<string, string>;

  let tableHeaders: Record<string, string[]> = {};
  let errorMessage = '';

  let csvData: CsvRow[] | null = null;
  let mappings: Record<string, string> = {};
  let fileInput: any; // TODO: Add proper typing later
  let csvColumns: string[] = [];

  // Database fields from both tables
  let databaseFields = {
    Land: Object.keys(tableHeaders.Land || []),
    Crop: Object.keys(tableHeaders.Crop || []),
  };

  // Add these type definitions at the top of the script
  type FieldType = 'number' | 'string' | 'latitude' | 'longitude';

  interface FieldDefinition {
    name: string;
    type: FieldType;
    required?: boolean;
  }

  // Define the expected types for each field
  const tableFieldTypes = {
    Land: {
      land_name: { type: 'string', required: true },
      hectares: { type: 'number', required: true },
      preparation_id: { type: 'string', required: false },
      gps_lat: { type: 'latitude', required: true },
      gps_lon: { type: 'longitude', required: true },
      notes: { type: 'string', required: false },
    },
    Crop: {
      crop_name: { type: 'string', required: true },
      species_id: { type: 'string', required: true },
      seedlot: { type: 'string', required: false },
      seedzone: { type: 'string', required: false },
      crop_stock: { type: 'number', required: true },
    },
  } as const;

  // Add validation functions
  function validateField(value: string, type: FieldType): { valid: boolean; value: any } {
    if (value === '' || value == null) {
      return { valid: true, value: null };
    }

    switch (type) {
      case 'number':
        const num = Number(value.replace(',', ''));
        return { valid: !isNaN(num), value: num };

      case 'latitude':
        const lat = Number(value);
        return {
          valid: !isNaN(lat) && lat >= -90 && lat <= 90,
          value: lat,
        };

      case 'longitude':
        const lon = Number(value);
        return {
          valid: !isNaN(lon) && lon >= -180 && lon <= 180,
          value: lon,
        };

      case 'string':
        return { valid: true, value: value.trim() };

      default:
        return { valid: false, value: null };
    }
  }

  // Add this mock data for development
  const MOCK_CSV_DATA = [
    {
      parcelID: '3BEE6680',
      pledgeID: '3BEE66',
      organisationType: 'Private company or corporation',
      organisationWebsite: 'https://www.3bee.com/',
      Species: 'ES',
      countryName: 'Germany',
      lat: '52.223473',
      lon: '13.3522415',
      areaHa: '0.2',
      numberTrees: '180',
      plantingYear: '2023',
      'trees/ha': '1,111',
      parcelOwnership: 'Private',
      CRS: '4326',
    },
    {
      parcelID: '3BEE3747',
      pledgeID: '3BEE37',
      organisationType: 'Private company or corporation',
      organisationWebsite: 'https://www.3bee.com/',
      Species: 'ES',
      countryName: 'Spain',
      lat: '41.070263',
      lon: '-0.1900329',
      areaHa: '0.3',
      numberTrees: '364',
      plantingYear: '2023',
      'trees/ha': '1,111',
      parcelOwnership: 'Private',
      CRS: '4326',
    },
    {
      parcelID: '3BEE3747',
      pledgeID: '3BEE14',
      organisationType: 'Private company or corporation',
      organisationWebsite: 'https://www.3bee.com/',
      Species: 'FR',
      countryName: 'France',
      lat: '47.870235',
      lon: '6.4099884',
      areaHa: '0.2',
      numberTrees: '204',
      plantingYear: '2023',
      'trees/ha': '1,111',
      parcelOwnership: 'Private',
      CRS: '4326',
    },
  ];

  // Add this to track preview data
  let previewData = {
    Land: Array(2).fill({}),
    Crop: Array(2).fill({}),
  };

  async function fetchTableHeaders() {
    try {
      // Define only the fields we want to show, matching the schema names exactly
      tableHeaders = {
        Land: ['land_name', 'hectares', 'preparation_id', 'gps_lat', 'gps_lon', 'notes'],
        Crop: ['crop_name', 'species_id', 'seedlot', 'seedzone', 'crop_stock'],
      };

      // Update database fields
      databaseFields = {
        Land: tableHeaders.Land,
        Crop: tableHeaders.Crop,
      };
    } catch (error) {
      errorMessage = 'Error fetching table headers';
    }
  }

  onMount(() => {
    fetchTableHeaders();

    // Auto-load mock data in development
    if (import.meta.env.DEV) {
      csvData = MOCK_CSV_DATA;
      csvColumns = Object.keys(MOCK_CSV_DATA[0] || {});
      errorMessage = '';
    }
  });

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          csvData = results.data;
          csvColumns = Object.keys(results.data[0] || {});
          errorMessage = '';
        },
        error: (error) => {
          errorMessage = `Error parsing CSV file: ${error.message}`;
        },
      });
    }
  }

  function handleColumnMap(csvColumn: string, value: string) {
    // Clear any existing mappings to this destination
    if (value) {
      Object.entries(mappings).forEach(([col, mapping]) => {
        if (mapping === value && col !== csvColumn) {
          mappings[col] = '';
        }
      });
    }

    // Set the new mapping
    mappings[csvColumn] = value;

    // Update preview tables when mapping changes
    if (value && csvData) {
      const [table, field] = value.split('.');
      const fieldType = tableFieldTypes[table]?.[field]?.type;

      if (!fieldType) {
        console.warn(`No type definition found for ${table}.${field}`);
        return;
      }

      // Get first two rows of CSV data
      const previewRows = csvData.slice(0, 2);

      // Update the preview data with validation
      previewData[table] = previewRows.map((row) => {
        const rawValue = row[csvColumn];
        const { valid, value } = validateField(rawValue, fieldType);

        return {
          ...previewData[table],
          [field]: valid ? value : `Invalid ${fieldType}: ${rawValue}`,
          [`${field}_valid`]: valid,
        };
      });
    }
  }

  // Add these functions for drag and drop
  function handleDragStart(event: DragEvent, csvColumn: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', csvColumn);
      event.dataTransfer.effectAllowed = 'link';
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'link';
    }
  }

  function handleDrop(event: DragEvent, table: string, field: string) {
    event.preventDefault();
    const csvColumn = event.dataTransfer?.getData('text/plain');
    if (csvColumn) {
      handleColumnMap(csvColumn, `${table}.${field}`);
    }
  }

  function handleMappingDragStart(event: DragEvent, table: string, field: string) {
    const fullField = `${table}.${field}`;
    // Find if this field is mapped to
    const mappedColumn = Object.entries(mappings).find(([_, value]) => value === fullField)?.[0];
    if (mappedColumn) {
      event.dataTransfer?.setData('text/plain', mappedColumn);
    } else {
      // If not mapped to, prevent drag
      event.preventDefault();
    }
  }

  function handleMappingDragEnd(event: DragEvent, table: string, field: string) {
    const fullField = `${table}.${field}`;
    const mappedColumn = Object.entries(mappings).find(([_, value]) => value === fullField)?.[0];
    if (mappedColumn) {
      // Clear the mapping
      mappings[mappedColumn] = '';
      // Clear preview data
      previewData[table] = previewData[table].map((row) => ({
        ...row,
        [field]: '',
      }));
    }
  }

  export let data;
</script>

// TEST GITHUB CONNECTION - DELETE THIS LINE
<div class="csv-mapper">
  <header>
    <h1>CSV Mapper</h1>
  </header>

  <main class="container">
    {#if errorMessage}
      <div class="error-message">
        {errorMessage}
      </div>
    {/if}

    {#if !csvData}
      <div class="file-upload">
        <input type="file" accept=".csv" on:change={handleFileSelect} bind:this={fileInput} />
        <p>Select a CSV file to begin mapping</p>
      </div>
    {:else}
      <div class="table-container">
        <h2 class="text-2xl font-bold mb-4">Imported Data</h2>
        <table>
          <thead>
            <tr class="mapping-row">
              {#each csvColumns as csvColumn}
                <th
                  draggable="true"
                  on:dragstart={(e) => handleDragStart(e, csvColumn)}
                  class="cursor-move hover:bg-gray-100"
                >
                  {csvColumn}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each csvData.slice(0, 5) as row}
              <tr>
                {#each csvColumns as column}
                  <td
                    draggable="true"
                    on:dragstart={(e) => handleDragStart(e, column)}
                    class="cursor-move hover:bg-gray-100"
                  >
                    {row[column] || ''}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="database-tables">
        {#each ['Land', 'Crop'] as tableName}
          <div class="table-info">
            <h2 class="text-2xl font-bold mb-4">{tableName} Table</h2>
            <div class="table-preview">
              <table>
                <thead>
                  <tr>
                    {#each tableHeaders[tableName] || [] as header}
                      <th
                        draggable="true"
                        on:dragstart={(e) => handleMappingDragStart(e, tableName, header)}
                        on:dragend={(e) => handleMappingDragEnd(e, tableName, header)}
                        on:dragover={handleDragOver}
                        on:drop={(e) => handleDrop(e, tableName, header)}
                        class="droppable-column hover:bg-blue-50"
                      >
                        {header}
                      </th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each previewData[tableName] as row}
                    <tr>
                      {#each tableHeaders[tableName] || [] as header}
                        <td
                          draggable="true"
                          on:dragstart={(e) => handleMappingDragStart(e, tableName, header)}
                          on:dragend={(e) => handleMappingDragEnd(e, tableName, header)}
                          on:dragover={handleDragOver}
                          on:drop={(e) => handleDrop(e, tableName, header)}
                          class="droppable-column hover:bg-blue-50"
                          class:invalid={row[`${header}_valid`] === false}
                        >
                          {row[header] || ''}
                        </td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<div class="container mx-auto p-4">
  {#if data.error}
    <div class="bg-red-100 p-4 rounded mb-4">
      <p class="text-red-700">{data.error}</p>
    </div>
  {:else}
    <!-- Land Section -->
    <section class="mb-8">
      <h2 class="text-2xl font-bold mb-4">Land Table</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each data.lands || [] as land}
          {@debug land}
          <div class="bg-white p-4 rounded shadow">
            <h3 class="font-bold text-lg">{land.name}</h3>
            <p>Hectares: {land.hectares || 'N/A'}</p>
            {#if land.notes}
              <p class="text-gray-600 mt-2">{land.notes}</p>
            {/if}
          </div>
        {/each}
      </div>
    </section>

    <!-- Crop Section -->
    <section>
      <h2 class="text-2xl font-bold mb-4">Crop Table</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each data.crops || [] as crop}
          <div class="bg-white p-4 rounded shadow">
            <h3 class="font-bold text-lg">{crop.name}</h3>
            <p>Seedlot: {crop.seedlot || 'N/A'}</p>
            <p>Stock: {crop.stock || 0}</p>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>

<!-- CSS variable, control all widths! -->
<style>
  :root {
    --column-width: 6rem;
  }

  .csv-mapper {
    padding: 2rem;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .file-upload {
    border: 2px dashed #ccc;
    border-radius: 4px;
    padding: 2rem;
    text-align: center;
    margin: 2rem 0;
  }

  .table-container {
    overflow-x: auto;
    margin-top: 2rem;
    width: 100%;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th,
  td {
    /* width: var(--column-width); */
    min-width: var(--column-width);
    padding: 0.5rem;
    text-align: left;
    border: 1px solid #ddd;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background-color: var(--background-color, #1e1e1e);
    color: var(--text-color, #ffffff);
  }

  .mapping-row th {
    padding: 0.25rem;
    border: none;
    width: var(--column-width);
    min-width: var(--column-width);
  }

  select {
    width: var(--column-width);
    min-width: var(--column-width);
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: var(--background-color, #1e1e1e);
    color: var(--text-color, #ffffff);
  }

  th {
    font-size: 0.875rem;
  }

  .error-message {
    background-color: #fff3f3;
    color: #d32f2f;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 4px;
    border: 1px solid #ffcdd2;
  }

  .database-tables {
    margin-top: 3rem;
  }

  .table-info {
    margin-top: 2rem;
  }

  .table-info h3 {
    color: #333;
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  .table-preview {
    overflow-x: auto;
    margin-top: 1rem;
  }

  .table-preview table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .table-preview th,
  .table-preview td {
    /* width: var(--column-width);
    min-width: var(--column-width); */
    padding: 0.5rem;
    text-align: left;
    border: 1px solid #ddd;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .table-preview th {
    /* background: #f5f5f5; */
    font-size: 0.875rem;
  }

  .cursor-move {
    cursor: move;
  }

  .droppable-column {
    cursor: pointer; /* Changed to pointer to indicate interactivity */
    position: relative;
  }

  /* When mapped, show grab cursor */
  .droppable-column[draggable='true'] {
    cursor: grab;
  }

  .droppable-column[draggable='true']:active {
    cursor: grabbing;
  }

  /* Update hover states to be visible in dark mode */
  .cursor-move.hover\:bg-gray-100:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .droppable-column.hover\:bg-blue-50:hover::after {
    background-color: rgba(59, 130, 246, 0.2); /* More visible in dark mode */
    border: 2px dashed #60a5fa; /* Brighter blue for dark mode */
  }

  .invalid {
    background-color: rgba(239, 68, 68, 0.2);
  }
</style>
