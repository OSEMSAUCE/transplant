import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL');
}

const client = postgres(env.DATABASE_URL, {
  ssl: true,
  prepare: false,
});

export const db = drizzle(client, { schema });
