import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Configuration:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'Not set',
  key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not set',
  env: import.meta.env.MODE
});

/**
 * Shared Supabase client instance.
 * Configured using environment variables.
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
let supabase = null;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
    console.log('Supabase client initialized successfully');
  } else {
    console.warn('Supabase environment variables are missing');
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

export { supabase };
