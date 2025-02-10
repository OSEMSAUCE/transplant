import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Supabase client instance
 * Uses environment variables for configuration
 * Make sure .env file contains:
 * - PUBLIC_SUPABASE_URL
 * - PUBLIC_SUPABASE_ANON_KEY
 */
export const supabase = createClient(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
);
