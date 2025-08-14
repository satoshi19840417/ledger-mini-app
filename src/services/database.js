import { supabase } from '../lib/supabaseClient.js';

export const dbService = {
  // テスト用: テーブル構造を確認
  async testConnection(userId) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }
    
    try {
      // まず1件だけ取得を試みる
      const { data, error, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: false })
        .eq('user_id', userId)
        .limit(1);
      
      if (error) {
        console.error('Test query error:', error);
        return { success: false, error };
      }
      
      console.log('Test query successful:', { 
        hasData: !!data, 
        dataLength: data?.length,
        totalCount: count 
      });
      
      return { success: true, data, count };
    } catch (error) {
      console.error('Test connection error:', error);
      return { success: false, error };
    }
  },
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
        
        // 日付の検証と修正（未来の日付を2024年に修正）
        let dateValue = tx.date || tx.日付 || new Date().toISOString().split('T')[0];
        if (dateValue && dateValue.startsWith('2025-')) {
          // 2025年の日付を2024年に修正
          dateValue = dateValue.replace('2025-', '2024-');
          console.warn(`Future date detected and corrected: ${tx.date} -> ${dateValue}`);
        }
        
        return {
          id: tx.id || tx.ID || crypto.randomUUID(),  // CSVのIDフィールドも考慮
          user_id: userId,
          date: dateValue,
          amount: amount !== undefined && !isNaN(amount) ? amount : 0,
          category: tx.category || tx.カテゴリ || '',  // nullの代わりに空文字列を使用
          description: tx.description || tx.説明 || '',  // nullの代わりに空文字列を使用
          detail: tx.detail || tx.詳細 || '',  // nullの代わりに空文字列を使用
          memo: tx.memo || tx.メモ || '',  // nullの代わりに空文字列を使用
          kind: tx.kind || tx.種別 || (amount < 0 ? 'expense' : 'income')
          // created_atとupdated_atはデータベースで自動設定されるため削除
        };
      });

      console.log('Original transactions:', transactions);
      console.log('Mapped transactions:', mappedTransactions);
      console.log('Sample transaction:', mappedTransactions[0]);

      // 複合主キー(id, user_id)に対してupsert
      // 注: onConflictを指定しない場合、主キーで自動的に判定される
      const { data, error } = await supabase
        .from('transactions')
        .upsert(mappedTransactions);
      
      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          statusCode: error.statusCode
        });
        
        // 詳細なエラー情報を出力
        if (error.message?.includes('duplicate key')) {
          console.error('Duplicate key error - existing IDs might be conflicting');
          console.error('First transaction ID:', mappedTransactions[0]?.id);
        }
        
        if (error.message?.includes('null value')) {
          console.error('Null value error - required field might be missing');
          const nullFields = Object.entries(mappedTransactions[0] || {})
            .filter(([_, value]) => value === null || value === undefined)
            .map(([key]) => key);
          console.error('Null or undefined fields:', nullFields);
        }
        
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
            id: rule.id || crypto.randomUUID()
            // created_atはデータベースで自動設定されるため削除
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