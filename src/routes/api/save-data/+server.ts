import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { repository } from '$lib/db/schema';

export const POST: RequestHandler = async ({ request }) => {
  const data = await request.json();
  
  try {
    // Insert the data using Drizzle
    const result = await db.insert(repository).values(data).returning();
    return json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving data:', error);
    return json({ success: false, error: 'Failed to save data' }, { status: 500 });
  }
};
