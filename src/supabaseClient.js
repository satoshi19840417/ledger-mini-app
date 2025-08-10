import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,       // ← 変数名
  import.meta.env.VITE_SUPABASE_ANON_KEY   // ← 変数名
);
