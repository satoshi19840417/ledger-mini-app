import { createClient } from '@supabase/supabase-js';

/**
 * Shared Supabase client instance.
 * Configured using environment variables.
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
