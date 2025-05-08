/**
 * ColumnRep model implementation for TransPlant
 * This file provides concrete implementations of the ColumnRep interfaces
 * defined in columnTypes.ts, with methods for working with column data.
 */

export interface ColumnDef {
	headerName: string; // The header/importedColumnName
	isToggled: boolean; // Whether this column is toggled on/off
	isMapped?: boolean; // Whether this field is mapped to a DB column
	mappedTo?: string; // DB column this is mapped to (format: "table.column")
	isFormatted: boolean; // Whether the data has been formatted
	isMerged?: boolean; // Whether this column is created by merging other columns
	mergedFrom?: string[]; // If merged, the source columns that were merged
	isGpsSource?: boolean; // Whether this column is a source for the universal GPS column

	// Format coercion tracking

	// selectFormatCoercion?: selectFormatCoercion; // Information about type coercion if applicable

	// Database mapping properties (only relevant if isMapped is true)
	dbMapping?: {
		table: string; // Target database table
		column: string; // Target database column
		isRequired: boolean; // Whether the target column is required
		isNaturalKey?: boolean; // Whether this maps to a natural key
		naturalKeyFor?: string; // If natural key, the primary key it corresponds to
		isInsertPlanted?: boolean; // Whether this is a column from Land/Crop inserted into Planting for convenience
	};
}

export type ColumnFormat = 'string' | 'number' | 'date' | 'gps';
export interface ColumnRep extends ColumnDef {
	/** The column name/header from the imported data */
	headerName: string;
	type: ColumnFormat;

	/** The actual data values for this column */
	values: Array<string | number | null>;
	// NEW second array of formatted values 28 Apr 2025  7:06 AM
	formattedValues: Array<string | number | null | undefined>;

	/** Optional validation errors by row index */
	validationErrors?: Set<number>;
	component?: any; // Add component property

	// Add index signature to allow string indexing 26 Mar 2025
	[key: string]: any;
}

/**
 * Base column model with shared implementation
 * [NEW] Core class of the ColumnRep architecture
 * [INTENTION: Will replace existing column handling in TransformManager.svelte]
 */
export class BaseColumnModel implements ColumnDef {
	headerName: string;
	isToggled: boolean;
	isGreyed: Array<boolean>;
	isMapped: boolean;
	mappedTo?: string;
	isFormatted: boolean;
	isMerged?: boolean;
	mergedFrom?: string[];
	isGpsSource?: boolean;
	type: ColumnFormat = 'string';
	currentFormat: ColumnFormat = 'string';
	selectFormatCoercion?: selectFormatCoercion;
	dbMapping?: {
		table: string;
		column: string;
		isRequired: boolean;
		isNaturalKey?: boolean;
		naturalKeyFor?: string;
		isInsertPlanted?: boolean;
	};

	constructor(headerName: string) {
		this.headerName = headerName;
		this.isToggled = true;
		this.isGreyed = [false];
		this.isMapped = false;
		this.isFormatted = false;
	}
	changeFormat(newType: ColumnFormat, changedBy: 'auto' | 'user' = 'user') {
		if (this.type !== newType) {
			this.selectFormatCoercion = {
				originalFormat: this.type,
				coercedFormat: newType,
				timestamp: new Date(),
				changedBy,
				userSelected: changedBy === 'user' // Set based on who changed it
			};
			this.type = newType;
			this.isFormatted = false;
			this.currentFormat = newType;
		}
	}

	// Add a method to check if type was coerced
	get wasFormatCoerced(): boolean {
		return (
			!!this.selectFormatCoercion &&
			this.selectFormatCoercion.originalFormat !== this.selectFormatCoercion.coercedFormat
		);
	}
}

interface selectFormatCoercion {
	originalFormat: ColumnFormat;
	coercedFormat: ColumnFormat;
	timestamp: Date;
	changedBy: 'auto' | 'user';
	userSelected: boolean; // Add this to track manual selections
}
/**
 * String column implementation
 *
 * [NEW] Core class of the ColumnRep architecture
 */
