import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { land, crop } from '$lib/db/schema';

export const load: PageServerLoad = async () => {
  try {
    // Get lands
    const lands = await db
      .select({
        id: land.land_id,
        name: land.land_name,
        hectares: land.hectares,
        notes: land.notes,
      })
      .from(land)
      .where(land.deleted.equals(false));

    console.log('Lands data:', lands);

    // Get crops
    const crops = await db
      .select({
        id: crop.crop_id,
        name: crop.crop_name,
        seedlot: crop.seedlot,
        stock: crop.crop_stock,
      })
      .from(crop)
      .where(crop.deleted.equals(false));

    console.log('Crops data:', crops);

    return { lands, crops };
  } catch (error) {
    console.error('Database error:', error);
    return {
      error: 'Failed to load data',
    };
  }
};
