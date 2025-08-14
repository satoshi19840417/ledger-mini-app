import { supabase } from '../lib/supabaseClient.js';

export const dbService = {
  async syncTransactions(userId, transactions) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .upsert(
          transactions.map(tx => ({
            ...tx,
            user_id: userId,
            id: tx.id || crypto.randomUUID(),
            created_at: tx.created_at || new Date().toISOString(),
          })),
          { onConflict: 'id,user_id' }
        );
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error syncing transactions:', error);
      return { success: false, error };
    }
  },

  async loadTransactions(userId) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error loading transactions:', error);
      return { success: false, error };
    }
  },

  async syncRules(userId, rules) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      const { data, error } = await supabase
        .from('rules')
        .upsert(
          rules.map(rule => ({
            ...rule,
            user_id: userId,
            id: rule.id || crypto.randomUUID(),
            created_at: rule.created_at || new Date().toISOString(),
          })),
          { onConflict: 'id,user_id' }
        );
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error syncing rules:', error);
      return { success: false, error };
    }
  },

  async loadRules(userId) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error loading rules:', error);
      return { success: false, error };
    }
  },

  async deleteTransaction(userId, transactionId) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId)
        .eq('id', transactionId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return { success: false, error };
    }
  },

  async deleteRule(userId, ruleId) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('user_id', userId)
        .eq('id', ruleId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting rule:', error);
      return { success: false, error };
    }
  },

  async saveUserPreferences(userId, preferences) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preferences: preferences,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving preferences:', error);
      return { success: false, error };
    }
  },

  async loadUserPreferences(userId) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data: data?.preferences || {} };
    } catch (error) {
      console.error('Error loading preferences:', error);
      return { success: false, error };
    }
  },

  async loadProfile(userId) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      
      // プロフィールが存在しない場合は作成
      if (!data) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: userId, display_name: null })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return { success: true, data: newProfile };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error loading profile:', error);
      return { success: false, error };
    }
  },

  async updateProfile(userId, updates) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error };
    }
  },
};