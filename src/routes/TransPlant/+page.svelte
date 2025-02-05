<script lang="ts">
  /// <reference types="svelte" />
  // @ts-expect-error - PapaParse lacks TypeScript definitions
  import Papa from 'papaparse';
  import { onMount } from 'svelte';

  type CsvRow = Record<string, string>;
  type ValidationResult = { isValid: boolean; value: number | null };

  function validateNumber(value: any): ValidationResult {
    if (typeof value === 'number') return { isValid: true, value };
    if (typeof value === 'string') {
      const num = Number(value.trim());
      if (!isNaN(num) && num > 0) return { isValid: true, value: num };
    }
    return { isValid: false, value: null };
  }

  // Define field types and validation rules
  type FieldType = 'string' | 'number' | 'date' | 'gps';

  interface FieldDefinition {
    name: string;
    type: FieldType;
    required?: boolean;
    propagatesTo?: string; // Which table this field should propagate to
    validation?: (value: any) => boolean;
  }

  interface TableSchema {
    name: string;
    fields: FieldDefinition[];
    isInteractive?: boolean; // Can users drag-drop to this table?
  }

  // Define the database schema
  const schema: TableSchema[] = [
    {
      name: 'Planted',
      isInteractive: true,
      fields: [
        { name: 'land_name', type: 'string', required: true, propagatesTo: 'Land' },
        { name: 'crop_name', type: 'string', required: true, propagatesTo: 'Crop' },
        { name: 'planted', type: 'number', required: true },
        { name: 'planting_date', type: 'date', required: true },
        { name: 'gps_lat', type: 'gps', required: false, propagatesTo: 'Land' },
        { name: 'gps_lon', type: 'gps', required: false, propagatesTo: 'Land' },
        { name: 'species_id', type: 'string', required: false, propagatesTo: 'Crop' },
        { name: 'seedlot', type: 'string', required: false, propagatesTo: 'Crop' },
        { name: 'seedzone', type: 'string', required: false, propagatesTo: 'Crop' },
        { name: 'crop_stock', type: 'string', required: false, propagatesTo: 'Crop' },
        { name: 'hectares', type: 'number', required: false, propagatesTo: 'Land' },
        { name: 'preparation_id', type: 'string', required: false, propagatesTo: 'Land' },
        { name: 'notes', type: 'string', required: false }
      ],
    },
    {
      name: 'Land',
      fields: [
        { name: 'land_name', type: 'string', required: true },
        { name: 'hectares', type: 'number', required: true },
        { name: 'preparation_id', type: 'string', required: false },
        { name: 'gis_area', type: 'number', required: false },
        { name: 'gps_lat', type: 'gps', required: false },
        { name: 'gps_lon', type: 'gps', required: false },
      ],
    },
    {
      name: 'Crop',
      fields: [
        { name: 'crop_name', type: 'string', required: true },
        { name: 'species_id', type: 'string', required: true },
        { name: 'seedlot', type: 'string', required: false },
        { name: 'source', type: 'string', required: false },
      ],
    },
  ];

  // Generate table headers and database fields from schema
  // Ensure GPS fields are included in table headers
  let tableHeaders = {
    Land: ['land_name', 'hectares', 'preparation_id', 'gis_area', 'gps_lat', 'gps_lon'],
    Crop: ['crop_name', 'species_id', 'seedlot', 'seedzone', 'crop_stock'],
    Planted: [
      'land_name',
      'crop_name', 
      'planted',
      'planting_date',
      'gps_lat',
      'gps_lon',
      'species_id',
      'seedlot', 
      'seedzone',
      'crop_stock',
      'hectares',
      'preparation_id',
      'notes'
    ],
  };
  let databaseFields = tableHeaders;

  let errorMessage = '';
  let csvData: CsvRow[] | null = null;
  let mappings: Record<string, string> = {};
  let fileInput: any; // TODO: Add proper typing later
  let csvColumns: string[] = [];
  let orderedCsvColumns: string[] = [];

  // Initialize preview data with empty rows and all fields
  let previewData = {
    Land: [] as Array<Record<string, string>>,
    Crop: [] as Array<Record<string, string>>,
    Planted: [] as Array<Record<string, string & {
      gps_lat?: string;
      gps_lon?: string;
      species_id?: string;
      seedlot?: string;
      seedzone?: string;
      crop_stock?: string;
      hectares?: string;
      preparation_id?: string;
      notes?: string;
    }>>,
  };

  // Track actual land-crop combinations from import data
  let importedPlantings: Array<{ land_name: string; crop_name: string }> = [];

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
      gps_lat: { type: 'latitude', required: false },
      gps_lon: { type: 'longitude', required: false },
      species_id: { type: 'string', required: false },
      seedlot: { type: 'string', required: false },
      seedzone: { type: 'string', required: false },
      crop_stock: { type: 'string', required: false },
      hectares: { type: 'number', required: false },
      preparation_id: { type: 'string', required: false },
      notes: { type: 'string', required: false }
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
        Planted: [
          'land_name',
          'crop_name', 
          'planted',
          'planting_date',
          'gps_lat',
          'gps_lon',
          'species_id',
          'seedlot', 
          'seedzone',
          'crop_stock',
          'hectares',
          'preparation_id',
          'notes'
        ],
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
      orderedCsvColumns = [...csvColumns];
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
          orderedCsvColumns = [...csvColumns];
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
            Planted: Array(5)
              .fill({})
              .map(() => Object.fromEntries(tableHeaders.Planted.map((header) => [header, '']))),
          };
        },
        error: (error) => {
          errorMessage = `Error parsing CSV file: ${error.message}`;
        },
      });
    }
  }
  // test

  function reorderColumns() {
    console.log('=== Starting column reorder ===');
    console.log('Current columns:', [...orderedCsvColumns]);
    console.log('Current mappings:', {...mappings});

    // Create arrays to hold columns in their new order
    const newOrder = [];
    const processedColumns = new Set();

    console.log('Planted table fields order:', tableHeaders.Planted);

    // First: Add columns mapped to Planted fields in Planted table order
    for (const plantedField of tableHeaders.Planted) {
      const mappedColumn = Object.entries(mappings).find(
        ([_, mapping]) => mapping === `Planted.${plantedField}`
      )?.[0];

      if (mappedColumn) {
        console.log(`Found ${mappedColumn} mapped to Planted.${plantedField}`);
        newOrder.push(mappedColumn);
        processedColumns.add(mappedColumn);
      }
    }

    // Second: Add columns mapped to other tables (Crop, Land)
    const otherMappedColumns = Object.entries(mappings)
      .filter(([col, mapping]) => mapping && !mapping.startsWith('Planted.') && !processedColumns.has(col))
      .map(([col]) => col);

    if (otherMappedColumns.length > 0) {
      console.log('Adding other mapped columns:', otherMappedColumns);
      newOrder.push(...otherMappedColumns);
      otherMappedColumns.forEach(col => processedColumns.add(col));
    }

    // Finally: Add remaining unmapped columns in their original order
    const remainingColumns = csvColumns.filter(col => !processedColumns.has(col));
    if (remainingColumns.length > 0) {
      console.log('Adding remaining unmapped columns:', remainingColumns);
      newOrder.push(...remainingColumns);
    }

    console.log('Proposed new order:', newOrder);
    
    // Check if order actually changed
    const orderChanged = newOrder.some((col, i) => col !== orderedCsvColumns[i]);
    console.log('Order changed:', orderChanged);
    
    if (orderChanged) {
      console.log('Applying new column order');
      orderedCsvColumns = [...newOrder];
      // Force reactivity
      orderedCsvColumns = [...orderedCsvColumns];
    } else {
      console.log('No change needed in column order');
    }
    
    console.log('Final column order:', [...orderedCsvColumns]);
    console.log('=== Finished column reorder ===');
  }

  function handleColumnMap(csvColumn: string, value: string) {
    console.log(`Mapping column ${csvColumn} to ${value}`);
    
    // Clear any existing mappings to this destination
    if (value) {
      Object.entries(mappings).forEach(([col, mapping]) => {
        if (mapping === value && col !== csvColumn) {
          console.log(`Clearing existing mapping for ${col}`);
          mappings[col] = '';
        }
      });
    }

    // Set the new mapping first
    mappings[csvColumn] = value;
    
    // Set the mapping and reorder
    const [targetTable, field] = value.split('.');
    if (targetTable === 'Planted') {
      // Set the mapping
      mappings[csvColumn] = value;
      // Force reorder
      reorderColumns();
      // Force reactivity
      orderedCsvColumns = [...orderedCsvColumns];
    }

    // Handle special cases for land_name and crop_name
    if (
      (targetTable === 'Land' && field === 'land_name') ||
      (targetTable === 'Crop' && field === 'crop_name')
    ) {
      // Map to both the original table and Planted table
      const baseCol = csvColumn.replace('_planted', '');
      mappings[`${baseCol}_planted`] = `Planted.${field}`;
      mappings[baseCol] = `${targetTable}.${field}`; // Keep the original table mapping
    }

    // Update preview data for all tables
    if (csvData) {
      // Reset imported plantings
      importedPlantings = [];

      // Update Planted table first
      const plantedMappings = new Map();
      Object.entries(mappings).forEach(([col, mapping]) => {
        if (mapping) {
          const [mapTable, field] = mapping.split('.');
          if (mapTable === 'Planted') {
            plantedMappings.set(field, col);
          }
        }
      });

      // Create preview rows for Planted table
      previewData.Planted = csvData.slice(0, 5).map((row) => {
        const previewRow = {};
        plantedMappings.forEach((csvCol, field) => {
          previewRow[field] = row[csvCol] || '';
        });
        return previewRow;
      });

      // Then update Land and Crop tables
      ['Land', 'Crop'].forEach((table) => {
        const tableMappings = new Map();
        Object.entries(mappings).forEach(([col, mapping]) => {
          if (mapping) {
            const [mapTable, field] = mapping.split('.');
            if (mapTable === table) {
              tableMappings.set(field, col);
            }
          }
        });

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

        // Track valid land-crop combinations and their planting data from import data
        if (table === 'Land' || table === 'Crop') {
          const landNameMapping = Object.entries(mappings).find(
            ([_, val]) => val === 'Land.land_name'
          )?.[0];
          const cropNameMapping = Object.entries(mappings).find(
            ([_, val]) => val === 'Crop.crop_name'
          )?.[0];

          if (landNameMapping && cropNameMapping) {
            // Get all valid land-crop combinations from import data
            importedPlantings = csvData
              .map((row) => ({
                land_name: row[landNameMapping],
                crop_name: row[cropNameMapping],
              }))
              .filter(
                (planting) =>
                  // Ensure both land_name and crop_name exist and are valid
                  planting.land_name &&
                  planting.crop_name &&
                  previewData.Land.some((land) => land.land_name === planting.land_name) &&
                  previewData.Crop.some((crop) => crop.crop_name === planting.crop_name)
              );

            // Update Planted table preview with actual planting combinations
            previewData.Planted = importedPlantings.map((planting) => ({
              land_name: planting.land_name,
              crop_name: planting.crop_name,
              planted: '',
              planted_valid: true,
              planting_date: '',
              gps_lat: '',
              gps_lon: '',
              species_id: '',
              seedlot: '',
              seedzone: '',
              crop_stock: '',
              hectares: '',
              preparation_id: '',
              notes: ''
            }));
          }
        }
      });

      // Force reactivity for preview data
      previewData = { ...previewData };

      // Force reactivity
      previewData = { ...previewData };
    }
  }

  // Add these functions for drag and drop
  function handleDragStart(event: DragEvent, csvColumn: string) {
    if (event.dataTransfer) {
      console.log(`Starting drag for column: ${csvColumn}`);
      event.dataTransfer.setData('text/plain', csvColumn);
      event.dataTransfer.effectAllowed = 'move';
      const target = /** @type {HTMLElement} */ (event.target);
      target.classList.add('dragging');
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    const target = /** @type {HTMLElement} */ (event.target);
    target.classList.add('drag-over');
  }

  function handleDragLeave(event: DragEvent) {
    const target = /** @type {HTMLElement} */ (event.target);
    target.classList.remove('drag-over');
  }

  function handleDrop(event: DragEvent, table: string, field: string) {
    event.preventDefault();
    console.log('=== Handle Drop Start ===');
    
    // Immediately return if not Planted table
    if (table !== 'Planted') {
      console.log('Dropping only allowed on Planted table');
      return;
    }

    const target = /** @type {HTMLElement} */ (event.target);
    target.classList.remove('drag-over');

    const csvColumn = event.dataTransfer?.getData('text/plain');
    console.log(`Dropped ${csvColumn} onto ${table}.${field}`);

    if (csvColumn && csvData) {
      console.log('Before mappings:', {...mappings});
      console.log('Before columns:', [...orderedCsvColumns]);
      
      // Clear any existing mappings to this target field
      Object.entries(mappings).forEach(([col, mapping]) => {
        if (mapping === `${table}.${field}`) {
          console.log(`Clearing existing mapping for ${col}`);
          mappings[col] = '';
        }
      });

      // Validate if dropping onto 'planted' field
      if (field === 'planted') {
        // Check if the column contains valid numbers
        const hasInvalidNumbers = csvData.some((row) => !validateNumber(row[csvColumn]).isValid);
        if (hasInvalidNumbers) {
          errorMessage = 'Cannot map this column to planted - contains non-numeric values';
          console.error(errorMessage);
          return;
        }
      }

      // Set the new mapping
      mappings[csvColumn] = `${table}.${field}`;
      console.log('After setting mapping:', {...mappings});
      
      // Force reorder
      reorderColumns();
      
      // Force reactivity
      orderedCsvColumns = [...orderedCsvColumns];
      console.log('Final columns:', [...orderedCsvColumns]);
      console.log('=== Handle Drop End ===');

      // Get unique land names and their fields
      const uniqueLands = new Map();
      const landNameCol = Object.entries(mappings).find(
        ([_, mapping]) => mapping === 'Planted.land_name'
      )?.[0];
      const gpsLatCol = Object.entries(mappings).find(
        ([_, mapping]) => mapping === 'Planted.gps_lat'
      )?.[0];
      const gpsLonCol = Object.entries(mappings).find(
        ([_, mapping]) => mapping === 'Planted.gps_lon'
      )?.[0];
      const hectaresCol = Object.entries(mappings).find(
        ([_, mapping]) => mapping === 'Planted.hectares'
      )?.[0];
      const prepIdCol = Object.entries(mappings).find(
        ([_, mapping]) => mapping === 'Planted.preparation_id'
      )?.[0];

      // Get unique crop names and their fields
      const uniqueCrops = new Map();
      const cropNameCol = Object.entries(mappings).find(
        ([_, mapping]) => mapping === 'Planted.crop_name'
      )?.[0];
      const speciesIdCol = Object.entries(mappings).find(
        ([_, mapping]) => mapping === 'Planted.species_id'
      )?.[0];
      const seedlotCol = Object.entries(mappings).find(
        ([_, mapping]) => mapping === 'Planted.seedlot'
      )?.[0];
      const seedzoneCol = Object.entries(mappings).find(
        ([_, mapping]) => mapping === 'Planted.seedzone'
      )?.[0];
      const cropStockCol = Object.entries(mappings).find(
        ([_, mapping]) => mapping === 'Planted.crop_stock'
      )?.[0];

      if (landNameCol) {
        csvData.forEach((row) => {
          const landName = row[landNameCol];
          if (!uniqueLands.has(landName)) {
            const landEntry = { land_name: landName };
            if (gpsLatCol) landEntry.gps_lat = row[gpsLatCol];
            if (gpsLonCol) landEntry.gps_lon = row[gpsLonCol];
            if (hectaresCol) landEntry.hectares = row[hectaresCol];
            if (prepIdCol) landEntry.preparation_id = row[prepIdCol];
            uniqueLands.set(landName, landEntry);
          }
        });
        // Update Land table with unique lands and their fields
        previewData.Land = Array.from(uniqueLands.values());
      }

      if (cropNameCol) {
        csvData.forEach((row) => {
          const cropName = row[cropNameCol];
          if (!uniqueCrops.has(cropName)) {
            const cropEntry = { crop_name: cropName };
            if (speciesIdCol) cropEntry.species_id = row[speciesIdCol];
            if (seedlotCol) cropEntry.seedlot = row[seedlotCol];
            if (seedzoneCol) cropEntry.seedzone = row[seedzoneCol];
            if (cropStockCol) cropEntry.crop_stock = row[cropStockCol];
            uniqueCrops.set(cropName, cropEntry);
          }
        });
        // Update Crop table with unique crops and their fields
        previewData.Crop = Array.from(uniqueCrops.values());
      }

      // Update all tables based on current mappings
      ['Planted', 'Land', 'Crop'].forEach((tableName) => {
        // Get mappings for this table
        const tableMappings = new Map();
        Object.entries(mappings).forEach(([col, mapping]) => {
          if (mapping) {
            const [mapTable, mapField] = mapping.split('.');
            if (mapTable === tableName) {
              tableMappings.set(mapField, col);
            }
          }
        });

        // Create preview rows using the current mappings
        if (tableMappings.size > 0 && tableName !== 'Land') {
          // Skip Land table as we handle it separately
          previewData[tableName] = csvData.slice(0, 5).map((row, index) => {
            const previewRow = {};
            tableMappings.forEach((csvCol, field) => {
              if (field === 'planted' || field === 'hectares') {
                const validation = validateNumber(row[csvCol]);
                previewRow[field] = validation.value;
                previewRow[`${field}_valid`] = validation.isValid;
              } else if (field === 'species_id' || field === 'seedlot' || field === 'seedzone' || 
                         field === 'crop_stock' || field === 'preparation_id' || field === 'notes') {
                previewRow[field] = row[csvCol] || '';
              } else if (field === 'gps_lat' || field === 'gps_lon') {
                previewRow[field] = row[csvCol] || '';
              } else {
                previewRow[field] = row[csvCol] || '';
              }
            });
            return previewRow;
          });
        }
      });

      // Force reactivity
      previewData = { ...previewData };

      // Clear any error message
      errorMessage = '';
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

<div class="csv-mapper">
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
          <div class="flex flex-nowrap" style="margin-bottom: 0.25rem;">
            {#each orderedCsvColumns as csvColumn, i}
              <div 
                class="p-2 bg-gray-800 text-white flex-shrink-0" 
                style="width: var(--column-width);"
              >
                <select
                  bind:value={mappings[csvColumn]}
                  class="w-full bg-gray-800 text-white border border-gray-600 rounded p-1 cursor-pointer appearance-none hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
                  style="background-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'><path fill=\'white\' d=\'M7 10l5 5 5-5z\'/></svg>'); background-repeat: no-repeat; background-position: right 0.5rem center; background-size: 1rem; padding-right: 1.5rem;"
                  on:change={() => {
                    console.log(`Dropdown changed for ${csvColumn}`);
                    reorderColumns();
                  }}
                >
                  <option value="">Select target field</option>
                  <optgroup label="Planting Data (Main Interface)">
                    {#each databaseFields.Planted as field}
                      <option value={`Planted.${field}`}>{field}</option>
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
              <tr class="flex flex-nowrap">

                {#each orderedCsvColumns as csvColumn}
                  <th
                    class="p-2 bg-gray-800 text-white border-b border-gray-700 font-medium text-left flex-shrink-0"
                    style="width: var(--column-width);"
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
                <tr class="flex flex-nowrap">
                  {#each orderedCsvColumns as column}
                    <td
                      draggable="true"
                      on:dragstart={(e) => handleDragStart(e, column)}
                      class="p-2 bg-gray-800 text-white border-b border-gray-700 cursor-move hover:bg-gray-700 flex-shrink-0"
                      style="width: var(--column-width);"
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
        {#each ['Planted', 'Crop', 'Land'] as tableName}
          <div class="table-info">
            <h2 class="text-lg font-bold" style="margin: 0; padding: 0;">{tableName} Table</h2>
            <div class="table-preview">
              <table
                style="background: {tableName !== 'Planted'
                  ? '#333333'
                  : 'inherit'} !important; color: {tableName !== 'Planted'
                  ? 'white'
                  : 'inherit'} !important;"
              >
                <thead>
                  <tr>
                    {#each tableHeaders[tableName] || [] as header}
                      <th
                        style="background: {tableName !== 'Planted'
                          ? '#333333'
                          : 'inherit'} !important;
                               color: {tableName !== 'Planted' ? 'white' : 'inherit'} !important;"
                        draggable={tableName === 'Planted'}
                        on:dragstart={tableName === 'Planted'
                          ? (e) => handleMappingDragStart(e, tableName, header)
                          : null}
                        on:dragend={tableName === 'Planted'
                          ? (e) => handleMappingDragEnd(e, tableName, header)
                          : null}
                        on:dragover={tableName === 'Planted' ? handleDragOver : null}
                        on:drop={tableName === 'Planted'
                          ? (e) => handleDrop(e, tableName, header)
                          : (e) => e.preventDefault()}
                        class={tableName === 'Planted' ? 'droppable-column hover:bg-blue-50' : ''}
                      >
                        {header}
                      </th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each previewData[tableName] as row, rowIndex}
                    <tr
                      style="background: {tableName !== 'Planted'
                        ? '#333333'
                        : 'inherit'} !important;"
                    >
                      {#each tableHeaders[tableName] || [] as header}
                        <td
                          style="background: {tableName !== 'Planted'
                            ? '#333333'
                            : 'inherit'} !important;
                                 color: {tableName !== 'Planted' ? 'white' : 'inherit'} !important;"
                          draggable={tableName === 'Planted'}
                          on:dragstart={tableName === 'Planted'
                            ? (e) => handleMappingDragStart(e, tableName, header)
                            : null}
                          on:dragend={tableName === 'Planted'
                            ? (e) => handleMappingDragEnd(e, tableName, header)
                            : null}
                          on:dragover={tableName === 'Planted' ? handleDragOver : null}
                          on:drop={tableName === 'Planted'
                            ? (e) => handleDrop(e, tableName, header)
                            : (e) => e.preventDefault()}
                          class={tableName === 'Planted' ? 'droppable-column hover:bg-blue-50' : ''}
                          class:invalid={row[`${header}_valid`] === false}
                          data-row-index={rowIndex}
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
    --column-width: 12.5rem; /* 200px equivalent */
  }

  /* Ensure all table cells have consistent width */
  .table-container th,
  .table-container td,
  .table-preview th,
  .table-preview td {
    width: var(--column-width) !important;
    min-width: var(--column-width) !important;
    max-width: var(--column-width) !important;
  }

  select {
    width: var(--column-width);
    padding: 0.25rem 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.25rem;
    background-color: white;
    font-size: 0.875rem;
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

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .file-upload {
    border: 2px dashed #ccc;
    border-radius: 0.25rem;
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
    width: auto;
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
    border-radius: 0.25rem;
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
    border-radius: 0.25rem;
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
    width: auto;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .table-preview th,
  .table-preview td {
    width: var(--column-width);
    min-width: var(--column-width);
    max-width: var(--column-width);
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
    border-radius: 0.25rem;
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
    border-radius: 0.25rem;
    background: var(--color-surface-2);
  }

  .column-name {
    margin-top: 0.5rem;
    font-size: 0.9em;
    text-align: center;
    color: var(--color-text-secondary);
  }
</style>
