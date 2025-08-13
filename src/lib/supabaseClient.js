import { createClient } from '@supabase/supabase-js';

/**
 * Singleton Supabase client configured via Vite environment variables.
 * Returns null when the credentials are missing.
 *
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const supabase =
  globalThis.supabase ??
  (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    ? createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      )
    : null);

if (!globalThis.supabase) {
  globalThis.supabase = supabase;
}

