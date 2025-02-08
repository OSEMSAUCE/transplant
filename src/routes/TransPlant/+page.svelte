<script lang="ts">
  /// <reference types="svelte" />
  /// <reference types="vite/client" />
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import ColumnHeader from '$lib/components/ColumnHeader.svelte';

  export let data;


  type FieldType = 'string' | 'number' | 'date' | 'latitude' | 'longitude';


  // Type definitions
  type CsvRow = Record<string, string | null>;
  type ValidationResult = { valid: boolean; value: string | number | Date | null };

  interface PreviewRow extends Record<string, string | boolean> {
    [key: `${string}_valid`]?: boolean;
  }

  interface FieldDefinition {
    name: string;
    type: FieldType;
    required: boolean;
    propagatesTo?: 'Land' | 'Crop';
  }

  interface TableSchema {
    name: string;
    fields: FieldDefinition[];
    isInteractive?: boolean;
  }

    // Validation functions
    function formatValue(value: any, field: string): string {
      if (value === null || value === undefined || value === '') {
        return '';
      }

      // Get field type based on the field name
      let fieldType = 'string';
      if (field === 'hectares' || field === 'planted' || field === 'numberTrees') {
        fieldType = 'number';
      } else if (field === 'planting_date' || field === 'Dates') {
        fieldType = 'date';
      } else if (field === 'gps_lat' || field === 'gps_lon' || field === 'lon') {
        fieldType = 'gps';
      }

      switch (fieldType) {
    case 'number':
      // Remove any commas or spaces first
      const cleanedValue = String(value).replace(/[,\s]/g, '');
      const num = Number(cleanedValue);
      return !isNaN(num) ? num.toLocaleString() : value;
    case 'date':
      try {
        // First try to parse the date
        let date: Date;
        
        // Try parsing various formats
        if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}$/.test(value)) {
          // Format: 6 Feb 25 or 6 Feb 2025
          date = new Date(value);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          // Format: 2025-02-06
          date = new Date(value);
        } else {
          date = new Date(value);
        }
        
        if (isNaN(date.getTime())) {
          return value;
        }
        
        return date.toLocaleDateString();
      } catch (error) {
        return value;
      }
    case 'gps':
      // Handle GPS coordinates in various formats
      const cleanedCoord = String(value).replace(/[°'"\s]/g, '');
      const coord = Number(cleanedCoord);
      return !isNaN(coord) ? coord.toFixed(6) : value;
    default:
      return String(value);
  }
  }

  function getRowValue(row: CsvRow | PreviewRow, column: string): string {
    const value = row[column];
    return value === null || value === undefined || typeof value === 'boolean' ? '' : formatValue(value, column);
  }

  function validateField(value: string, type: FieldType): ValidationResult {
    if (value === '' || value == null) {
      return { valid: true, value: null };
    }

    let num: number;
    let coord: number;
    let date: Date;

    switch (type) {
      case 'number':
        num = Number(value.trim());

        return { valid: !isNaN(num), value: !isNaN(num) ? num : null };
      case 'latitude':
        coord = Number(value.trim());
        return {
          valid: !isNaN(coord) && coord >= -90 && coord <= 90,
          value: !isNaN(coord) ? coord : null,
        };
      case 'longitude':
        coord = Number(value.trim());
        return {
          valid: !isNaN(coord) && coord >= -180 && coord <= 180,
          value: !isNaN(coord) ? coord : null,
        };
      case 'date':
        // Check if input is just a year (4 digits)
        if (/^\d{4}$/.test(value.trim())) {
          date = new Date(value.trim() + '-01-01');
        } else {
          date = new Date(value);
        }
        return { valid: !isNaN(date.getTime()), value: !isNaN(date.getTime()) ? date : null };
      default:
        return { valid: true, value: value.trim() };
    }
  }

  // Define the database schema
  const schema: TableSchema[] = [
    {
      name: 'Planted',
      isInteractive: true,
      fields: [
        // Core fields
        { name: 'land_name', type: 'string', required: true, propagatesTo: 'Land' },
        { name: 'species_id', type: 'string', required: false, propagatesTo: 'Crop' },
        { name: 'planted', type: 'number', required: true },
        { name: 'planting_date', type: 'date', required: false },
        // Location fields
        { name: 'gps_lat', type: 'latitude', required: false, propagatesTo: 'Land' },
        { name: 'gps_lon', type: 'longitude', required: false, propagatesTo: 'Land' },
        { name: 'hectares', type: 'number', required: false, propagatesTo: 'Land' },
        { name: 'preparation_id', type: 'string', required: false, propagatesTo: 'Land' },
        // Crop fields
        { name: 'seedlot', type: 'string', required: false, propagatesTo: 'Crop' },
        { name: 'seedzone', type: 'string', required: false, propagatesTo: 'Crop' },
        { name: 'crop_stock', type: 'string', required: false, propagatesTo: 'Crop' },
        { name: 'nursery', type: 'string', required: false, propagatesTo: 'Crop' },
        // Additional fields
        { name: 'notes', type: 'string', required: false },
      ],
    },
    {
      name: 'Land',
      isInteractive: false,
      fields: [
        { name: 'land_name', type: 'string', required: true },
        { name: 'hectares', type: 'number', required: true },
        { name: 'preparation_id', type: 'string', required: false },
        { name: 'gis_area', type: 'number', required: false },
        { name: 'gps_lat', type: 'latitude', required: false },
        { name: 'gps_lon', type: 'longitude', required: false },
        { name: 'notes', type: 'string', required: false },
      ],
    },
    {
      name: 'Crop',
      isInteractive: false,
      fields: [
        { name: 'species_id', type: 'string', required: true },
        { name: 'seedlot', type: 'string', required: false },
        { name: 'seedzone', type: 'string', required: false },
        { name: 'crop_stock', type: 'string', required: false },
        { name: 'nursery', type: 'string', required: false },
      ],
    },
  ];

  // Generate table headers from schema
  let databaseFields: Record<string, string[]>;
  let tableHeaders = Object.fromEntries(
    schema.map((table) => [table.name, table.fields.map((field) => field.name)])
  );
  // previewData is already declared above

  let errorMessage = '';
  let csvData: CsvRow[] | null = null;
  let typedCsvData: PreviewRow[] = [];

  function isValidKey(key: string): key is keyof PreviewRow {
    const allKeys = [
      ...tableHeaders.Land,
      ...tableHeaders.Crop,
      ...tableHeaders.Planted,
      ...tableHeaders.Planted.map(k => `${k}_valid`)
    ];
    return allKeys.includes(key);
  }

  $: if (csvData) {
    typedCsvData = csvData.map((row) => {
      const typedRow: PreviewRow = {};
      Object.keys(row).forEach((key) => {
        if (isValidKey(key)) {
          typedRow[key] = getRowValue(row, key);
        }
      });
      return typedRow;
    });
  }
  let mappings: Record<string, string> = {};
  $: console.log('Mappings updated:', mappings);
  let validMappings: Record<string, boolean[]> = {};
  let previewValidation: Record<string, Record<string, boolean[]>> = {};

  // Validate mappings whenever they change
  $: {
    if (csvData && mappings) {
      // Reset validation state
      previewValidation = {};
      validMappings = {};

      Object.entries(mappings).forEach(([column, mapping]) => {
        if (!mapping) {
          validMappings[column] = [true];
          return;
        }

        const [table, field] = mapping.split('.');
        const tableSchema = schema.find((s) => s.name === table);
        const fieldDef = tableSchema?.fields.find((f) => f.name === field);

        if (!fieldDef) {
          validMappings[column] = [false];
          return;
        }

        // Validate each row's value against the field type
        const hasInvalidValues = csvData?.some((row) => {
          const result = validateField(row[column], fieldDef.type);
          return !result.valid;
        });

        validMappings[column] = [!hasInvalidValues];

        // Store validation results for preview
        if (hasInvalidValues) {
          previewValidation[column] = {};
          csvData?.slice(0, 5).forEach((row, i) => {
            const result = validateField(row[column], fieldDef.type);
            previewValidation[column][i] = [result.valid];
          });
        }

        // If field is required and all values are empty, mark as invalid
        if (fieldDef.required && csvData?.every((row) => !row[column])) {
          validMappings[column] = [false];
          previewValidation[column] = {};
          csvData.slice(0, 5).forEach((_, i) => {
            previewValidation[column][i] = [false];
          });
          delete mappings[column];
        } else {
          validMappings[column] = [true];
        }
      });
      // Trigger reactivity by creating new objects
      validMappings = { ...validMappings };
      mappings = { ...mappings };
    }
  }
  let fileInput: HTMLInputElement | null = null;
  

  let csvColumns: string[] = [];
  let orderedCsvColumns: string[] = [];
  let excludedColumns = new Set<string>();

  // Initialize preview data with empty rows and all fields
  let previewData: Record<string, PreviewRow[]> = {
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

  // FieldDefinition interface is already defined above

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
      crop_stock: { type: 'string', required: false },
      nursery: { type: 'string', required: false },
    },
    Planted: {
      land_name: { type: 'string', required: true },
      species_id: { type: 'string', required: false, propagatesTo: 'Crop' },
      planted: { type: 'number', required: true },
      planting_date: { type: 'date', required: false },
      gps_lat: { type: 'latitude', required: true, propagatesTo: 'Land' },
      gps_lon: { type: 'longitude', required: true, propagatesTo: 'Land' },
      seedlot: { type: 'string', required: false, propagatesTo: 'Crop' },
      seedzone: { type: 'string', required: false, propagatesTo: 'Crop' },
      crop_stock: { type: 'string', required: false, propagatesTo: 'Crop' },
      nursery: { type: 'string', required: false, propagatesTo: 'Crop' },
      hectares: { type: 'number', required: false, propagatesTo: 'Land' },
      preparation_id: { type: 'string', required: false, propagatesTo: 'Land' },
      notes: { type: 'string', required: false }
    }
  };

  async function fetchTableHeaders() {
    try {
      // TODO: Replace with actual API call when ready
      // const response = await fetch('/api/schema');
      // if (!response.ok) throw new Error('Failed to fetch schema');
      // const schema = await response.json();

      // For now, use hardcoded schema
      const plantedFields = [
        'land_name', 
        'species_id', 
        'planted',
        'planting_date',
        'gps_lat',
        'gps_lon',
        'hectares',
        'preparation_id',
        'species_id',
        'seedlot',
        'seedzone',
        'crop_stock',
        'nursery',
        'notes',
      ];

      tableHeaders = {
        Land: ['land_name', 'hectares', 'preparation_id', 'gps_lat', 'gps_lon', 'notes'],
        Crop: ['crop_name', 'species_id', 'seedlot', 'seedzone', 'crop_stock', 'nursery'],
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
      errorMessage = `Error fetching table headers: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
  

  onMount(() => {
    fetchTableHeaders();

    // Auto-load mock data in development
    if (import.meta.env.DEV === true) {
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
      let processingStage = 'start';
      try {
        processingStage = 'parsing';
        Papa.parse(file, {
          complete: (results: Papa.ParseResult<CsvRow>) => {
            processingStage = 'mapping';
            csvData = results.data;
            console.log('Parsed CSV Data:', csvData);
            
            // Get column headers
            if (results.data.length > 0) {
              orderedCsvColumns = Object.keys(results.data[0]);
            }

            // Initialize empty preview data with 5 rows for each table
            previewData = {
              Land: Array(5).fill().map(() => ({})),
              Crop: Array(5).fill().map(() => ({})),
              Planted: Array(5).fill().map(() => ({}))
            };
            console.log('Preview Data after init:', JSON.parse(JSON.stringify(previewData)));

            // Initialize mappings
            mappings = {};
            
            // Initialize table headers from schema
            tableHeaders = {};
            schema.forEach(table => {
              tableHeaders[table.name] = table.fields.map(f => f.name);
            });
            console.log('Table Headers after init:', tableHeaders);
            
            // Show first 5 rows in the import table
            typedCsvData = results.data.slice(0, 5).map(row => {
              const newRow: Record<string, string> = {};
              Object.keys(row).forEach(key => {
                newRow[key] = row[key]?.toString() || '';
              });
              return newRow;
            });

            // Initialize preview data
            previewData = {
              Land: [],
              Crop: [],
              Planted: []
            };
          },
          header: true,
        });
      } catch (e) {
        console.error(`CSV processing failed at stage: ${processingStage}`, e);
        errorMessage = `CSV Processing Error: ${e.message}`;
        return;
      }
      // Add required field check
      if (!previewData.some(d => d.land_name && d.crop_name)) {
        console.error('Missing required land_name/crop_name in:', previewData);
        errorMessage = 'CSV missing required land_name or crop_name columns';
        return;
      }
    }
  }

  function reorderColumns() {
    if (!csvData || csvData.length === 0) return;
    
    console.log('=== Starting column reorder ===');
    console.log('Current columns:', [...orderedCsvColumns]);
    console.log('Current mappings:', { ...mappings });

    // Create arrays to hold columns in their new order
    const newOrder = [];

    // Create a map of target positions based on Planted table order
    const fieldPositions: Record<string, number> = {};
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

  // Validate numeric fields
  function validateNumber(
    value: string | number,
    decimals = 0
  ): { isValid: boolean; value?: number } {
    // Handle empty or undefined values
    if (value === undefined || value === null || value === '') {
      return { isValid: false };
    }

    // Convert to string for validation
    const strValue = String(value).trim();

    // Check if it's a valid number
    const numValue = parseFloat(strValue);
    if (isNaN(numValue)) {
      return { isValid: false };
    }

    // Check if it has the correct number of decimal places
    if (decimals === 0 && strValue.includes('.')) {
      return { isValid: false };
    }

    const parts = strValue.split('.');
    if (parts[1] && parts[1].length > decimals) {
      return { isValid: false };
    }

    return { isValid: true, value: numValue };
  }

  // Drag and Drop Event Handlers
  
  /**
   * Initiates drag operation for a CSV column header or cell
   * Sets the dragged column name as transfer data and adds visual feedback
   */
  function handleDragStart(event: DragEvent, csvColumn: string) {
    if (event.dataTransfer) {
      console.log(`Starting drag for column: ${csvColumn}`);
      event.dataTransfer.setData('text/plain', csvColumn);
      event.dataTransfer.effectAllowed = 'move';
      const target = /** @type {HTMLElement} */ (event.target);
      (target as HTMLElement).classList.add('dragging');
    }
  }

  /**
   * Handles dragover event to allow dropping
   * Adds visual feedback when dragging over a valid drop target
   */
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    const target = /** @type {HTMLElement} */ (event.target);
    (target as HTMLElement).classList.add('drag-over');
  }

  /**
   * Processes drop event when a CSV column is dropped onto a table field
   * - Updates mappings between CSV columns and database fields
   * - Validates data types (e.g., numbers, dates)
   * - Updates preview data for all affected tables
   * - Reorders columns based on mappings
   */
  function handleDrop(event: DragEvent, table: string, field: string) {
    event.preventDefault();
    console.log('=== Handle Drop Start ===');

    // Immediately return if not Planted table
    if (table !== 'Planted') {
      console.log('Dropping only allowed on Planted table');
      return;
    }

    const target = /** @type {HTMLElement} */ (event.target);
    (target as HTMLElement).classList.remove('drag-over');

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

      // Keep track of existing mappings
      const existingMappings = { ...mappings };

      // Check if target field is a number field
      const fieldType = tableFieldTypes[table]?.[field]?.type;
      if (fieldType === 'number') {
        // Check if column contains non-numeric values
        const hasNonNumeric = csvData.some((row) => {
          const val = row[csvColumn];
          return !val || isNaN(Number(val.replace(',', '')));
        });

        if (hasNonNumeric) {
          console.log('Warning: Some rows contain non-numeric values');
          // Update validation state but don't proceed with mapping
          if (!previewValidation[table]) {
            previewValidation[table] = {};
          }
          previewValidation[table][field] = false;
          console.log('Updated previewValidation:', previewValidation);

          // Update preview data to show error state
          previewData[table] = previewData[table].map((row) => ({
            ...row,
            [field]: 'Number required',
          }));
          previewData = { ...previewData }; // Force reactivity
          previewValidation = { ...previewValidation }; // Force reactivity
          return; // Exit early without reordering
        }
      }

      // Set the new mapping while preserving others
      mappings = {
        ...existingMappings,
        [csvColumn]: `${table}.${field}`
      };
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
        const validationErrors: Record<string, string[]> = {};
        previewData.Planted = csvData.slice(0, 5).map((row, index) => {
          console.log(`Processing row ${index}:`, row);
          const previewRow = {};
          validationErrors[index] = [];
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
              if (!validation.isValid) {
                validationErrors[index].push(`${mapField}: ${validation.message}`);
              }
              previewRow[mapField] = validation.value ?? rawValue;
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

        if (validationErrors.length > 0) {
          console.warn('Validation errors detected:', validationErrors);
        }
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
        ([, mapping]) => mapping === 'Planted.land_name'
      )?.[0];
      const gpsLatCol = Object.entries(mappings).find(
        ([, mapping]) => mapping === 'Planted.gps_lat'
      )?.[0];
      const gpsLonCol = Object.entries(mappings).find(
        ([, mapping]) => mapping === 'Planted.gps_lon'
      )?.[0];
      const hectaresCol = Object.entries(mappings).find(
        ([, mapping]) => mapping === 'Planted.hectares'
      )?.[0];
      const prepIdCol = Object.entries(mappings).find(
        ([, mapping]) => mapping === 'Planted.preparation_id'
      )?.[0];

      // Get unique crop names and their fields
      const uniqueCrops = new Map();
      const cropNameCol = Object.entries(mappings).find(
        ([, mapping]) => mapping === 'Planted.crop_name'
      )?.[0];
      const speciesIdCol = Object.entries(mappings).find(
        ([, mapping]) => mapping === 'Planted.species_id'
      )?.[0];
      const seedlotCol = Object.entries(mappings).find(
        ([, mapping]) => mapping === 'Planted.seedlot'
      )?.[0];
      const seedzoneCol = Object.entries(mappings).find(
        ([, mapping]) => mapping === 'Planted.seedzone'
      )?.[0];
      const cropStockCol = Object.entries(mappings).find(
        ([, mapping]) => mapping === 'Planted.crop_stock'
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
          previewData[tableName] = csvData?.slice(0, 5)?.map((row, index) => {
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

  /**
   * Initiates drag of an existing field mapping
   * Only allows dragging if the field is already mapped to a CSV column
   */
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

  /**
   * Handles the end of a mapping drag operation
   * Clears the mapping and preview data if the field was unmapped
   */
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
  };

  
</script>

<div class="csv-mapper">
  {#if errorMessage}
    <div
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
      role="alert"
    >
      <span class="block sm:inline">{errorMessage}</span>
    </div>
  {/if}
  <main class="container">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">TransPlant</h1>
      <div class="flex gap-4">
        <label
          class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
          for="csvUpload"
        >
          Upload CSV
          <input
            id="csvUpload"
            type="file"
            accept=".csv"
            on:change={handleFileSelect}
            class="hidden"
          />
        </label>
      </div>
    </div>

    {#if csvData}
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
                  // Trigger reactivity by creating a new array
                  excludedColumns = [...excludedColumns];

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
              {#each csvData?.slice(0, 5) || [] as row}
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
                  : 'inherit'} ; color: {tableName !== 'Planted' ? 'white' : 'inherit'} ;"
              >
                <thead>
                  <tr>
                    {#each tableHeaders[tableName] || [] as header}
                      <th
                        style="background: {tableName !== 'Planted' ? '#333333' : 'inherit'} ;
                               color: {tableName !== 'Planted' ? 'white' : 'inherit'} ;"
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
                    <tr style="background: {tableName !== 'Planted' ? '#333333' : 'inherit'} ;">
                      {#each tableHeaders[tableName] || [] as header}
                        <td
                          style="background: {tableName !== 'Planted' ? '#333333' : 'inherit'} ;
                                 color: {tableName !== 'Planted' ? 'white' : 'inherit'} ;"
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
                          class:invalid={tableName === 'Planted' &&
                            previewValidation?.[tableName]?.[header] === false}
                          data-row-index={rowIndex}
                          title={tableName === 'Planted' &&
                          previewValidation?.[tableName]?.[header] === false
                            ? tableFieldTypes[tableName]?.[header]?.type === 'number'
                              ? 'Number required'
                              : 'Invalid value'
                            : ''}
                        >
                          <div class="flex items-center justify-between w-full">
                            <span
                              style="color: {row[header] === 'Number required'
                                ? '#ef4444'
                                : 'inherit'}"
                            >
                              {row[header] || ''}
                            </span>
                          </div>
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
    margin: 0;
    padding: 0;
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
    vertical-align: middle;
    box-sizing: border-box;
  }

  /* Required fields - only in Planted table */
  .table-preview:has(th[data-table='Planted']) th[data-required='true'] {
    border: 2px solid var(--required-border);
  }

  /* Mapped fields - only in Import and Planted tables */
  .table-container th[data-mapped='true'],
  .table-container td[data-mapped='true'],
  .table-preview:has(th[data-table='Planted']) th[data-mapped='true'] {
    border: 2px solid var(--mapped-border);
  }

  th {
    font-size: 0.875rem;
  }

  .database-tables {
    margin: 0;
    padding: 0;
  }

  .table-info {
    margin: 0;
    padding: 0;
  }

  .table-preview {
    overflow-x: auto;
    margin: 0;
    padding: 0;
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
    background-color: #4a1c1c;
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
    background-color: #4a1c1c;
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
