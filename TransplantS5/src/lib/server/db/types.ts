/**
 * Database Types
 * Contains TypeScript interfaces for database tables
 */

export interface LandRow {
    land_id: string;
    land_name: string;
    hectares?: number;
    land_holder?: string;
    gps_lat?: number;
    gps_lon?: number;
    polygon_id?: string;
    preparation_id?: number;
    project_id?: string;
}

export interface PolygonRow {
    polygon_id: string;
    land_id?: string;
    geojson?: unknown;
}

export interface BaseColumns {
    created_at?: Date;
    last_edited_at?: Date;
    edited_by?: string;
    approval_status: 'pending' | 'approved' | 'rejected';
    approved_at?: Date;
    approved_by?: string;
    deleted?: boolean;
    notes?: string;
}

export interface PreparationTypeRow extends BaseColumns {
    preparation_id: number;
    name: string;
    description?: string;
}

export interface ProjectRow extends BaseColumns {
    project_id: string;
    project_name: string;
}
