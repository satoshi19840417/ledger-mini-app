import { supabase } from '../lib/supabaseClient.js';

export const dbService = {
  async syncTransactions(userId, transactions) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      // 空の配列の場合は成功として返す
      if (!transactions || transactions.length === 0) {
        return { success: true, data: [] };
      }

      // 全てのフィールドを確実にマッピング（データベーススキーマに合わせる）
      const mappedTransactions = transactions.map(tx => {
        // 金額を数値に変換
        let amount = tx.amount;
        if (typeof amount === 'string') {
          amount = parseFloat(amount.replace(/,/g, ''));
        }
        
        return {
          id: tx.id || tx.ID || crypto.randomUUID(),  // CSVのIDフィールドも考慮
          user_id: userId,
          date: tx.date || tx.日付 || new Date().toISOString().split('T')[0],
          amount: amount !== undefined && !isNaN(amount) ? amount : 0,
          category: tx.category || tx.カテゴリ || null,
          description: tx.description || tx.説明 || null,
          detail: tx.detail || tx.詳細 || null,
          memo: tx.memo || tx.メモ || null,
          kind: tx.kind || tx.種別 || (amount < 0 ? 'expense' : 'income'),
          created_at: tx.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      console.log('Original transactions:', transactions);
      console.log('Mapped transactions:', mappedTransactions);

      // 複合主キー(id, user_id)に対してupsert
      const { data, error } = await supabase
        .from('transactions')
        .upsert(mappedTransactions, {
          onConflict: 'id,user_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
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
      // 空の配列の場合は成功として返す
      if (!rules || rules.length === 0) {
        return { success: true, data: [] };
      }

      const { data, error } = await supabase
        .from('rules')
        .upsert(
          rules.map(rule => ({
            ...rule,
            user_id: userId,
            id: rule.id || crypto.randomUUID(),
            created_at: rule.created_at || new Date().toISOString(),
          }))
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
      // まずプロフィールが存在するか確認
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      let data;
      let error;
      
      if (!existingProfile) {
        // プロフィールが存在しない場合は作成
        ({ data, error } = await supabase
          .from('profiles')
          .insert({ id: userId, ...updates })
          .select()
          .single());
      } else {
        // プロフィールが存在する場合は更新
        ({ data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .single());
      }
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error };
    }
  },
};