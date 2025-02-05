<script lang="ts">
  /// <reference types="svelte" />
  // @ts-expect-error - PapaParse lacks TypeScript definitions
  import Papa from 'papaparse';
  import { onMount } from 'svelte';

  // Core columns that must stay at the start of Planted table
  const CORE_PLANTED_COLUMNS = ['land_name', 'crop_name', 'planted'];

  type CsvRow = Record<string, string>;
  type ValidationResult = { isValid: boolean; value: number | null };

  function validateNumber(value: any, decimals: number = 0): ValidationResult {
    if (typeof value === 'number') return { isValid: true, value };
    if (typeof value === 'string') {
      const num = Number(value.trim());
      if (!isNaN(num) && num > 0) {
        return { isValid: true, value: num };
      }
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
        { name: 'notes', type: 'string', required: false },
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
      'notes',
    ],
  };
  let databaseFields = tableHeaders;

  let errorMessage = '';
  let csvData: CsvRow[] | null = null;
  let mappings: Record<string, string> = {};
  let validMappings: Record<string, boolean> = {};

  // Store validation state for preview table
  let previewValidation: Record<string, Record<string, boolean>> = {};

  // Validate mappings before any UI updates
  $: {
    if (csvData && mappings) {
      // Reset preview validation
      previewValidation = {};

      Object.entries(mappings).forEach(([column, mapping]) => {
        if (!mapping) {
          validMappings[column] = true;
          return;
        }

        const [table, field] = mapping.split('.');
        const fieldType = tableFieldTypes[table]?.[field]?.type;

        if (fieldType === 'number') {
          const hasInvalidNumbers = csvData.some(row => {
            const val = row[column];
            return !val || isNaN(Number(val.replace(',', '')));
          });

          validMappings[column] = !hasInvalidNumbers;

          if (hasInvalidNumbers) {
            // Only store validation state for preview, don't modify source data
            if (!previewValidation[table]) {
              previewValidation[table] = {};
            }
            previewValidation[table][field] = false;
            
            // Remove invalid mapping
            delete mappings[column];
          }
        } else {
          validMappings[column] = true;
        }
      });
      validMappings = validMappings; // Trigger reactivity
      mappings = mappings; // Trigger reactivity
    }
  }
  let fileInput: any; // TODO: Add proper typing later
  import ColumnHeader from '$lib/components/ColumnHeader.svelte';

  let csvColumns: string[] = [];
  let orderedCsvColumns: string[] = [];
  let excludedColumns = new Set<string>();

  // Initialize preview data with empty rows and all fields
  let previewData = {
    Land: [] as Array<Record<string, string>>,
    Crop: [] as Array<Record<string, string>>,
    Planted: [] as Array<
      Record<
        string,
        string & {
          gps_lat?: string;
          gps_lon?: string;
          species_id?: string;
          seedlot?: string;
          seedzone?: string;
          crop_stock?: string;
          hectares?: string;
          preparation_id?: string;
          notes?: string;
        }
      >
    >,
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
      notes: { type: 'string', required: false },
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
    {
      parcelID: '3BEE3888',
      pledgeID: '3BEE22',
      organisationType: 'Something else',
      organisationWebsite: 'https://groundtruth.app/',
      Species: 'GT',
      countryName: 'Canada',
      lat: '47.870255',
      lon: '6.4099855',
      areaHa: '12.2',
      numberTrees: '2200',
      plantingYear: '2024',
      'trees/ha': '1,500',
      parcelOwnership: 'Public',
      CRS: '4323',
    },
  ];

  async function fetchTableHeaders() {
    try {
      // TODO: Replace with actual API call when ready
      // const response = await fetch('/api/schema');
      // if (!response.ok) throw new Error('Failed to fetch schema');
      // const schema = await response.json();

      // For now, use hardcoded schema
      const plantedFields = [
        // Core fields always come first
        ...CORE_PLANTED_COLUMNS,
        // Then other fields
        'planting_date',
        'gps_lat',
        'gps_lon',
        'hectares',
        'preparation_id',
        'species_id',
        'seedlot',
        'seedzone',
        'crop_stock',
        'notes',
      ];

      tableHeaders = {
        Land: ['land_name', 'hectares', 'preparation_id', 'gps_lat', 'gps_lon', 'notes'],
        Crop: ['crop_name', 'species_id', 'seedlot', 'seedzone', 'crop_stock'],
        Planted: plantedFields,
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
    console.log('Current mappings:', { ...mappings });

    // Create arrays to hold columns in their new order
    const newOrder = [];
    const processedColumns = new Set();

    // Create a map of target positions based on Planted table order
    const fieldPositions = {};
    tableHeaders.Planted.forEach((field, index) => {
      fieldPositions[field] = index;
    });

    // Map columns to their target positions
    const columnPositions = new Map();
    csvColumns.forEach((column) => {
      const mapping = mappings[column];
      if (mapping?.startsWith('Planted.')) {
        const field = mapping.split('.')[1];
        columnPositions.set(column, fieldPositions[field]);
      }
    });

    // Sort mapped columns by their target position in Planted table
    const mappedColumns = [...columnPositions.entries()]
      .sort(([, posA], [, posB]) => posA - posB)
      .map(([column]) => column);

    // Get unmapped columns (keeping their original order)
    const unmappedColumns = csvColumns.filter((column) => !mappings[column]);

    // Build final order
    newOrder.push(...mappedColumns);
    newOrder.push(...unmappedColumns);

    console.log('Mapped columns in order:', [...newOrder]);
    console.log('Unmapped columns:', unmappedColumns);

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

    // Update mapping - validation will happen in reactive statement
    if (value) {
      mappings[csvColumn] = value;
    } else {
      delete mappings[csvColumn];
    }
    
    // Trigger validation
    mappings = mappings;

    // Only reorder if the mapping is valid
    if (validMappings[csvColumn]) {
      const [targetTable] = value?.split('.') || [];
      if (targetTable === 'Planted') {
        reorderColumns();
      }
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
              notes: '',
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
      console.log('Before mappings:', { ...mappings });
      console.log('Before columns:', [...orderedCsvColumns]);

      // Clear any existing mappings to this target field
      Object.entries(mappings).forEach(([col, mapping]) => {
        if (mapping === `${table}.${field}`) {
          console.log(`Clearing existing mapping for ${col}`);
          mappings[col] = '';
        }
      });

      // Check if target field is a number field
      const fieldType = tableFieldTypes[table]?.[field]?.type;
      if (fieldType === 'number') {
        // Check if column contains non-numeric values
        const decimals = field === 'hectares' ? 1 : 0;
        const hasNonNumeric = csvData.some((row) => {
          const val = row[csvColumn];
          return val && !validateNumber(val, decimals).isValid;
        });

        if (hasNonNumeric) {
          console.log('Warning: Some rows contain non-numeric values');
        }
      }

      // Set the new mapping
      mappings[csvColumn] = `${table}.${field}`;
      console.log('MAPPING DEBUG:', {
        csvColumn,
        table,
        field,
        mappings: { ...mappings },
        csvData: csvData.slice(0, 2),
        currentValue: csvData[0][csvColumn],
        allColumnsInData: Object.keys(csvData[0]),
      });

      // Update preview data for all tables
      if (csvData) {
        console.log('CSV Data type:', typeof csvData, Array.isArray(csvData));
        console.log('First row:', csvData[0]);
        console.log('csvColumn:', csvColumn);
        console.log('field:', field);
        console.log('Raw value:', csvData[0][csvColumn]);

        // Get all current Planted mappings
        const plantedMappings = new Map();
        Object.entries(mappings).forEach(([col, mapping]) => {
          if (mapping) {
            const [mapTable, mapField] = mapping.split('.');
            if (mapTable === 'Planted') {
              plantedMappings.set(mapField, col);
            }
          }
        });

        // Add the current field being mapped
        plantedMappings.set(field, csvColumn);

        // Create preview rows with all mapped fields
        previewData.Planted = csvData.slice(0, 5).map((row: any, index: number) => {
          console.log(`Processing row ${index}:`, row);
          const previewRow = {};
          plantedMappings.forEach((csvCol, mapField) => {
            const rawValue = row[csvCol];
            console.log(`Row ${index} - ${mapField} from ${csvCol}:`, {
              rawValue,
              type: typeof rawValue,
              row,
              keys: Object.keys(row),
            });

            // For number fields, validate and store validation status
            const fieldType = tableFieldTypes[table]?.[mapField]?.type;
            if (fieldType === 'number' && rawValue) {
              const decimals = mapField === 'hectares' ? 1 : 0;
              const validation = validateNumber(rawValue, decimals);
              previewRow[mapField] = rawValue;
              previewRow[`${mapField}_valid`] = validation.isValid;
            } else {
              previewRow[mapField] = rawValue || '';
            }
          });
          return previewRow;
        });

        console.log('Preview data after update:', previewData.Planted);

        // Force reactivity
        previewData = { ...previewData };
      }

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
              } else if (
                field === 'species_id' ||
                field === 'seedlot' ||
                field === 'seedzone' ||
                field === 'crop_stock' ||
                field === 'preparation_id' ||
                field === 'notes'
              ) {
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
    {#if !csvData}
      <div class="file-upload">
        <input type="file" accept=".csv" on:change={handleFileSelect} bind:this={fileInput} />
        <p>Select a CSV file to begin mapping</p>
      </div>
    {:else}
      <div class="table-container">
        <h2 class="text-lg font-bold" style="margin: 0; padding: 0;">Import Table</h2>
        <div class="overflow-x-auto">
          <!-- Mapping Dropdowns Row -->
          <div
            class="grid"
            style="margin-bottom: 0.25rem; grid-template-columns: repeat({orderedCsvColumns.length}, var(--column-width));"
          >
            {#each orderedCsvColumns as csvColumn, i (csvColumn)}
              <ColumnHeader
                name={csvColumn}
                excluded={excludedColumns.has(csvColumn)}
                onExclude={(isExcluded) => {
                  if (isExcluded) {
                    excludedColumns.add(csvColumn);
                  } else {
                    excludedColumns.delete(csvColumn);
                  }
                  excludedColumns = excludedColumns;

                  // Reorder columns
                  const nonExcluded = orderedCsvColumns.filter((col) => !excludedColumns.has(col));
                  const excluded = orderedCsvColumns.filter((col) => excludedColumns.has(col));
                  orderedCsvColumns = [...nonExcluded, ...excluded];
                }}
                {mappings}
                {databaseFields}
              />
            {/each}
          </div>

          <table style="width: fit-content;">
            <thead>
              <tr class="flex flex-row flex-nowrap" style="width: fit-content;">
                {#each orderedCsvColumns as csvColumn}
                  <th
                    class="p-2 bg-gray-800 text-white border-b border-gray-700 font-medium text-left"
                    style="width: var(--column-width); flex: 0 0 var(--column-width);"
                    draggable="true"
                    on:dragstart={(e) => handleDragStart(e, csvColumn)}
                    data-mapped={mappings[csvColumn]}
                  >
                    {csvColumn}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each csvData.slice(0, 5) as row}
                <tr class="flex flex-row flex-nowrap">
                  {#each orderedCsvColumns as column}
                    <td
                      draggable="true"
                      on:dragstart={(e) => handleDragStart(e, column)}
                      class="p-2 bg-gray-800 text-white border-b border-gray-700 cursor-move hover:bg-gray-700 flex-shrink-0"
                      style="width: var(--column-width); {row[`${column}_valid`] === false
                        ? 'background-color: #4a1414;'
                        : ''}"
                      data-mapped={mappings[column]}
                      title={row[`${column}_valid`] === false ? 'Invalid number format' : ''}
                    >
                      {row[column] || ''}
                      {#if row[`${column}_valid`] === false}
                        <span class="text-red-500 text-xs"> (invalid)</span>
                      {/if}
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
                        data-table={tableName}
                        data-required={[
                          'land_name',
                          'crop_name',
                          'planted',
                          'gps_lat',
                          'gps_lon',
                        ].includes(header)}
                        data-mapped={Object.entries(mappings).some(
                          ([col, mapping]) => mapping === `${tableName}.${header}`
                        )}
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
                          class:invalid={tableName === 'Planted' && previewValidation?.Planted?.[header] === false}
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
    --row-height: 1.5rem; /* Even more compact row height */
    --cell-padding: 0.25rem;
    --required-border: #ff6b6b;
    --mapped-border: #4fff4f;
  }

  /* Table layout */
  .table-container {
    display: block;
    overflow-x: auto;
    width: fit-content;
  }

  /* Grid layout for dropdowns */
  .grid {
    display: grid;
    gap: 0;
    width: fit-content;
  }

  /* Table cells */
  .table-container th,
  .table-container td,
  .table-preview th,
  .table-preview td {
    width: var(--column-width);
    min-width: var(--column-width);
  }

  /* Table rows */
  .table-container tr {
    display: grid;
    grid-auto-flow: column;
    width: fit-content;
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

  /* Consistent row heights for all tables */
  tr {
    height: var(--row-height);
    line-height: var(--row-height);
  }

  th,
  td {
    min-width: var(--column-width);
    max-width: var(--column-width);
    width: var(--column-width);
    height: var(--row-height);
    line-height: var(--row-height);
    padding: 0 var(--cell-padding);
    text-align: left;
    border: 1px solid #ddd;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background-color: var(--background-color, #1e1e1e);
    color: var(--text-color, #ffffff);
    vertical-align: middle;
    box-sizing: border-box;
  }

  /* Required fields - only in Planted table */
  .table-preview:has(th[data-table='Planted']) th[data-required='true'] {
    border: 2px solid var(--required-border) !important;
  }

  /* Mapped fields - only in Import and Planted tables */
  .table-container th[data-mapped='true'],
  .table-container td[data-mapped='true'],
  .table-preview:has(th[data-table='Planted']) th[data-mapped='true'] {
    border: 2px solid var(--mapped-border) !important;
  }

  th {
    font-size: 0.875rem;
  }

  .database-tables {
    margin: 0 !important;
    padding: 0 !important;
  }

  .table-info {
    margin: 0 !important;
    padding: 0 !important;
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
    height: var(--row-height);
    line-height: var(--row-height);
    padding: 0 var(--cell-padding);
    text-align: left;
    border: 1px solid #ddd;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background-color: var(--background-color, #1e1e1e);
    color: var(--text-color, #ffffff);
    vertical-align: middle;
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

  .droppable-column.hover\:bg-blue-50:hover::after {
    background-color: rgba(59, 130, 246, 0.2); /* More visible in dark mode */
    border: 2px dashed #60a5fa; /* Brighter blue for dark mode */
  }

  /* Invalid number field styling */
  td.invalid {
    background-color: #4a1c1c !important;
    position: relative;
  }

  td.invalid::after {
    content: 'number required';
    color: #ff6b6b;
    margin-left: 0.5rem;
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
  }

  /* Invalid cell styling */
  .invalid {
    background-color: #4a1c1c !important;
    position: relative;
  }

  .invalid::after {
    content: 'number required';
    color: #ff6b6b;
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
  }
</style>
