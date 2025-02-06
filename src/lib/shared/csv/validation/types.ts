export type CsvColumnType = 
  | 'string'
  | 'number'
  | 'date'
  | 'gps'
  | 'email'
  | 'url'
  | 'boolean';

export interface ColumnAnalysis {
  name: string;
  currentType: string;
  suggestedType: CsvColumnType;
  confidence: number;  // 0-1
  sampleValues: string[];
  invalidValues: string[];
  totalRows: number;
  validRows: number;
}

export interface TransformSuggestion {
  column: string;
  action: 'convert' | 'clean' | 'remove' | 'rename';
  description: string;
  preview: {
    before: string[];
    after: string[];
  };
  confidence: number;
}

export interface CsvValidationState {
  fileName: string;
  totalRows: number;
  columns: ColumnAnalysis[];
  suggestions: TransformSuggestion[];
  status: 'analyzing' | 'ready' | 'error';
  error?: string;
}
