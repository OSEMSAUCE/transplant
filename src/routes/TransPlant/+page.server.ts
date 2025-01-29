import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { land, crop } from '$lib/db/schema';

export const load: PageServerLoad = async () => {
  try {
    // Get lands
    const lands = await db
      .select({
        name: land.land_name,
        hectares: land.hectares,
        preparation_id: land.preparation_id,
        gps_lat: land.gps_lat,
        gps_lon: land.gps_lon,
        notes: land.notes,
      })
      .from(land)
      .where(land.deleted.eq(false));

    // Get crops
    const crops = await db
      .select({
        name: crop.crop_name,
        species_id: crop.species_id,
        seedlot: crop.seedlot,
        stock: crop.crop_stock,
      })
      .from(crop)
      .where(crop.deleted.eq(false));

    return { lands, crops };
  } catch (error) {
    console.error('Database error:', error);
    return {
      error: 'Failed to load data',
    };
  }
};
