<!-- TransForm.svelte -->
<script lang="ts">
  import '$lib/styles/tables.css';
  import { transformStore } from '$lib/shared/csv/stores/transformStore';
  import Papa from 'papaparse';
  import type { CsvColumnType } from '$lib/shared/csv/validation/types';

  let fileInput: HTMLInputElement;
  let selectedFileName = '';

  interface GpsPoint {
    lat: number;
    lon: number;
  }

  function isLatitude(value: string): boolean {
    const num = parseFloat(value);
    return !isNaN(num) && Math.abs(num) <= 90;
  }

  function isLongitude(value: string): boolean {
    const num = parseFloat(value);
    return !isNaN(num) && Math.abs(num) <= 180;
  }

  function findMatchingLonColumn(columns: ColumnAnalysis[], startIndex: number): ColumnAnalysis | null {
    return columns.find((col, i) => 
      i > startIndex && // Only look at columns after this one
      col.sampleValues.every(v => v === '' || isLongitude(v))
    ) || null;
  }

  function parseGpsCoordinate(value: string, lonValue?: string): GpsPoint | null {
    console.log('Parsing GPS:', value, lonValue);
    if (!value) return null;
    const cleaned = value.trim();

    // If we have separate lat/lon values
    if (lonValue) {
      const lat = parseFloat(cleaned);
      const lon = parseFloat(lonValue);
      if (!isNaN(lat) && !isNaN(lon) && isLatitude(cleaned) && isLongitude(lonValue)) {
        return { lat, lon };
      }
      return null;
    }

    // Try UTM format first (e.g., "30N 736085 4550362")
    const utmMatch = cleaned.match(/^(\d{1,2})([NS])\s*(\d{6})\s*(\d{7})$/i);
    if (utmMatch) {
      try {
        const zone = parseInt(utmMatch[1]);
        const hemisphere = utmMatch[2].toUpperCase();
        const easting = parseInt(utmMatch[3]);
        const northing = parseInt(utmMatch[4]);
        
        // Rough conversion (this is approximate)
        const lon = (zone * 6 - 183) + (easting - 500000) / 100000;
        let lat = (northing - 10000000) / 100000;
        if (hemisphere === 'N') {
          lat = (northing) / 100000;
        }
        
        return { lat, lon };
      } catch {
        return null;
      }
    }

    // Try decimal pair format (e.g., "41.070263, -0.190329")
    const decimalPairMatch = cleaned.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);    
    if (decimalPairMatch) {
      const lat = parseFloat(decimalPairMatch[1]);
      const lon = parseFloat(decimalPairMatch[2]);
      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return { lat, lon };
      }
    }

    // Try DMS format (e.g., "47° 52' 12.846"N, 6° 24' 35.958"E")
    const dmsPattern = /([NS])?\s*(\d+)°\s*(\d+)'\s*(\d+(\.\d+)?)"?\s*([NS])?[,\s]+([EW])?\s*(\d+)°\s*(\d+)'\s*(\d+(\.\d+)?)"?\s*([EW])?/i;
    const dmsMatch = cleaned.match(dmsPattern);
    if (dmsMatch) {
      const latDir = (dmsMatch[1] || dmsMatch[6] || 'N').toUpperCase();
      const lonDir = (dmsMatch[7] || dmsMatch[12] || 'E').toUpperCase();
      
      let lat = parseInt(dmsMatch[2]) + parseInt(dmsMatch[3])/60 + parseFloat(dmsMatch[4])/3600;
      let lon = parseInt(dmsMatch[8]) + parseInt(dmsMatch[9])/60 + parseFloat(dmsMatch[10])/3600;
      
      if (latDir === 'S') lat = -lat;
      if (lonDir === 'W') lon = -lon;
      
      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return { lat, lon };
      }
    }

    // Try N41 04 12 W0 11 24 format
    const dirFormat = /([NS])\s*(\d+)\s+(\d+)\s+(\d+)\s+([EW])\s*(\d+)\s+(\d+)\s+(\d+)/i;
    const dirMatch = cleaned.match(dirFormat);
    if (dirMatch) {
      const latDir = dirMatch[1].toUpperCase();
      const lonDir = dirMatch[5].toUpperCase();
      
      let lat = parseInt(dirMatch[2]) + parseInt(dirMatch[3])/60 + parseInt(dirMatch[4])/3600;
      let lon = parseInt(dirMatch[6]) + parseInt(dirMatch[7])/60 + parseInt(dirMatch[8])/3600;
      
      if (latDir === 'S') lat = -lat;
      if (lonDir === 'W') lon = -lon;
      
      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return { lat, lon };
      }
    }

    return null;
  }

  function formatGpsCoordinate(value: string): string {
    const point = parseGpsCoordinate(value);
    if (point !== null) {
      return `${point.lat.toFixed(7)}, ${point.lon.toFixed(7)}`;
    }
    return value;
  }

  $: validationState = {
    ...$transformStore,
    columnsData: [] as Array<{ name: string; allValues: string[]; previewValues: string[] }>
  };

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
            values = values.filter((v) => v !== '' && v != null);
            if (values.length === 0) return 'string';

            // Try to detect numbers
            const isNumber = values.every((v) => {
              // Remove commas and spaces
              const cleaned = v.replace(/[,\s]/g, '');
              // Check if it's a valid number
              return !isNaN(Number(cleaned)) && cleaned.length > 0;
            });
            if (isNumber) return 'number';

            // Try to detect GPS coordinates
            // First check if this could be a latitude column
            const couldBeLat = values.every(v => v === '' || isLatitude(v));
            if (couldBeLat && validationState.columns) {
              // Look for a matching longitude column
              const lonColumn = findMatchingLonColumn(validationState.columns, columnIndex);
              if (lonColumn) {
                // We found a lat/lon pair! Mark this as the GPS column
                return 'gps';
              }
            }

            // If not part of a lat/lon pair, check if it's a combined GPS column
            const isGps = values.every((v) => {
              if (!v) return true;
              const point = parseGpsCoordinate(v);
              return point !== null;
            });
            if (isGps) return 'gps';

            // Try to detect dates and years
            const isDate = values.every((v) => {
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
                  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // MM/DD/YY or MM/DD/YYYY
                ];
                return patterns.some((pattern) => pattern.test(v));
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

          // First pass: collect all column data
          validationState.columnsData = Object.keys(results.data[0]).map((name) => ({
            name,
            allValues: results.data.map((row) => row[name] || ''),
            previewValues: previewData.map((row) => row[name] || '')
          }));

          // Second pass: analyze each column with access to all columns
          const columns = validationState.columnsData.map((col, index) => {
            function detectType(values: string[]): CsvColumnType {
              // Skip empty values for type detection
              values = values.filter((v) => v !== '' && v != null);
              if (values.length === 0) return 'string';

              // Try to detect numbers
              const isNumber = values.every((v) => {
                const cleaned = v.replace(/[,\s]/g, '');
                return !isNaN(Number(cleaned));
              });
              if (isNumber) return 'number';

              // Try to detect GPS coordinates
              // First check if this could be a latitude column
              const couldBeLat = values.every(v => v === '' || isLatitude(v));
              if (couldBeLat) {
                // Look for a matching longitude column in remaining columns
                const hasMatchingLon = validationState.columnsData.slice(index + 1).some(otherCol => 
                  otherCol.allValues.every(v => v === '' || isLongitude(v))
                );
                if (hasMatchingLon) return 'gps';
              }

              // If not part of a lat/lon pair, check if it's a combined GPS column
              const isGps = values.every((v) => {
                if (!v) return true;
                const point = parseGpsCoordinate(v);
                return point !== null;
              });
              if (isGps) return 'gps';

              // Try to detect dates
              const isDate = values.every((v) => {
                if (!v) return true;
                try {
                  // Check if it's just a year
                  if (/^\d{4}$/.test(v)) {
                    const year = parseInt(v);
                    return year >= 1970 && year <= 2027;
                  }

                  // Handle formats like "6 Feb 25", "6 Feb 2025", "2025-02-06"
                  const date = new Date(v);
                  if (!isNaN(date.getTime())) return true;

                  // Try parsing with custom formats
                  const patterns = [
                    /^\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}$/, // 6 Feb 25 or 6 Feb 2025
                    /^\d{4}-\d{2}-\d{2}$/, // 2025-02-06
                    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // MM/DD/YY or MM/DD/YYYY
                  ];
                  return patterns.some((pattern) => pattern.test(v));
                } catch {
                  return false;
                }
              });
              if (isDate) return 'date';

              // Default to string
              return 'string';
            }

            const suggestedType = detectType(col.allValues);
            return {
              name: col.name,
              currentType: suggestedType,
              suggestedType,
              confidence: 1,
              sampleValues: col.previewValues,
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
              {#each validationState.columns as column, columnIndex}
                <td
                  class:invalid-value={column.invalidValues.includes(column.sampleValues[rowIndex])}
                >
                  <div class="value-display">
                    <div class="original-value">{column.sampleValues[rowIndex] || ''}</div>
                    {#if column.currentType !== 'string'}
                      <div class="transformed-value" style="color: #4CAF50; font-size: 0.9em; margin-top: 4px;">
                        {#if column.currentType === 'number'}
                          {column.sampleValues[rowIndex]
                            ? Number(
                                column.sampleValues[rowIndex].replace(/[,\s]/g, '')
                              ).toLocaleString()
                            : ''}
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
                          {#if column.sampleValues[rowIndex]}
                            {(() => {
                              const val = column.sampleValues[rowIndex];
                              
                              // First try parsing as a combined coordinate
                              let point = parseGpsCoordinate(val);
                              console.log('Combined parse result:', point);
                              if (point) {
                                const result = `${point.lat.toFixed(7)}, ${point.lon.toFixed(7)}`;
                                console.log('Returning formatted:', result);
                                return result;
                              }
                              
                              // If that fails and this looks like a latitude, try to find matching longitude
                              if (isLatitude(val)) {
                                const nextColumns = validationState.columns.slice(columnIndex + 1);
                                const lonColumn = nextColumns.find(col => {
                                  const lonVal = col.sampleValues[rowIndex];
                                  return lonVal && isLongitude(lonVal);
                                });
                                
                                if (lonColumn) {
                                  const lonVal = lonColumn.sampleValues[rowIndex];
                                  point = parseGpsCoordinate(val, lonVal);
                                  if (point) {
                                    return `${point.lat.toFixed(7)}, ${point.lon.toFixed(7)}`;
                                  }
                                }
                              }
                              
                              return null;
                            })()}
                          {/if}
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
    padding: 4px;
  }

  .transformed-value {
    font-family: monospace;
    padding: 2px 4px;
    background: rgba(76, 175, 80, 0.1);
    border-radius: 2px;
  }

  .original-value {
    font-weight: normal;
  }

  .transformed-value {
    font-size: 0.875rem;
    color: #6b7280;
    font-style: italic;
  }
</style>
