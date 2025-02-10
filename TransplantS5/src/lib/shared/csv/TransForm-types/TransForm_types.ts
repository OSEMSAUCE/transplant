/**
 * Types for the TransForm CSV import process.
 * These types help validate and transform CSV data before importing into Transplant.
 */

// Supported column types for CSV data
export type CsvColumnType = 
  | 'string'   // Basic text
  | 'number'   // Numeric values (e.g., hectares)
  | 'date'     // Date/time values
  | 'gps'      // GPS coordinates
  | 'email'    // Email addresses
  | 'url'      // URLs/web addresses
  | 'boolean'; // True/false values

/**
 * Analysis of a single CSV column, including validation results
 * and suggested data type based on content analysis.
 */
export interface ColumnAnalysis {
  name: string;           // Column header from CSV
  currentType: string;    // Type detected in the data
  suggestedType: CsvColumnType;  // Recommended type for import
  confidence: number;     // How confident we are in the suggestion (0-1)
  sampleValues: string[]; // Example values from the column
  invalidValues: string[]; // Values that don't match expected type
  totalRows: number;     // Total rows in this column
  validRows: number;     // Rows that match expected type
}

/**
 * Suggested transformation to fix data quality issues
 * in a specific column.
 */
export interface TransformSuggestion {
  column: string;        // Column to transform
  action: 'convert' | 'clean' | 'remove' | 'rename';
  description: string;   // Human-readable explanation
  preview: {
    before: string[];    // Original values
    after: string[];     // How they'll look after transform
  };
  confidence: number;    // How confident we are this will help (0-1)
}

/**
 * Overall state of the CSV validation process.
 * Tracks progress and results of analyzing the file.
 */
export interface CsvValidationState {
  fileName: string;      // Name of uploaded file
  totalRows: number;     // Total rows in CSV
  columns: ColumnAnalysis[];
  suggestions: TransformSuggestion[];
  status: 'analyzing' | 'ready' | 'error';
  error?: string;        // Error message if something goes wrong
}
