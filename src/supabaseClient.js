import { createClient } from '@supabase/supabase-js';

// 環境変数を取得する。
// Node.js でのテスト実行時は process.env を、Vite 環境では import.meta.env を利用する。
const env = {
  ...(typeof process !== 'undefined' ? process.env : {}),
  ...(import.meta.env || {}),
};

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  const message = `Missing environment variable(s): ${missing.join(', ')}`;
  console.error(message);
  throw new Error(message);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
