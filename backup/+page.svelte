<script lang="ts">
  import { onMount } from 'svelte';
  import Papa from 'papaparse';

  let csvFile: File;
  let csvData: any[] = [];
  let headers: string[] = [];
  let selectedFields: { [key: string]: string } = {};
  let tableHeaders: string[] = [];

  onMount(async () => {
    // Fetch table headers from the database
    const response = await fetch('/TransPlant/api/table-headers');
    tableHeaders = await response.json();
  });

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      csvFile = input.files[0];
      Papa.parse(csvFile, {
        complete: function(results) {
          csvData = results.data;
          headers = csvData[0];
          // Initialize selectedFields with empty strings
          headers.forEach(header => {
            selectedFields[header] = '';
          });
        },
        header: true
      });
    }
  }

  async function saveToDatabase() {
    const mappedData = csvData.map(row => {
      const mappedRow: { [key: string]: any } = {};
      Object.entries(selectedFields).forEach(([csvField, dbField]) => {
        if (dbField) {
          mappedRow[dbField] = row[csvField];
        }
      });
      return mappedRow;
    });

    try {
      const response = await fetch('/TransPlant/api/save-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mappedData),
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      alert('Data saved successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Error saving data');
    }
  }
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">CSV Mapper</h1>

  <div class="mb-4">
    <input
      type="file"
      accept=".csv"
      on:change={handleFileSelect}
      class="border p-2 rounded"
    />
  </div>

  {#if headers.length > 0}
    <div class="overflow-x-auto">
      <table class="min-w-full bg-white border">
        <thead>
          <tr>
            <th class="border p-2">CSV Field</th>
            <th class="border p-2">Database Field</th>
            {#each headers as header}
              <th class="border p-2">{header}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each Object.entries(selectedFields) as [csvField, dbField]}
            <tr>
              <td class="border p-2">{csvField}</td>
              <td class="border p-2">
                <select
                  bind:value={selectedFields[csvField]}
                  class="w-full p-1 border rounded"
                >
                  <option value="">Select field</option>
                  {#each tableHeaders as header}
                    <option value={header}>{header}</option>
                  {/each}
                </select>
              </td>
              {#each csvData as row}
                <td class="border p-2">{row[csvField]}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <button
      on:click={saveToDatabase}
      class="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
    >
      Save to Database
    </button>
  {/if}
</div>
