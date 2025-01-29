<script lang="ts">
  // @ts-expect-error - PapaParse lacks TypeScript definitions
  import Papa from 'papaparse';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  let tableHeaders: Record<string, string[]> = {};
  let errorMessage = '';

  let csvData: any = null;
  let mappings: Record<string, string> = {};
  let fileInput: HTMLInputElement;
  let csvColumns: string[] = [];

  // Database fields from both tables
  let databaseFields = {
    Land: Object.keys(tableHeaders.Land || []),
    Crop: Object.keys(tableHeaders.Crop || []),
  };

  async function fetchTableHeaders() {
    try {
      // Define only the fields we want to show
      tableHeaders = {
        Land: [
          'land_name',
          'hectares',
          'notes',
          // Add any other land fields you want here
        ],
        Crop: [
          'crop_name',
          'seedlot',
          'crop_stock',
          // Add any other crop fields you want here
        ],
      };

      // Update database fields
      databaseFields = {
        Land: tableHeaders.Land,
        Crop: tableHeaders.Crop,
      };

      console.log('Headers loaded:', tableHeaders);
    } catch (error) {
      errorMessage = 'Error fetching table headers';
      console.error('Error:', error);
    }
  }

  onMount(() => {
    fetchTableHeaders();
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
          console.log('CSV Columns:', csvColumns);
        },
        error: (error) => {
          errorMessage = `Error parsing CSV file: ${error.message}`;
        },
      });
    }
  }

  function handleColumnMap(csvColumn: string, value: string) {
    mappings[csvColumn] = value;
  }

  export let data;
  let message = 'TransPlant CSV Mapper';
</script>

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
        <h3>Imported Data</h3>
        <table>
          <thead>
            <tr class="mapping-row">
              {#each csvColumns as csvColumn}
                <th>
                  <select
                    on:change={(e) => handleColumnMap(csvColumn, e.target.value)}
                    value={mappings[csvColumn] || ''}
                  >
                    <option value="">Map to field...</option>
                    <optgroup label="Land">
                      {#each databaseFields.Land as field}
                        <option value={`Land.${field}`}>{field}</option>
                      {/each}
                    </optgroup>
                    <optgroup label="Crop">
                      {#each databaseFields.Crop as field}
                        <option value={`Crop.${field}`}>{field}</option>
                      {/each}
                    </optgroup>
                  </select>
                </th>
              {/each}
            </tr>
            <tr>
              {#each csvColumns as column}
                <th>{column}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each csvData.slice(0, 5) as row}
              <tr>
                {#each csvColumns as column}
                  <td>{row[column] || ''}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="database-tables">
        {#each ['Land', 'Crop'] as tableName}
          <div class="table-info">
            <h3>{tableName}</h3>
            <div class="table-preview">
              <table>
                <thead>
                  <tr>
                    {#each tableHeaders[tableName] || [] as header}
                      <th>{header}</th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  <!-- Add two empty rows -->
                  <tr>
                    {#each tableHeaders[tableName] || [] as _}
                      <td></td>
                    {/each}
                  </tr>
                  <tr>
                    {#each tableHeaders[tableName] || [] as _}
                      <td></td>
                    {/each}
                  </tr>
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
      <h2 class="text-2xl font-bold mb-4">Lands</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each data.lands as land}
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
      <h2 class="text-2xl font-bold mb-4">Crops</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each data.crops as crop}
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

<style>
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
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th,
  td {
    min-width: 10rem;
    max-width: 10rem;
    padding: 0.5rem;
    text-align: left;
    border: 1px solid #ddd;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mapping-row th {
    padding: 0.25rem;
    border: none;
  }

  select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: white;
  }

  th {
    background: #f5f5f5;
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
    min-width: 10rem;
    max-width: 10rem;
    padding: 0.5rem;
    text-align: left;
    border: 1px solid #ddd;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .table-preview th {
    background: #f5f5f5;
    font-size: 0.875rem;
  }
</style>
