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

  /**
   * CRITICAL RELATIONSHIP: Land-Crop-Planted Tables
   * 
   * The Planted table represents actual planting events from the imported data.
   * Each row in the Planted table must correspond to a real planting event where:
   * 1. land_name exists in the Land table
   * 2. crop_name exists in the Crop table
   * 3. The combination of land_name and crop_name must come from the imported data
   * 
   * Multiple plantings of the same land-crop combination are possible (e.g., different dates)
   * The 'planted' column (number of trees) is the minimum required data to confirm a planting occurred
   * 
   * DO NOT modify this relationship without understanding these dependencies:
   * - Planted table rows are derived from actual import data, not all possible combinations
   * - Each land_name must validate against Land table
   * - Each crop_name must validate against Crop table
   * - The number of trees planted is required to confirm planting event
   */

  // Initialize preview data with empty rows
  let previewData = {
    Land: [] as Record<string, string>[],
    Crop: [] as Record<string, string>[],
    Planted: [] as Record<string, string>[],
  };

  // Track actual land-crop combinations from import data
  let importedPlantings: Array<{land_name: string, crop_name: string}> = [];

  // Database fields from both tables
  let databaseFields = {
    Land: [],
    Crop: [],
    Planted: [],
  };

  // Add these type definitions at the top of the script
  type FieldType = 'number' | 'string' | 'latitude' | 'longitude' | 'date';

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
    Planted: {
      land_name: { type: 'string', required: true },
      crop_name: { type: 'string', required: true },
      planted: { type: 'number', required: true },
      planting_date: { type: 'date', required: true },
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

      case 'date':
        const date = new Date(value);
        return { valid: !isNaN(date.getTime()), value: date.toISOString().split('T')[0] };

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

  async function fetchTableHeaders() {
    try {
      // TODO: Replace with actual API call when ready
      // const response = await fetch('/api/schema');
      // if (!response.ok) throw new Error('Failed to fetch schema');
      // const schema = await response.json();

      // For now, use hardcoded schema
      tableHeaders = {
        Land: ['land_name', 'hectares', 'preparation_id', 'gps_lat', 'gps_lon', 'notes'],
        Crop: ['crop_name', 'species_id', 'seedlot', 'seedzone', 'crop_stock'],
        Planted: ['land_name', 'crop_name', 'planted', 'planting_date'],
      };

      // Update database fields
      databaseFields = {
        Land: tableHeaders.Land,
        Crop: tableHeaders.Crop,
        Planted: tableHeaders.Planted,
      };

      // Initialize empty preview data with the correct structure
      previewData = {
        Land: Array(5)
          .fill({})
          .map(() => Object.fromEntries(tableHeaders.Land.map((header) => [header, '']))),
        Crop: Array(5)
          .fill({})
          .map(() => Object.fromEntries(tableHeaders.Crop.map((header) => [header, '']))),
        Planted: Array(5)
          .fill({})
          .map(() => Object.fromEntries(tableHeaders.Planted.map((header) => [header, '']))),
      };
    } catch (error) {
      errorMessage = 'Error fetching table headers';
    }
  }
  // test
  // test
  // test
  // test

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

          // Reset mappings and preview data
          mappings = {};
          previewData = {
            Land: Array(5)
              .fill({})
              .map(() => Object.fromEntries(tableHeaders.Land.map((header) => [header, '']))),
            Crop: Array(5)
              .fill({})
              .map(() => Object.fromEntries(tableHeaders.Crop.map((header) => [header, '']))),
          };
        },
        error: (error) => {
          errorMessage = `Error parsing CSV file: ${error.message}`;
        },
      });
    }
  }
  // test

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

    // test

    // Update preview data for all tables
    if (csvData) {
      // Reset imported plantings
      importedPlantings = [];

      // First update Land and Crop tables
      ['Land', 'Crop'].forEach((table) => {
        // Get all mappings for this table
        const tableMappings = new Map();
        Object.entries(mappings).forEach(([col, mapping]) => {
          if (mapping) {
            const [mapTable, field] = mapping.split('.');
            if (mapTable === table) {
              tableMappings.set(field, col);
            }
          }
        });
        // test2

        // Create preview rows with mapped and validated data
        previewData[table] = csvData.slice(0, 5).map((row) => {
          const previewRow = {};

          // Initialize all fields
          tableHeaders[table].forEach((field) => {
            const mappedColumn = tableMappings.get(field);
            if (mappedColumn) {
              const rawValue = row[mappedColumn];
              const fieldType = tableFieldTypes[table]?.[field]?.type || 'string';
              const { valid, value } = validateField(rawValue, fieldType);

              if (!valid) {
                // Clear the mapping if validation fails
                const existingMapping = Object.entries(mappings).find(
                  ([_, val]) => val === `${table}.${field}`
                );
                if (existingMapping) {
                  mappings[existingMapping[0]] = '';
                }
              }

              previewRow[field] = valid ? value : `Invalid ${fieldType}: ${rawValue}`;
              previewRow[`${field}_valid`] = valid;
            } else {
              previewRow[field] = '';
              previewRow[`${field}_valid`] = true;
            }
          });

          return previewRow;
        });

        // Track valid land-crop combinations from import data
        if (table === 'Land' || table === 'Crop') {
          const landNameMapping = Object.entries(mappings).find(([_, val]) => val === 'Land.land_name')?.[0];
          const cropNameMapping = Object.entries(mappings).find(([_, val]) => val === 'Crop.crop_name')?.[0];
          
          if (landNameMapping && cropNameMapping) {
            // Get all valid land-crop combinations from import data
            importedPlantings = csvData
              .map(row => ({
                land_name: row[landNameMapping],
                crop_name: row[cropNameMapping]
              }))
              .filter(planting => 
                // Ensure both land_name and crop_name exist and are valid
                planting.land_name && 
                planting.crop_name && 
                previewData.Land.some(land => land.land_name === planting.land_name) &&
                previewData.Crop.some(crop => crop.crop_name === planting.crop_name)
              );
          }
        }
      });

      // Update Planted table preview with actual planting combinations
      previewData.Planted = importedPlantings.map(planting => ({
        ...planting,
        planted: '',
        planting_date: ''
      }));

      // Force reactivity
      previewData = { ...previewData };
    }
  }

  // Add these functions for drag and drop
  function handleDragStart(event: DragEvent, csvColumn: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', csvColumn);
      event.dataTransfer.effectAllowed = 'move';
      const target = /** @type {HTMLElement} */ (event.target);
      target.classList.add('dragging');
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    const target = /** @type {HTMLElement} */ (event.target);
    target.classList.add('drag-over');
  }

  function handleDragLeave(event: DragEvent) {
    const target = /** @type {HTMLElement} */ (event.target);
    target.classList.remove('drag-over');
  }

  function handleDrop(event: DragEvent, table: string, field: string) {
    event.preventDefault();
    const target = /** @type {HTMLElement} */ (event.target);
    target.classList.remove('drag-over');

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

  // Add state variables for dropdown
  let showDropdown = false;
  let autoMapFields = true;
  let strictValidation = false;
</script>

<div class="csv-mapper">
  <header class="land-import-header">
    <h2>Land Parcel Import</h2>
    <div class="header-controls">
      <div class="dropdown">
        <button class="dropdown-toggle" on:click={() => (showDropdown = !showDropdown)}>
          Mapping Options ▾
        </button>
        {#if showDropdown}
          <div class="dropdown-menu">
            <label
              ><input type="checkbox" bind:checked={autoMapFields} /> Auto-map matching fields</label
            >
            <label
              ><input type="checkbox" bind:checked={strictValidation} /> Enable strict validation</label
            >
          </div>
        {/if}
      </div>
    </div>
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
        <h2 class="text-lg font-bold" style="margin: 0; padding: 0;">Import Table</h2>

        <div class="overflow-x-auto" style="min-width: min-content;">
          <!-- Mapping Dropdowns Row -->
          <div
            class="grid"
            style="grid-template-columns: repeat({csvColumns.length}, minmax(200px, 1fr)); gap: 0; margin-bottom: 4px;"
          >
            {#each csvColumns as csvColumn}
              <div class="p-2 bg-gray-800 text-white">
                <select
                  bind:value={mappings[csvColumn]}
                  class="w-full bg-gray-800 text-white border border-gray-600 rounded p-1 cursor-pointer appearance-none hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
                  style="background-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'><path fill=\'white\' d=\'M7 10l5 5 5-5z\'/></svg>'); background-repeat: no-repeat; background-position: right 8px center; background-size: 16px; padding-right: 24px;"
                >
                  <option value="">Select target field</option>
                  <optgroup label="Land Data">
                    {#each databaseFields.Land as field}
                      <option value={`Land.${field}`}>{field}</option>
                    {/each}
                  </optgroup>
                  <optgroup label="Crop Data">
                    {#each databaseFields.Crop as field}
                      <option value={`Crop.${field}`}>{field}</option>
                    {/each}
                  </optgroup>
                </select>
              </div>
            {/each}
          </div>

          <table class="w-full">
            <thead>
              <tr
                class="grid"
                style="grid-template-columns: repeat({csvColumns.length}, minmax(200px, 1fr)); gap: 0;"
              >
                {#each csvColumns as csvColumn}
                  <th
                    class="p-2 bg-gray-800 text-white border-b border-gray-700 font-medium text-left"
                    draggable="true"
                    on:dragstart={(e) => handleDragStart(e, csvColumn)}
                  >
                    {csvColumn}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each csvData.slice(0, 5) as row}
                <tr
                  class="grid"
                  style="grid-template-columns: repeat({csvColumns.length}, minmax(200px, 1fr)); gap: 0;"
                >
                  {#each csvColumns as column}
                    <td
                      draggable="true"
                      on:dragstart={(e) => handleDragStart(e, column)}
                      class="p-2 bg-gray-800 text-white border-b border-gray-700 cursor-move hover:bg-gray-700"
                    >
                      {row[column] || ''}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <div class="database-tables">
        {#each ['Land', 'Crop', 'Planted'] as tableName}
          <div class="table-info">
            <h2 class="text-lg font-bold" style="margin: 0; padding: 0;">{tableName} Table</h2>
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

  select {
    width: 100%;
    padding: 4px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    background-color: white;
    font-size: 14px;
  }

  select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .dragging {
    opacity: 0.5;
    cursor: move;
  }

  .drag-over {
    background-color: #4a5568 !important;
    border: 2px dashed #63b3ed !important;
  }

  .droppable-column {
    transition: all 0.2s ease;
  }

  .csv-mapper {
    padding: 0.25rem;
  }

  /* Override any default margins */
  h2,
  h3,
  h4 {
    margin: 0 !important;
    padding: 0 !important;
    line-height: 1.2 !important;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .file-upload {
    border: 2px dashed #ccc;
    border-radius: 4px;
    padding: 0.5rem;
    text-align: center;
    margin: 0.5rem 0;
  }

  .table-container {
    overflow-x: auto;
    margin: 0 !important;
    padding: 0 !important;
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
    padding: 0.25rem;
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
    margin: 0 !important;
    padding: 0 !important;
  }

  .table-info {
    margin: 0 !important;
    padding: 0 !important;
  }

  .table-info h3 {
    color: #333;
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  .table-preview {
    overflow-x: auto;
    margin: 0 !important;
    padding: 0 !important;
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

  .land-import-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: var(--color-surface-1);
    border-bottom: 1px solid var(--color-border);
  }

  .dropdown {
    position: relative;
    margin-left: 1rem;
  }

  .dropdown-toggle {
    padding: 0.5rem 1rem;
    background: var(--color-button-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .dropdown-menu {
    position: absolute;
    right: 0;
    top: 100%;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    padding: 0.5rem;
    min-width: 200px;
    z-index: 100;
  }

  .column-headers {
    display: flex;
    gap: 1rem;
    padding: 1rem 0;
  }

  .column-header {
    position: relative;
    min-width: var(--column-width);
  }

  .column-mapping select {
    width: 100%;
    padding: 0.25rem;
    font-size: 0.8em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface-2);
  }

  .column-name {
    margin-top: 0.5rem;
    font-size: 0.9em;
    text-align: center;
    color: var(--color-text-secondary);
  }
</style>
