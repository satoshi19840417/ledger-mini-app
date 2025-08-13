import { useEffect } from 'react';
import { supabase } from './lib/supabaseClient.js';

export default function SupabaseTest() {
  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase
        .from('your_table')
        .select('*')
        .limit(1);
      if (error) {
        console.error('Supabase error:', error);
      } else {
        console.log('Supabase data:', data);
      }
    };
    testConnection();
  }, []);

  return null;
}
