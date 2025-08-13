import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

export function useSession() {
  const [session, setSession] = useState(null);
  
  useEffect(() => {
    if (!supabase) {
      // No supabase client, running in local mode
      return;
    }
    
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  
  return session;
}

export async function logout() {
  if (!supabase) {
    console.warn('No supabase client, cannot log out');
    return false;
  }
  
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    return false;
  }
  return true;
}
