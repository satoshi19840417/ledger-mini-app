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
        const updatedAt = tx.updated_at || tx.updatedAt || null;
        const excludeFromTotals =
          tx.excludeFromTotals ?? tx.exclude_from_totals ?? false;
        const isCardPayment =
          tx.isCardPayment ?? tx.is_card_payment ?? tx.category === 'カード支払い';

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
          updated_at: updatedAt,
          exclude_from_totals: excludeFromTotals, // boolean型（集計対象外フラグ）
          is_card_payment: isCardPayment
        };
      });

      console.log('Original transactions:', transactions);
      console.log('Mapped transactions:', mappedTransactions);
      console.log('Sample transaction:', mappedTransactions[0]);

      const ids = mappedTransactions.map(tx => tx.id);
      const { data: existing, error: fetchError } = await supabase
        .from('transactions')
        .select('id, hash, updated_at')
        .eq('user_id', userId)
        .in('id', ids);

      if (fetchError) throw fetchError;

      const existingMap = new Map((existing || []).map(tx => [tx.id, tx]));
      const inserts = [];
      const updates = [];

      for (const tx of mappedTransactions) {
        const exists = existingMap.get(tx.id);
        if (!exists) {
          inserts.push({ ...tx, updated_at: new Date().toISOString() });
          continue;
        }

        if (exists.hash === tx.hash) {
          continue; // no changes
        }

        if (
          tx.updated_at &&
          exists.updated_at &&
          new Date(tx.updated_at) < new Date(exists.updated_at)
        ) {
          const overwrite = window.confirm(
            '取引が他の端末で更新されています。上書きしますか？'
          );
          if (!overwrite) continue;
        }

        updates.push({ ...tx, updated_at: new Date().toISOString() });
      }

      const BATCH_SIZE = 50;
      let allData = [];
      let hasError = false;

      // 新規レコードを挿入
      for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
        const batch = inserts.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('transactions')
          .insert(batch)
          .select();
        if (error) {
          console.error(`Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
          hasError = true;
          toast.error(`取引の同期に失敗しました: ${error.message}`);
        } else if (data) {
          allData = allData.concat(data);
        }
      }

      // 既存レコードを更新
      for (const tx of updates) {
        const { data, error } = await supabase
          .from('transactions')
          .update(tx)
          .eq('id', tx.id)
          .eq('user_id', userId)
          .select();
        if (error) {
          console.error(`Error updating transaction ${tx.id}:`, error);
          hasError = true;
          toast.error(`取引の同期に失敗しました: ${error.message}`);
        } else if (data) {
          allData = allData.concat(data);
        }
      }

      if (hasError) {
        return { success: false, error: 'Some transactions failed to sync' };
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
      // 既存のルールを事前に取得
      const rulesWithId = rules.filter(r => r.id);
      let existingMap = {};
      if (rulesWithId.length > 0) {
        const { data: existing, error: fetchError } = await supabase
          .from('rules')
          .select('*')
          .eq('user_id', userId)
          .in('id', rulesWithId.map(r => r.id));

        if (fetchError) throw fetchError;
        existingMap = Object.fromEntries(existing.map(r => [r.id, r]));
      }

      const insertRules = [];
      const updateTargets = [];
      for (const rule of rules) {
        const existing = rule.id ? existingMap[rule.id] : undefined;
        if (existing) {
          // 差分を取得
          const fields = ['pattern', 'regex', 'keyword', 'category', 'target', 'mode', 'kind', 'flags'];
          const diff = {};
          for (const f of fields) {
            if (rule[f] !== undefined && rule[f] !== existing[f]) {
              diff[f] = rule[f];
            }
          }
          if (Object.keys(diff).length > 0) {
            updateTargets.push({ id: rule.id, prevUpdatedAt: rule.updated_at || existing.updated_at, diff });
          }
        } else {
          insertRules.push({
            ...rule,
            user_id: userId,
            id: rule.id || crypto.randomUUID(),
          });
        }
      }

      let inserted = [];
      if (insertRules.length > 0) {
        const { data: insertData, error: insertError } = await supabase
          .from('rules')
          .insert(insertRules, { ignoreDuplicates: true })
          .select();
        if (insertError) throw insertError;
        inserted = insertData || [];
      }

      let updated = [];
      for (const target of updateTargets) {
        const { id, prevUpdatedAt, diff } = target;
        const { data: updData, error: updError } = await supabase
          .from('rules')
          .update(diff)
          .eq('user_id', userId)
          .eq('id', id)
          .eq('updated_at', prevUpdatedAt)
          .select();
        if (updError) throw updError;
        if (!updData || updData.length === 0) {
          throw new Error('Conflict: rule was updated elsewhere');
        }
        updated = updated.concat(updData);
      }

      return { success: true, data: [...inserted, ...updated] };
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
      // 既存の設定を取得
      const { data: existing, error: selectError } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error loading preferences:', selectError);
        toast.error('設定の取得に失敗しました。再試行してください。');
        return { success: false, error: selectError };
      }

      // 取得できない場合は新規挿入
      if (!existing) {
        const { data, error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            preferences,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting preferences:', insertError);
          toast.error(`設定の保存に失敗しました: ${insertError.message}。再試行してください。`);
          return { success: false, error: insertError };
        }

        return { success: true, data };
      }

      // 既存設定と新しい設定をマージ
      const mergedPreferences = {
        ...existing.preferences,
        ...preferences,
      };

      // 差分がなければ更新不要
      if (
        JSON.stringify(existing.preferences) ===
        JSON.stringify(mergedPreferences)
      ) {
        return { success: true, data: existing };
      }

      const { data, error: updateError } = await supabase
        .from('user_preferences')
        .update({
          preferences: mergedPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating preferences:', updateError);
        toast.error(`設定の保存に失敗しました: ${updateError.message}。再試行してください。`);
        return { success: false, error: updateError };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('設定の保存に失敗しました。再試行してください。');
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
        const now = new Date().toISOString();
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: userId, display_name: null, version: 1, updated_at: now })
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

  async updateProfile(userId, updates, current = {}) {
    if (!supabase) {
      return { success: false, error: 'Supabase not initialized' };
    }

    try {
      // まずプロフィールが存在するか確認
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('version, updated_at')
        .eq('id', userId)
        .single();

      let data;
      let error;
      const now = new Date().toISOString();

      if (!existingProfile) {
        // プロフィールが存在しない場合は作成
        ({ data, error } = await supabase
          .from('profiles')
          .insert({ id: userId, ...updates, version: 1, updated_at: now })
          .select()
          .single());
      } else {
        // プロフィールが存在する場合は更新
        const currentVersion =
          current.version ?? existingProfile.version ?? 0;
        const currentUpdatedAt =
          current.updated_at ?? existingProfile.updated_at;

        ({ data, error } = await supabase
          .from('profiles')
          .update({ ...updates, version: currentVersion + 1, updated_at: now })
          .eq('id', userId)
          .eq('version', currentVersion)
          .eq('updated_at', currentUpdatedAt)
          .select()
          .single());

        if (error && error.code === 'PGRST116') {
          // バージョン不一致（楽観的ロック失敗）
          const { data: latest } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          return { success: false, conflict: true, data: latest };
        }
      }

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error };
    }
  },
};