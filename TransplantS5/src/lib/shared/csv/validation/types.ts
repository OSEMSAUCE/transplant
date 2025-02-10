export type CsvColumnType = 'string' | 'number' | 'date' | 'gps' | 'boolean';

export interface ColumnAnalysis {
  name: string;
  currentType: CsvColumnType;
  suggestedType: CsvColumnType;
  sampleValues: string[];
  allValues: string[];
  invalidValues?: string[];
  totalRows: number;
  validationErrors?: string[];
}

export interface CsvRow {
  [key: string]: string;
}

export interface TransformSuggestion {
  columnName: string;
  suggestedType: CsvColumnType;
  confidence: number;
  reason: string;
}
