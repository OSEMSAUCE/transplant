/**
 * State Types
 * Defines the state interfaces for different stages of the data pipeline
 */

// Common types used across states
export type TableName = 'Land' | 'Crop' | 'Planted';

export interface ColumnAnalysis {
    name: string;
    suggestedType: 'string' | 'number' | 'date' | 'gps' | 'email' | 'url' | 'boolean';
    currentType: string;
    confidence: number;
    sampleValues: string[];
    invalidValues: string[];
    totalRows: number;
    validRows: number;
}

// 1. Initial CSV Upload - raw data
export interface RawCsvState {
    fileName: string;
    totalRows: number;
    csvColumns: ColumnAnalysis[];
    csvStatus: 'csvanalyzing' | 'csvtransformed' | 'csverror';
}

// 2. TransForm app - where data transformation happens
export interface TransFormState {
    transformedColumns: ColumnAnalysis[];
    transformations: {
        originalColumn: string;
        transformedColumn: string;
        transformType: 'convert' | 'clean' | 'rename';
    }[];
    transformStatus: 'untransformed' | 'transforming' | 'transformed';
}

// 3. TransPlant app - where mapping to DB happens
export interface MapState {
    mapColumns: {
        preMapColumnName: string;  // Column name before mapping
        targetTable: TableName;
        targetField: string;
    }[];
    mapStatus: 'unmapped' | 'partially_mapped' | 'fully_mapped';
}

// 4. Waiting Room - pending admin approval
export interface WaitingResult {
    waitingValid: boolean;
    waitingErrors: string[];
}

export interface WaitingLandRow {
    land_name: string;
    hectares?: number;
    land_holder?: string;
    gps_lat?: number;
    gps_lon?: number;
}

export interface WaitingCropRow {
    crop_name: string;
    species_id?: string;
    crop_stock?: string;
    seed_info?: string;
}

export interface WaitingPlantedRow {
    land_id: string;
    crop_id: string;
    planted: number;
    planting_date?: Date;
}

export interface WaitingRoomState {
    waitingRows: {
        Land: WaitingLandRow[];
        Crop: WaitingCropRow[];
        Planted: WaitingPlantedRow[];
    };
    waitingStatus: {
        Land: WaitingResult;
        Crop: WaitingResult;
        Planted: WaitingResult;
    };
}

// 5. Final Database State - approved and ready
export interface DbLandRow extends WaitingLandRow {
    land_id: string;
    polygon_id?: string;
    preparation_id?: number;
    project_id?: string;
}

export interface DbCropRow extends WaitingCropRow {
    crop_id: string;
    organization_id?: string;
    project_id?: string;
}

export interface DbPlantedRow extends WaitingPlantedRow {
    id: string;
}

export interface DbState {
    dbTables: {
        Land: DbLandRow[];
        Crop: DbCropRow[];
        Planted: DbPlantedRow[];
    };
    dbStatus: 'dbpending' | 'dbapproved' | 'dbrejected';
}
