<!-- TransForm.svelte -->
<script lang="ts">
  /// <reference lib="dom" />
  import '$lib/styles/tables.css';
  import { transformStore } from '$lib/shared/csv/stores/transformStore';
  import Papa from 'papaparse';
  import type { CsvColumnType } from '$lib/shared/csv/validation/types';

  let fileInput: HTMLInputElement;

  interface GpsPoint {
    lat: number;
    lon: number;
  }

  interface ColumnData {
    name: string;
    sampleValues: string[];
    allValues: string[];
    previewValues: string[];
  }

  interface ColumnAnalysis extends ColumnData {
    currentType: CsvColumnType;
    suggestedType: CsvColumnType;
    confidence: number;
    totalRows: number;
    validRows: number;
    invalidValues: string[];
  }

  function isLatitude(value: string): boolean {
    if (!value) return false;
    // Remove trailing comma if present
    const cleaned = value.trim().replace(/,$/, '');

    // Check DMS format with optional comma
    if (cleaned.match(/^\d+°\s*\d+'\s*\d+"\s*[NS]$/i)) return true;

    // Check decimal format
    const num = parseFloat(cleaned);
    return !isNaN(num) && Math.abs(num) <= 90;
  }

  function isLongitude(value: string): boolean {
    if (!value) return false;
    const cleaned = value.trim();

    // Check DMS format
    if (cleaned.match(/^\d+°\s*\d+'\s*\d+"\s*[EW]$/i)) return true;

    // For decimal format, must be explicitly marked as longitude
    // or be paired with a valid latitude
    const num = parseFloat(cleaned);
    return !isNaN(num) && Math.abs(num) <= 180;
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
        const lon = zone * 6 - 183 + (easting - 500000) / 100000;
        let lat = (northing - 10000000) / 100000;
        if (hemisphere === 'N') {
          lat = northing / 100000;
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
    const dmsPattern =
      /([NS])?\s*(\d+)°\s*(\d+)'\s*(\d+(\.\d+)?)"?\s*([NS])?[,\s]+([EW])?\s*(\d+)°\s*(\d+)'\s*(\d+(\.\d+)?)"?\s*([EW])?/i;
    const dmsMatch = cleaned.match(dmsPattern);
    if (dmsMatch) {
      const latDir = (dmsMatch[1] || dmsMatch[6] || 'N').toUpperCase();
      const lonDir = (dmsMatch[7] || dmsMatch[12] || 'E').toUpperCase();

      let lat = parseInt(dmsMatch[2]) + parseInt(dmsMatch[3]) / 60 + parseFloat(dmsMatch[4]) / 3600;
      let lon =
        parseInt(dmsMatch[8]) + parseInt(dmsMatch[9]) / 60 + parseFloat(dmsMatch[10]) / 3600;

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

      let lat = parseInt(dirMatch[2]) + parseInt(dirMatch[3]) / 60 + parseInt(dirMatch[4]) / 3600;
      let lon = parseInt(dirMatch[6]) + parseInt(dirMatch[7]) / 60 + parseInt(dirMatch[8]) / 3600;

      if (latDir === 'S') lat = -lat;
      if (lonDir === 'W') lon = -lon;

      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return { lat, lon };
      }
    }

    return null;
  }

  $: validationState = {
    ...$transformStore,
    columnsData: [] as Array<{ name: string; allValues: string[]; previewValues: string[] }>,
  };

  interface CsvRow {
    [key: string]: string;
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    transformStore.setFile(file.name);

    const reader: FileReader = new FileReader();
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

          function detectType(
            values: string[],
            columnName: string,
            columnIndex: number
          ): CsvColumnType {
            console.log('Detecting type for column:', columnName);
            // Skip empty values for type detection
            values = values.filter((v) => v !== '' && v != null);
            if (values.length === 0) return 'string';

            // Check for GPS coordinates first based on column names
            const colNameLower = columnName.toLowerCase();
            console.log('Checking if GPS column:', colNameLower);

            if (colNameLower.includes('lat')) {
              console.log('Found lat column:', columnName);
              const isValidLat = values.every((v) => {
                if (!v) return true;
                const num = parseFloat(v.trim());
                return !isNaN(num) && Math.abs(num) <= 90;
              });

              if (isValidLat) {
                console.log('Valid lat values in:', columnName);
                // Look for a matching longitude column
                const matchingLon = validationState.columnsData.find((otherCol, otherIndex) => {
                  const isMatch =
                    otherIndex !== columnIndex &&
                    otherCol.name.toLowerCase().includes('lon') &&
                    otherCol.allValues.every((v) => {
                      if (!v) return true;
                      const num = parseFloat(v.trim());
                      return !isNaN(num) && Math.abs(num) <= 180;
                    });
                  if (isMatch) console.log('Found matching lon:', otherCol.name);
                  return isMatch;
                });

                if (matchingLon) {
                  console.log('Processing lat/lon pair:', columnName, matchingLon.name);
                  // Get the default_gps column (we know it exists since we created it first)
                  const defaultGpsCol = validationState.columnsData[0];

                  // Populate values
                  values.forEach((lat, i) => {
                    if (lat && matchingLon.allValues[i]) {
                      const latNum = parseFloat(lat.trim());
                      const lonNum = parseFloat(matchingLon.allValues[i].trim());
                      if (!isNaN(latNum) && !isNaN(lonNum)) {
                        const combined = `${latNum.toFixed(7)}, ${lonNum.toFixed(7)}`;
                        console.log('Combined GPS:', combined);
                        defaultGpsCol.allValues[i] = combined;
                        if (i < defaultGpsCol.previewValues.length) {
                          defaultGpsCol.previewValues[i] = combined;
                        }
                      }
                    }
                  });
                  return 'gps';
                }
              }
            }

            // Try to detect numbers
            const isNumber = values.every((v) => {
              const cleaned = v.replace(/[,\s]/g, '');
              return !isNaN(Number(cleaned)) && cleaned.length > 0;
            });
            if (isNumber) return 'number';

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
          const totalRows = results.data.length;

          console.log('Starting column processing');

          // First pass: Create all columns including default_gps
          validationState.columnsData = [
            // Add default_gps column first
            {
              name: 'default_gps',
              allValues: new Array(results.data.length).fill(''),
              previewValues: new Array(Math.min(results.data.length, previewLimit)).fill(''),
            },
            // Then add all other columns
            ...Object.keys(results.data[0]).map((col) => {
              const values = results.data.map((row) => row[col] || '');
              return {
                name: col,
                allValues: values,
                previewValues: values.slice(0, previewLimit),
              };
            }),
          ];

          console.log(
            'Created columns:',
            validationState.columnsData.map((c) => c.name)
          );

          // Second pass: analyze each column with access to all columns
          const columns = validationState.columnsData.map((col, index) => {
            // Skip the default_gps column
            if (col.name === 'default_gps') {
              return {
                name: col.name,
                currentType: 'gps',
                suggestedType: 'gps',
                confidence: 1,
                sampleValues: col.previewValues,
                invalidValues: [],
              };
            }

            function detectType(values: string[]): CsvColumnType {
              // Skip empty values for type detection
              values = values.filter((v) => v !== '' && v != null);
              if (values.length === 0) return 'string' as CsvColumnType;

              // Check for GPS coordinates based on column names and value ranges
              const colName = col.name.toLowerCase();
              console.log(
                'Checking column:',
                colName,
                'with first few values:',
                values.slice(0, 3)
              );

              // First check if any values contain complete GPS coordinates
              const hasCompleteCoords = values.some((v) => {
                if (!v) return false;
                const parts = v.split(',');
                if (parts.length === 2) {
                  const [lat, lon] = parts.map((p) => parseFloat(p.trim()));
                  return !isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
                }
                return false;
              });

              if (hasCompleteCoords) {
                console.log(`Found complete GPS coordinates in ${col.name}`);
                const defaultGpsCol = validationState.columnsData[0];
                values.forEach((v, i) => {
                  if (v && (!defaultGpsCol.allValues[i] || defaultGpsCol.allValues[i] === '')) {
                    defaultGpsCol.allValues[i] = v;
                    if (i < defaultGpsCol.previewValues.length) {
                      defaultGpsCol.previewValues[i] = v;
                    }
                  }
                });
                return 'gps';
              }

              // Check if this is a GPS column
              const isGps = values.every((v) => {
                if (!v) return true;
                // Try to parse as GPS coordinate
                const point = parseGpsCoordinate(v);
                if (point !== null) return true;

                // Try as decimal number within valid ranges
                const num = parseFloat(v.trim());
                if (!isNaN(num)) {
                  if (colName.includes('lat')) return Math.abs(num) <= 90;
                  if (colName.includes('lon')) return Math.abs(num) <= 180;
                }
                return false;
              });

              if (isGps) {
                // Update default_gps with any non-empty values from this column
                const defaultGpsCol = validationState.columnsData[0];
                values.forEach((v, i) => {
                  if (v && (!defaultGpsCol.allValues[i] || defaultGpsCol.allValues[i] === '')) {
                    // If this is a lat/lon pair, try to find its matching coordinate
                    if (colName.includes('lat')) {
                      const lonCol = validationState.columnsData.find(
                        (c) =>
                          c.name.toLowerCase().includes('lon') &&
                          c.allValues[i] &&
                          !isNaN(parseFloat(c.allValues[i]))
                      );
                      if (lonCol) {
                        const lat = parseFloat(v);
                        const lon = parseFloat(lonCol.allValues[i]);
                        defaultGpsCol.allValues[i] = `${lat}, ${lon}`;
                        if (i < defaultGpsCol.previewValues.length) {
                          defaultGpsCol.previewValues[i] = `${lat}, ${lon}`;
                        }
                      }
                    } else {
                      defaultGpsCol.allValues[i] = v;
                      if (i < defaultGpsCol.previewValues.length) {
                        defaultGpsCol.previewValues[i] = v;
                      }
                    }
                  }
                });
                return 'gps';
              }

              // Function to combine lat/lon into a default_gps string
              function combineGpsCoords(lat: string, lon: string): string {
                const latNum = parseFloat(lat.trim());
                const lonNum = parseFloat(lon.trim());
                if (!isNaN(latNum) && !isNaN(lonNum)) {
                  return `${latNum.toFixed(7)}, ${lonNum.toFixed(7)}`;
                }
                return '';
              }

              // Function to parse DMS format
              function parseDMS(dms: string): number | null {
                // Match patterns like "51° 30' 26" N" or "51 30 26 N"
                const pattern =
                  /^\s*(\d+)\s*(?:°|\s+)\s*(\d+)\s*(?:'|\s+)\s*(\d+(?:\.\d+)?)\s*(?:"|''|\s+)?\s*([NSEW])\s*$/i;
                const match = dms.match(pattern);
                if (!match) return null;

                const [_, degrees, minutes, seconds, direction] = match;
                let decimal =
                  parseFloat(degrees) + parseFloat(minutes) / 60 + parseFloat(seconds) / 3600;
                if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
                  decimal = -decimal;
                }
                return decimal;
              }

              // Check if this is a DMS format GPS column
              if (colName.includes('dms')) {
                console.log('Found DMS column:', col.name);
                const isValidDMS = values.every((v) => {
                  if (!v) return true;
                  const parsed = parseDMS(v);
                  if (parsed === null) return false;
                  if (colName.includes('lat')) return Math.abs(parsed) <= 90;
                  if (colName.includes('lon')) return Math.abs(parsed) <= 180;
                  return true;
                });

                if (isValidDMS) {
                  console.log('Valid DMS values in:', col.name);
                  // Look for a matching DMS column
                  const matchingCol = validationState.columnsData.find((otherCol, otherIndex) => {
                    if (otherIndex === index) return false;
                    const otherName = otherCol.name.toLowerCase();
                    if (!otherName.includes('dms')) return false;

                    const isLat = colName.includes('lat');
                    const isOtherLon = otherName.includes('lon');

                    return (isLat && isOtherLon) || (!isLat && !isOtherLon);
                  });

                  if (matchingCol) {
                    console.log('Found matching DMS column:', matchingCol.name);
                    // Get default_gps column (we know it exists since we created it first)
                    const defaultGpsCol = validationState.columnsData[0];

                    // Populate values
                    values.forEach((val, i) => {
                      if (val && matchingCol.allValues[i]) {
                        const lat = colName.includes('lat')
                          ? parseDMS(val)
                          : parseDMS(matchingCol.allValues[i]);
                        const lon = colName.includes('lon')
                          ? parseDMS(val)
                          : parseDMS(matchingCol.allValues[i]);

                        if (lat !== null && lon !== null) {
                          const combined = `${lat.toFixed(7)}, ${lon.toFixed(7)}`;
                          console.log('Combined DMS GPS:', combined);
                          defaultGpsCol.allValues[i] = combined;
                          if (i < defaultGpsCol.previewValues.length) {
                            defaultGpsCol.previewValues[i] = combined;
                          }
                        }
                      }
                    });
                    return 'gps';
                  }
                }
              }

              // Check for decimal degree columns
              if (colName.includes('lat') || colName.includes('latitude')) {
                console.log(`Checking potential latitude column: ${col.name}`);
                console.log('Found lat column:', col.name);
                console.log('Sample values:', values.slice(0, 5));
                // First check if these are complete GPS coordinates
                const hasCompleteGps = values.some((v) => {
                  if (!v) return false;
                  // Check if value contains a comma and two numbers
                  const parts = v.split(',');
                  if (parts.length === 2) {
                    const [lat, lon] = parts.map((p) => parseFloat(p.trim()));
                    return (
                      !isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
                    );
                  }
                  return false;
                });

                if (hasCompleteGps) {
                  console.log(`Found complete GPS coordinates in column ${col.name}`);
                  // Copy valid GPS coordinates to default_gps
                  const defaultGpsCol = validationState.columnsData[0];
                  values.forEach((v, i) => {
                    if (v && (!defaultGpsCol.allValues[i] || defaultGpsCol.allValues[i] === '')) {
                      defaultGpsCol.allValues[i] = v;
                      if (i < defaultGpsCol.previewValues.length) {
                        defaultGpsCol.previewValues[i] = v;
                      }
                    }
                  });
                  return 'gps';
                }

                // If not complete GPS, check if it's just latitude
                const isValidLat = values.every((v) => {
                  if (!v) return true;
                  const num = parseFloat(v.trim());
                  const isValid = !isNaN(num) && Math.abs(num) <= 90;
                  console.log(`Checking lat value: ${v} -> ${num} -> valid: ${isValid}`);
                  return isValid;
                });

                if (isValidLat) {
                  console.log('Valid lat values in:', col.name);
                  // Look for a matching longitude column
                  const matchingLon = validationState.columnsData.find((otherCol, otherIndex) => {
                    const isMatch =
                      otherIndex !== index &&
                      otherCol.name.toLowerCase().includes('lon') &&
                      otherCol.allValues.every((v) => {
                        if (!v) return true;
                        const num = parseFloat(v.trim());
                        return !isNaN(num) && Math.abs(num) <= 180;
                      });
                    if (isMatch) console.log('Found matching lon:', otherCol.name);
                    return isMatch;
                  });

                  if (matchingLon) {
                    console.log('Processing lat/lon pair:', col.name, matchingLon.name);
                    // Get default_gps column (we know it exists since we created it first)
                    const defaultGpsCol = validationState.columnsData[0];

                    // Populate values
                    values.forEach((lat, i) => {
                      if (lat && matchingLon.allValues[i]) {
                        const latNum = parseFloat(lat.trim());
                        const lonNum = parseFloat(matchingLon.allValues[i].trim());
                        if (!isNaN(latNum) && !isNaN(lonNum)) {
                          const combined = `${latNum}, ${lonNum}`;
                          console.log(
                            `Combined GPS from ${col.name}: ${lat}, ${matchingLon.allValues[i]} -> ${combined}`
                          );
                          defaultGpsCol.allValues[i] = combined;
                          if (i < defaultGpsCol.previewValues.length) {
                            defaultGpsCol.previewValues[i] = combined;
                          }
                        }
                      }
                    });
                    return 'gps';
                  }
                }
              }

              // Check for longitude columns
              if (colName.includes('lon')) {
                const isValidLon = values.every((v) => {
                  if (!v) return true;
                  const num = parseFloat(v.trim());
                  return !isNaN(num) && Math.abs(num) <= 180;
                });
                if (isValidLon) {
                  // Look for a matching latitude column
                  const matchingLat = validationState.columnsData.find(
                    (otherCol, otherIndex) =>
                      otherIndex !== index &&
                      otherCol.name.toLowerCase().includes('lat') &&
                      otherCol.allValues.every((v) => {
                        if (!v) return true;
                        const num = parseFloat(v.trim());
                        return !isNaN(num) && Math.abs(num) <= 90;
                      })
                  );

                  if (matchingLat) return 'gps';
                }
              }

              // Try to detect numbers
              const isNumber = values.every((v) => {
                const cleaned = v.replace(/[,\s]/g, '');
                return !isNaN(Number(cleaned));
              });
              if (isNumber) return 'number';

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
              return 'string' as CsvColumnType;
            }

            const suggestedType = detectType(col.allValues);
            const analysis: ColumnAnalysis = {
              name: col.name,
              currentType: suggestedType,
              suggestedType,
              confidence: 1,
              sampleValues: col.previewValues,
              allValues: col.allValues,
              previewValues: col.previewValues,
              invalidValues: [],
              totalRows,
              validRows: totalRows,
            };
            return analysis;
          });

          transformStore.updateAnalysis(columns);

          if (totalRows > previewLimit) {
            console.log(`Showing ${previewLimit} of ${totalRows} rows in preview`);
          }
        },
        error: (error: Error) => {
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
              {#if column.currentType !== 'gps'}
                <div class="type-container">
                  <span class="type-value">{column.currentType}</span>
                </div>
              {/if}
              <div class="type-container mt-2">
                <select
                  class="type-select"
                  value={column.suggestedType}
                  on:change={(e) => {
                    const value = e.currentTarget.value;
                    if (
                      value === 'string' ||
                      value === 'number' ||
                      value === 'date' ||
                      value === 'gps' ||
                      value === 'email' ||
                      value === 'url'
                    ) {
                      // Update the type
                      column.suggestedType = value;
                      column.currentType = value;

                      // Transform the data based on type
                      column.sampleValues = column.sampleValues.map(val => {
                        if (!val) return '';
                        
                        switch (value) {
                          case 'number':
                            // Extract only numbers, ignore everything else
                            const num = val.replace(/[^0-9.-]/g, '');
                            return num ? num : '';
                          case 'date':
                            try {
                              const date = new Date(val);
                              return date.toISOString().split('T')[0];
                            } catch {
                              return '';
                            }
                          default:
                            return val;
                        }
                      });

                      // Update the store
                      transformStore.updateAnalysis(validationState.columns);
                    }
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
          {#each validationState.columns[0].sampleValues as _value, rowIndex}
            <tr>
              {#each validationState.columns as column, columnIndex}
                <td
                  class:invalid-value={column.invalidValues?.includes(
                    column.sampleValues[rowIndex]
                  )}
                >
                  <div class="value-display">
                    <div class="original-value">{column.sampleValues[rowIndex] || ''}</div>
                    {#if column.currentType !== 'string'}
                      <div
                        class="transformed-value"
                        style="color: #4CAF50; font-size: 0.9em; margin-top: 4px;"
                      >
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
                              if (point) {
                                return `${point.lat.toFixed(7)}, ${point.lon.toFixed(7)}`;
                              }

                              // Try parsing as directional format
                              if (val.match(/^[NSEW]\d+/)) {
                                const currentIndex = validationState.columns.findIndex(
                                  (c) => c.name === column.name
                                );
                                const nextColumns = validationState.columns.slice(currentIndex + 1);
                                const lonColumn = nextColumns.find((col) => {
                                  const lonVal = col.sampleValues[rowIndex];
                                  return lonVal && lonVal.match(/^[NSEW]\d+/);
                                });

                                if (lonColumn) {
                                  const lonVal = lonColumn.sampleValues[rowIndex];
                                  point = parseGpsCoordinate(val, lonVal);
                                  if (point) {
                                    return `${point.lat.toFixed(7)}, ${point.lon.toFixed(7)}`;
                                  }
                                }
                              }

                              // If that fails and this looks like a latitude, try to find matching longitude
                              if (isLatitude(val)) {
                                const currentIndex = validationState.columns.findIndex(
                                  (c) => c.name === column.name
                                );
                                const nextColumns = validationState.columns.slice(currentIndex + 1);
                                const lonColumn = nextColumns.find((col) => {
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
