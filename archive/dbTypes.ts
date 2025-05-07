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
	land_notes?: string;
}

export interface PolygonRow {
	polygon_id: string;
	land_id?: string;
	geojson?: unknown;
	poly_notes?: string;
}

export interface DbColumnsDef {
	created_at?: Date;
	last_edited_at?: Date;
	edited_by?: string;
	approval_status: 'pending' | 'approved' | 'rejected';
	approved_at?: Date;
	approved_by?: string;
	deleted?: boolean;
	// notes field removed from DbColumnsDef and added specifically to each table
}

export interface PreparationTypeRow extends DbColumnsDef {
	preparation_id: number;
	name: string;
	description?: string;
	notes?: string; // Keeping original notes field for preparation types
}

export interface ProjectRow extends DbColumnsDef {
	project_id: string;
	project_name: string;
	project_notes?: string;
}
