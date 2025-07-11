import { createClient } from '@supabase/supabase-js';

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_K } from '$env/static/public';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_K);
