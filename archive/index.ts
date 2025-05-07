import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

// No encodeURI, no manual SSL config
const client = postgres(env.DATABASE_URL, {
	prepare: false,
	ssl: {
		rejectUnauthorized: false
	}
});

export const db = drizzle(client, { schema });
