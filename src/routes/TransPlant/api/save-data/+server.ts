import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { repository } from '$lib/db/schema';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Validate the data
    if (!Array.isArray(data)) {
      throw error(400, { message: 'Expected array of data' });
    }
    
    // Insert the data using Drizzle
    const result = await db.insert(repository).values(data).returning();
    return json({ success: true, data: result });
  } catch (e) {
    console.error('Error saving data:', e);
    if (e.status === 400) {
      throw e;
    }
    throw error(500, { message: 'Failed to save data' });
  }
};
