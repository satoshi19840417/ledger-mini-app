import { createClient } from '@supabase/supabase-js';

/**
 * Initialize a Supabase client using environment variables.
 * Returns null when configuration is missing so callers can branch.
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
function createSupabaseClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  console.log('Supabase Configuration:', {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'Not set',
    key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not set',
    env: import.meta.env.MODE
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables are missing');
    return null;
  }

  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
    console.log('Supabase client initialized successfully');
    return client;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

const supabase = createSupabaseClient();

export { supabase };

