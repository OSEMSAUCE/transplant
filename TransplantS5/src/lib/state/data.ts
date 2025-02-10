/**
 * Unified state management for Transplant data pipeline using Svelte 5 runes
 */

// Types for our data at different stages
export interface CsvData {
	headers: string[];
	rows: Record<string, string>[];
}

export interface TransformedData {
	headers: string[];
	rows: Record<string, any>[]; // Types validated and converted
	validations: Record<
		string,
		{
			type: string;
			invalidRows: number[];
			sampleValues: string[];
		}
	>;
}

export interface MappedData {
	rows: Record<string, any>[]; // Mapped to database schema
	mappings: Record<string, string>; // Column -> DB field mappings
	dbStatus?: 'waiting_room' | 'approved';
}

// Primary state using $state rune
export type Stage = 'empty' | 'csv' | 'transformed' | 'mapped';
export let stage = $state<Stage>('empty');
export let data = $state<CsvData | TransformedData | MappedData | null>(null);
export let errors = $state<string[]>([]);

// Derived state using $derived rune
export const isCsvLoaded = $derived(stage === 'csv');
export const isTransformed = $derived(stage === 'transformed');
export const isMapped = $derived(stage === 'mapped');

// State modification functions
export function loadCsv(headers: string[], rows: Record<string, string>[]) {
	data = { headers, rows };
	stage = 'csv';
	errors = [];
}

export function transform() {
	if (stage !== 'csv' || !data) {
		errors = ['Cannot transform: No CSV data loaded'];
		return;
	}

	const csvData = data as CsvData;
	const validations: Record<
		string,
		{ type: string; invalidRows: number[]; sampleValues: string[] }
	> = {};

	// Validate and convert types for each column
	csvData.headers.forEach((header) => {
		const values = csvData.rows.map((row) => row[header]);
		const type = inferType(values);
		const invalidRows = findInvalidRows(values, type);

		validations[header] = {
			type,
			invalidRows,
			sampleValues: values.slice(0, 5)
		};
	});

	// Convert to transformed data
	data = {
		headers: csvData.headers,
		rows: csvData.rows.map((row) => {
			const converted: Record<string, any> = {};
			for (const [key, value] of Object.entries(row)) {
				converted[key] = convertValue(value, validations[key].type);
			}
			return converted;
		}),
		validations
	};

	stage = 'transformed';
}

export function mapColumns(mappings: Record<string, string>) {
	if (stage !== 'transformed' || !data) {
		errors = ['Cannot map: Data must be transformed first'];
		return;
	}

	const transformedData = data as TransformedData;

	// Map columns to database schema
	data = {
		rows: transformedData.rows.map((row) => {
			const mapped: Record<string, any> = {};
			for (const [from, to] of Object.entries(mappings)) {
				mapped[to] = row[from];
			}
			return mapped;
		}),
		mappings
	};

	stage = 'mapped';
}

// Helper functions
function inferType(values: string[]): string {
	// Simple type inference
	const sample = values.find((v) => v !== null && v !== undefined && v !== '') || '';
	if (!isNaN(Number(sample))) return 'number';
	if (!isNaN(Date.parse(sample))) return 'date';
	if (['true', 'false', '0', '1'].includes(sample.toLowerCase())) return 'boolean';
	return 'string';
}

function findInvalidRows(values: string[], type: string): number[] {
	return values
		.map((value, index) => ({ value, index }))
		.filter(({ value }) => !isValidForType(value, type))
		.map(({ index }) => index);
}

function isValidForType(value: string, type: string): boolean {
	if (!value) return true; // Allow empty values
	switch (type) {
		case 'number':
			return !isNaN(Number(value));
		case 'date':
			return !isNaN(Date.parse(value));
		case 'boolean':
			return ['true', 'false', '0', '1'].includes(value.toLowerCase());
		default:
			return true;
	}
}

function convertValue(value: string, type: string): any {
	if (!value) return null;
	switch (type) {
		case 'number':
			return Number(value);
		case 'date':
			return new Date(value);
		case 'boolean':
			return ['true', '1'].includes(value.toLowerCase());
		default:
			return value;
	}
}
