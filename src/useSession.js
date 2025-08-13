import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!supabase) {
      // No supabase client, running in local mode
      setLoading(false);
      return;
    }
    
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      setSession(session);
      
      // Handle OAuth callback
      if (event === 'SIGNED_IN' && session) {
        // Remove any URL fragments from OAuth callback
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  return { session, loading };
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
