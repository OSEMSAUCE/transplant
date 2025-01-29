import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

// Create database client
if (!env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL');
}

const client = postgres(env.DATABASE_URL, {
  ssl: true,
  prepare: false,
});

// Create your database interface
const db = drizzle(client, { schema });

// Helper functions for common operations
export async function getLands() {
  try {
    return await db.select().from(schema.land);
  } catch (error) {
    console.error('Error fetching lands:', error);
    throw error;
  }
}

export async function getCrops() {
  try {
    return await db.select().from(schema.crop);
  } catch (error) {
    console.error('Error fetching crops:', error);
    throw error;
  }
}

export async function getCropsByLand(landId: number) {
  try {
    return await db
      .select()
      .from(schema.crop)
      .where(sql`land_id = ${landId}`);
  } catch (error) {
    console.error('Error fetching crops by land:', error);
    throw error;
  }
}

export default db;
