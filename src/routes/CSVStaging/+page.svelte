<script lang="ts">
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import { goto } from '$app/navigation';

  let csvData: any[] = [];
  let csvColumns: string[] = [];
  let dataSource = ''; // 'file' or 'transform'
  
  onMount(() => {
    // Check if we have data from TransForm
    const storedData = sessionStorage.getItem('csvData');
    const storedColumns = sessionStorage.getItem('csvColumns');
    
    if (storedData && storedColumns) {
      try {
        csvData = JSON.parse(storedData);
        csvColumns = JSON.parse(storedColumns);
        dataSource = 'transform';
      } catch (err) {
        errorMessage = 'Error loading TransForm data: ' + (err instanceof Error ? err.message : String(err));
      }
    }
  });

  let fileInput: HTMLInputElement;
  let errorMessage = '';

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target?.files?.[0];
    
    if (!file) {
      errorMessage = 'No file selected';
      return;
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      errorMessage = 'Please select a CSV file';
      return;
    }

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          errorMessage = `CSV parsing error: ${results.errors[0].message}`;
          return;
        }

        // Store the CSV data in sessionStorage
        try {
          sessionStorage.setItem('csvData', JSON.stringify(results.data));
          sessionStorage.setItem('csvColumns', JSON.stringify(Object.keys(results.data[0] || {})));
          goto('/TransPlant'); // Redirect to TransPlant page
        } catch (err) {
          errorMessage = 'Error storing CSV data: ' + (err instanceof Error ? err.message : String(err));
        }
      },
      error: (error) => {
        errorMessage = 'Error parsing CSV: ' + error.message;
      }
    });
  }
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">CSV Staging</h1>
  
  {#if dataSource === 'transform'}
    <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
      <span class="block sm:inline">Data received from TransForm</span>
    </div>
  {/if}
  
  {#if errorMessage}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
      <span class="block sm:inline">{errorMessage}</span>
    </div>
  {/if}

  <div class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
    {#if !dataSource}
      <div class="mb-4">
        <label class="block text-gray-700 text-sm font-bold mb-2" for="csvFile">
          Upload CSV File
        </label>
        <input
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="csvFile"
          type="file"
          accept=".csv"
          on:change={handleFileSelect}
          bind:this={fileInput}
        />
      </div>
    {:else}
      <!-- Preview Section -->
      <div class="mb-4">
        <h2 class="text-lg font-bold mb-2">Data Preview</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full table-auto">
            <thead>
              <tr>
                {#each csvColumns as column}
                  <th class="px-4 py-2 bg-gray-100">{column}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each csvData.slice(0, 5) as row}
                <tr>
                  {#each csvColumns as column}
                    <td class="border px-4 py-2">{row[column] || ''}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end space-x-4">
        <button
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          on:click={() => goto('/TransPlant')}
        >
          Continue to TransPlant
        </button>
      </div>
    {/if}
    
    <div class="text-sm text-gray-600 mt-4">
      <p>This page handles CSV data validation before sending to the TransPlant page.</p>
      <p>Data can come from:</p>
      <ul class="list-disc list-inside">
        <li>Direct CSV file upload</li>
        <li>TransForm page export</li>
      </ul>
    </div>
  </div>
</div>

<style>
  /* Add any custom styles here */
</style>
