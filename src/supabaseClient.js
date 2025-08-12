import { createClient } from '@supabase/supabase-js';
import React from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase;
let supabaseError;

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  supabaseError = error;
  console.error(
    'Failed to initialize Supabase client. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY:',
    error,
  );
}

export { supabase, supabaseError };

export function SupabaseConfigError() {
  return React.createElement(
    'div',
    { className: 'p-4 text-center text-red-600' },
    'Supabase configuration invalid',
  );
}
