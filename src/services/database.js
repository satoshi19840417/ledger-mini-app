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

      // 大量データの警告と分割処理
      if (transactions.length > 500) {
        const shouldContinue = window.confirm(
          `${transactions.length}件の大量データを同期しようとしています。\n` +
          `ネットワークエラーが発生する可能性があります。\n\n` +
          `推奨: データを分割して同期することをお勧めします。\n` +
          `続行しますか？`
        );
        
        if (!shouldContinue) {
          toast('同期をキャンセルしました。データを分割して再試行してください。', { icon: '📌' });
          return { success: false, error: 'User cancelled due to large dataset' };
        }
        
        // 500件ずつに分割して処理
        const chunks = [];
        for (let i = 0; i < transactions.length; i += 500) {
          chunks.push(transactions.slice(i, i + 500));
        }
        
        toast(`${chunks.length}回に分けて同期を実行します...`, { icon: '📊' });
        
        let allResults = [];
        for (let i = 0; i < chunks.length; i++) {
          toast.loading(`チャンク ${i + 1}/${chunks.length} を同期中...`, { id: 'chunk-sync' });
          
          const result = await this.syncTransactionsChunk(userId, chunks[i]);
          if (!result.success) {
            toast.error(`チャンク ${i + 1} の同期に失敗しました`, { id: 'chunk-sync' });
            return result;
          }
          
          allResults = allResults.concat(result.data || []);
          
          // チャンク間で1秒待機
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        toast.success(`${transactions.length}件のデータを正常に同期しました！`, { id: 'chunk-sync' });
        return { success: true, data: allResults };
      }

      // 500件以下の場合は通常処理
      return await this.syncTransactionsChunk(userId, transactions);
    } catch (error) {
      console.error('Error in syncTransactions wrapper:', error);
      
      // エラーログを保存
      try {
        const errorLog = {
          timestamp: new Date().toISOString(),
          error: {
            message: error.message || 'Unknown error',
            stack: error.stack,
            code: error.code,
            name: error.name
          },
          context: {
            operation: 'syncTransactions_wrapper',
            userId,
            transactionCount: transactions?.length || 0
          },
          userAgent: navigator.userAgent,
          url: window.location.href
        };
        
        const logs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
        logs.push(errorLog);
        if (logs.length > 50) {
          logs.splice(0, logs.length - 50);
        }
        localStorage.setItem('errorLogs', JSON.stringify(logs));
        console.log('[エラーログ] syncTransactions wrapperエラーを保存しました:', errorLog);
      } catch (logError) {
        console.error('Failed to save error log:', logError);
      }
      
      return { success: false, error };
    }
  },

  async syncTransactionsChunk(userId, transactions) {
    try {
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
        
        // ハッシュ値を生成（重複チェック用）- カテゴリを含むすべての重要な情報を含める
        const descText = tx.description || tx.説明 || '';
        const detailText = tx.detail || tx.詳細 || '';
        const memoText = tx.memo || tx.メモ || '';
        const categoryText = tx.category || tx.カテゴリ || '';
        const excludeText = (tx.excludeFromTotals ?? tx.exclude_from_totals ?? false).toString();
        
        // カテゴリや集計除外フラグも含めてハッシュを生成
        const hashString = `${userId}_${dateValue}_${amount}_${categoryText}_${descText}_${detailText}_${memoText}_${excludeText}_${tx.id || Math.random()}`;
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

      // デバッグログ
      console.log(`[差分同期] 処理開始: ${mappedTransactions.length}件のデータを確認`);

      const ids = mappedTransactions.map(tx => tx.id).filter(id => id); // IDがあるものだけ
      
      // 既存データの取得（IDがある場合のみ）
      let existingMap = new Map();
      if (ids.length > 0) {
        // IDを100件ずつのバッチに分割（Supabaseのin句の制限対策）
        const idBatches = [];
        for (let i = 0; i < ids.length; i += 100) {
          idBatches.push(ids.slice(i, i + 100));
        }
        
        for (const idBatch of idBatches) {
          const { data: existing, error: fetchError } = await supabase
            .from('transactions')
            .select('id, hash, updated_at, date, amount, category, description')
            .eq('user_id', userId)
            .in('id', idBatch);
          
          if (fetchError) {
            console.error('Error fetching existing transactions:', fetchError);
            throw fetchError;
          }
          
          (existing || []).forEach(tx => {
            existingMap.set(tx.id, tx);
          });
        }
      }
      
      const inserts = [];
      const updates = [];
      let skippedCount = 0;
      let conflictCount = 0;

      for (const tx of mappedTransactions) {
        const exists = tx.id ? existingMap.get(tx.id) : null;
        
        if (!exists) {
          // 新規レコード
          inserts.push({ ...tx, updated_at: new Date().toISOString() });
          continue;
        }

        // ハッシュ値による変更検出
        if (exists.hash === tx.hash) {
          skippedCount++; // 変更なしのレコードをカウント
          continue; // 変更なし → スキップ
        }
        
        // 変更を検出（デバッグ用）
        console.log(`[差分同期] 変更検出 ID: ${tx.id}`);
        console.log(`  旧hash: ${exists.hash}`);
        console.log(`  新hash: ${tx.hash}`);
        console.log(`  カテゴリ: ${exists.category} → ${tx.category}`);

        // 競合チェック（タイムスタンプがある場合）
        if (
          tx.updated_at &&
          exists.updated_at &&
          new Date(tx.updated_at) < new Date(exists.updated_at)
        ) {
          conflictCount++;
          
          // 競合の詳細を表示
          const conflictDetails = `
            ローカル: ${tx.date} - ${tx.description} (${tx.amount}円)
            サーバー: ${exists.date} - ${exists.description} (${exists.amount}円)
          `;
          
          const overwrite = window.confirm(
            `競合検出 (${conflictCount}/${mappedTransactions.length}):\n` +
            `他の端末で更新されています。\n${conflictDetails}\n\n` +
            `ローカルの内容で上書きしますか？`
          );
          
          if (!overwrite) {
            skippedCount++;
            continue;
          }
        }

        updates.push({ ...tx, updated_at: new Date().toISOString() });
      }

      // 統計情報を表示
      const summary = {
        total: mappedTransactions.length,
        newRecords: inserts.length,
        updates: updates.length,
        skipped: skippedCount,
        conflicts: conflictCount
      };
      
      console.log('[差分同期] 結果:', summary);
      
      // 変更がない場合は早期終了
      if (inserts.length === 0 && updates.length === 0) {
        console.log('[差分同期] 変更なし - 同期をスキップ');
        
        // 少数のデータの場合はメッセージを簡潔に
        if (mappedTransactions.length <= 10) {
          toast.success(`✓ ${mappedTransactions.length}件のデータは最新です`);
        } else {
          toast.success(`✓ すべてのデータは最新です（${skippedCount}件確認済み）`);
        }
        return { success: true, data: [], summary };
      }
      
      // 実際に変更があるデータのみを通知
      const changeMessage = `📊 変更を検出: 新規${inserts.length}件, 更新${updates.length}件` +
        (skippedCount > 0 ? `, 変更なし${skippedCount}件` : '');
      console.log('[差分同期]', changeMessage);
      toast(changeMessage, { icon: '📊' });

      const BATCH_SIZE = 10; // さらに小さくして安定性を最優先
      let allData = [];
      let hasError = false;
      let retryCount = 0;
      const MAX_RETRIES = 3;

      // 進捗表示
      const totalItems = inserts.length + updates.length;
      if (totalItems > 50) {
        toast.loading(`データ（${totalItems}件）を同期中...`, { id: 'sync-progress' });
      }

      // 新規レコードを挿入（リトライ機能付き）
      for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
        const batch = inserts.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(inserts.length / BATCH_SIZE);
        
        let success = false;
        retryCount = 0;
        
        while (!success && retryCount < MAX_RETRIES) {
          try {
            // 進捗更新
            if (totalItems > 50) {
              const retryText = retryCount > 0 ? ` (再試行 ${retryCount}/${MAX_RETRIES})` : '';
              toast.loading(`新規データ挿入中... (${batchNumber}/${totalBatches})${retryText}`, { id: 'sync-progress' });
            }
            
            // タイムアウト設定付きのリクエスト
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト
            
            const { data, error } = await supabase
              .from('transactions')
              .insert(batch)
              .select()
              .abortSignal(controller.signal);
            
            clearTimeout(timeoutId);
            
            if (error) {
              throw error;
            }
            
            if (data) {
              allData = allData.concat(data);
            }
            
            success = true;
            
            // レート制限対策: バッチ間に待機
            if (i + BATCH_SIZE < inserts.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (err) {
            retryCount++;
            console.error(`Batch ${batchNumber} attempt ${retryCount} failed:`, err);
            
            if (retryCount >= MAX_RETRIES) {
              hasError = true;
              
              // エラーログを保存
              try {
                const errorLog = {
                  timestamp: new Date().toISOString(),
                  error: {
                    message: err.message || 'Unknown error',
                    stack: err.stack,
                    code: err.code,
                    name: err.name
                  },
                  context: {
                    operation: 'syncTransactions_batch',
                    userId,
                    batchNumber,
                    batchSize: batch.length,
                    retryCount
                  },
                  userAgent: navigator.userAgent,
                  url: window.location.href
                };
                
                const logs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
                logs.push(errorLog);
                if (logs.length > 50) {
                  logs.splice(0, logs.length - 50);
                }
                localStorage.setItem('errorLogs', JSON.stringify(logs));
                console.log('[エラーログ] 保存しました:', errorLog);
              } catch (logError) {
                console.error('Failed to save error log:', logError);
              }
              
              // エラーメッセージの改善
              if (err.name === 'AbortError') {
                toast.error(`⏱️ タイムアウト: バッチ${batchNumber}の処理が時間切れになりました。`);
              } else if (err.message?.includes('Failed to fetch')) {
                toast.error(`🌐 ネットワークエラー: インターネット接続を確認してください。`);
              } else {
                toast.error(`❌ 同期エラー (バッチ${batchNumber}): ${err.message || 'Unknown error'}`);
              }
              
              break; // このバッチの処理を諦める
            } else {
              // リトライ前に待機
              const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000); // 指数バックオフ
              toast(`バッチ${batchNumber}の再試行まで${waitTime/1000}秒待機...`, { icon: '⏳' });
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
        
        if (hasError) break; // エラーが発生したら残りのバッチをスキップ
      }

      // 既存レコードを更新（バッチ処理）
      if (!hasError && updates.length > 0) {
        for (let i = 0; i < updates.length; i++) {
          const tx = updates[i];
          
          try {
            // 進捗更新
            if (totalItems > 100 && i % 10 === 0) {
              toast.loading(`データ更新中... (${i + 1}/${updates.length})`, { id: 'sync-progress' });
            }
            
            const { data, error } = await supabase
              .from('transactions')
              .update(tx)
              .eq('id', tx.id)
              .eq('user_id', userId)
              .select();
              
            if (error) {
              console.error(`Error updating transaction ${tx.id}:`, error);
              hasError = true;
              
              if (error.message?.includes('Failed to fetch')) {
                toast.error(`ネットワークエラー: 更新に失敗しました。`);
              } else {
                toast.error(`取引の更新に失敗しました: ${error.message}`);
              }
              break;
            } else if (data) {
              allData = allData.concat(data);
            }
            
            // レート制限対策
            if (i % 10 === 0 && i < updates.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          } catch (err) {
            console.error(`Network error updating transaction:`, err);
            hasError = true;
            toast.error(`ネットワークエラー: 更新に失敗しました。`);
            break;
          }
        }
      }

      // 完了メッセージ（実際に処理したデータのみカウント）
      const processedCount = allData.length;
      
      if (hasError) {
        toast.error(
          `⚠️ 同期は部分的に完了しました。` +
          `処理済み: ${processedCount}件、` +
          `エラー: ${totalItems - processedCount}件`, 
          { id: 'sync-progress' }
        );
        
        // エラー時もsummaryに結果を含める
        summary.processedCount = processedCount;
        summary.errorCount = totalItems - processedCount;
        
        return { success: false, error: 'Some transactions failed to sync', summary };
      } else {
        // 成功メッセージ
        if (processedCount > 0) {
          toast.success(
            `✅ 同期完了！ ` +
            `新規: ${inserts.length}件、` +
            `更新: ${updates.length}件` +
            (skippedCount > 0 ? `、変更なし: ${skippedCount}件` : ''),
            { id: 'sync-progress' }
          );
        }
        
        console.log('[差分同期] 完了:', {
          新規: inserts.length,
          更新: updates.length,
          スキップ: skippedCount,
          合計処理: processedCount
        });
      }

      return { success: true, data: allData, summary };
    } catch (error) {
      console.error('Error syncing transactions:', error);
      
      // エラー情報を保存（診断は別途実行）
      try {
        const errorLog = {
          timestamp: new Date().toISOString(),
          error: {
            message: error.message,
            stack: error.stack,
            code: error.code
          },
          context: {
            operation: 'syncTransactions',
            userId,
            transactionCount: transactions.length
          },
          userAgent: navigator.userAgent,
          url: window.location.href
        };
        
        const logs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
        logs.push(errorLog);
        if (logs.length > 50) {
          logs.splice(0, logs.length - 50);
        }
        localStorage.setItem('errorLogs', JSON.stringify(logs));
      } catch (e) {
        console.error('Failed to save error log:', e);
      }
      
      // エラーメッセージの改善
      let errorMessage = '取引の同期に失敗しました';
      const errorStr = error.message?.toLowerCase() || '';
      
      if (errorStr.includes('auth') || error.code === '401') {
        errorMessage = '認証エラー: 再度ログインしてください';
      } else if (errorStr.includes('network')) {
        errorMessage = 'ネットワークエラー: 接続を確認してください';
      } else if (errorStr.includes('duplicate')) {
        errorMessage = '重複エラー: 同じデータが既に存在します';
      } else if (errorStr.includes('validation')) {
        errorMessage = 'データ形式エラー: 入力内容を確認してください';
      }
      
      toast.error(errorMessage);
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