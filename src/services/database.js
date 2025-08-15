import { supabase } from '../lib/supabaseClient.js';
import { clampFutureDate } from './dateUtils.js';
import { toast } from 'react-hot-toast';

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
      // 空の配列の場合は何もせずに終了
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
        
        // 日付の検証と修正（未来の日付を当日に変更）
        let dateValue = tx.date || tx.日付 || new Date().toISOString().split('T')[0];
        const correctedDate = clampFutureDate(dateValue);
        if (correctedDate !== dateValue) {
          console.warn(`未来の日付を当日に変更: ${tx.date} -> ${correctedDate}`);
        }
        dateValue = correctedDate;
        
        // ハッシュ値を生成（重複チェック用）- より詳細な情報を含める
        const descText = tx.description || tx.説明 || '';
        const detailText = tx.detail || tx.詳細 || '';
        const memoText = tx.memo || tx.メモ || '';
        const hashString = `${userId}_${dateValue}_${amount}_${descText}_${detailText}_${memoText}_${tx.id || Math.random()}`;
        const hash = tx.hash || hashString;
        const excludeFromTotals =
          tx.excludeFromTotals ?? tx.exclude_from_totals ?? false;

        return {
          id: tx.id || crypto.randomUUID(), // 既存のIDを使用、なければ新規生成
          user_id: userId,
          date: dateValue, // DATE型
          occurred_on: dateValue, // DATE型
          amount: amount !== undefined && !isNaN(amount) ? amount : 0,
          category: tx.category || tx.カテゴリ || '', // text型
          description: tx.description || tx.説明 || '', // text型
          detail: tx.detail || tx.詳細 || '', // text型
          memo: tx.memo || tx.メモ || '', // text型
          kind: tx.kind || tx.種別 || (amount < 0 ? 'expense' : 'income'), // text型
          hash,
          exclude_from_totals: excludeFromTotals // boolean型（集計対象外フラグ）
        };
      });

      console.log('Original transactions:', transactions);
      console.log('Mapped transactions:', mappedTransactions);
      console.log('Sample transaction:', mappedTransactions[0]);

      // バッチサイズを設定（一度に送信する件数）
      const BATCH_SIZE = 50;
      let allData = [];
      let hasError = false;
      
      // トランザクションを分割して送信（同一IDは更新・新規IDは挿入）
      for (let i = 0; i < mappedTransactions.length; i += BATCH_SIZE) {
        const batch = mappedTransactions.slice(i, i + BATCH_SIZE);
        console.log(`Upserting batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(mappedTransactions.length / BATCH_SIZE)}`);

        const { data: batchData, error: batchError } = await supabase
          .from('transactions')
          .upsert(batch, { onConflict: 'id' });

        if (batchError) {
          console.error(`Error in batch ${Math.floor(i / BATCH_SIZE) + 1}:`, batchError);
          console.error('Failed batch data:', batch);
          console.error('Error details:', {
            message: batchError.message,
            details: batchError.details,
            hint: batchError.hint,
            code: batchError.code
          });
          hasError = true;
          toast.error(`取引の同期に失敗しました: ${batchError.message}`);
        } else if (batchData) {
          allData = allData.concat(batchData);
        }
      }

      if (hasError) {
        return { success: false, error: 'Some batches failed to upsert' };
      }

      return { success: true, data: allData };
    } catch (error) {
      console.error('Error syncing transactions:', error);
      toast.error('取引の同期に失敗しました');
      return { success: false, error };
    }
  },

  async loadTransactions(userId, { startDate, endDate } = {}) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }

    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query.order('date', { ascending: false });

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