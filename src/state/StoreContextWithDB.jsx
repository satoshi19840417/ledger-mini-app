import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { dbService } from '../services/database';
import { useSession } from '../useSession';
import { DEFAULT_CATEGORIES } from '../defaultCategories';
import { saveBackup, loadBackup } from '../services/localBackup';
import { toast } from 'react-hot-toast';

const initialState = {
  transactions: [],
  rules: [],
  lastImportAt: null,
  syncStatus: 'idle',
  lastSyncAt: null,
  profile: null,
  categories: DEFAULT_CATEGORIES,
  modifiedTransactionIds: new Set(), // 変更されたトランザクションIDを追跡
  pendingUpdates: new Map(), // 未同期の更新データを保持 (ID -> transaction)
};

function applyRulesToTransactions(transactions, rules) {
  return transactions.map(tx => {
    const matched = rules.find(rule => {
      try {
        const pattern = rule.pattern || rule.regex || rule.keyword;
        if (!pattern) return false;
        const txKind = tx.kind || (tx.amount < 0 ? 'expense' : 'income');
        const ruleKind = rule.kind || 'both';
        if (ruleKind !== 'both' && ruleKind !== txKind) return false;
        const target = rule.target
          ? tx[rule.target] || ''
          : tx.description || tx.detail || tx.memo || '';
        const mode = rule.mode || (rule.regex ? 'regex' : 'contains');
        if (mode === 'regex') {
          const reg = rule.regex
            ? new RegExp(rule.regex, rule.flags || 'i')
            : new RegExp(pattern, rule.flags || 'i');
          return reg.test(target);
        }
        return target.toLowerCase().includes(pattern.toLowerCase());
      } catch {
        return false;
      }
    });
    return matched ? { ...tx, category: matched.category } : tx;
  });
}

function reducer(state, action) {
  switch (action.type) {
    case 'loadFromStorage':
    case 'loadFromBackup': {
      let transactions = [];
      let lastImportAt = null;
      let categories = DEFAULT_CATEGORIES;
      const txRaw = localStorage.getItem('lm_tx_v1');
      if (txRaw) {
        try {
          const parsed = JSON.parse(txRaw);
          if (Array.isArray(parsed)) {
            transactions = parsed;
          } else {
            transactions = parsed.transactions || [];
            lastImportAt = parsed.lastImportAt || null;
          }
          transactions = transactions.map(tx => ({
            ...tx,
            id: tx.id || crypto.randomUUID(),
            kind: tx.kind || (tx.amount < 0 ? 'expense' : 'income'),
            isCardPayment:
              tx.isCardPayment || tx.is_card_payment || tx.category === 'カード支払い',
          }));
        } catch {
          // ignore
        }
      }
      let rules = [];
      const ruleRaw = localStorage.getItem('lm_rules_v1');
      if (ruleRaw) {
        try {
          rules = JSON.parse(ruleRaw) || [];
          rules = rules.map(rule => ({
            ...rule,
            id: rule.id || crypto.randomUUID(),
          }));
        } catch {
          // ignore
        }
      }
      const catRaw = localStorage.getItem('lm_categories_v1');
      if (catRaw) {
        try {
          const parsed = JSON.parse(catRaw);
          if (Array.isArray(parsed)) categories = parsed;
        } catch {
          // ignore
        }
      } else {
        localStorage.setItem('lm_categories_v1', JSON.stringify(categories));
      }
      const newState = { 
        ...state, 
        transactions, 
        rules, 
        categories, 
        lastImportAt,
        modifiedTransactionIds: new Set() // 初期化時はクリア
      };
      if (action.type === 'loadFromBackup') {
        newState.syncStatus = 'offline';
      }
      return newState;
    }
    
    case 'loadBackup': {
      const { transactions = [], rules = [], categories = DEFAULT_CATEGORIES } = action.payload || {};
      return { ...state, transactions, rules, categories };
    }

    case 'loadFromDatabase': {
      const { transactions = [], rules, profile = null } = action.payload;
      const normalizedTransactions = transactions.map(tx => ({
        ...tx,
        date: tx.date || tx.occurred_on,  // occurred_onフィールドからdateを復元
        kind: tx.kind || (tx.amount < 0 ? 'expense' : 'income'),
        isCardPayment:
          tx.isCardPayment || tx.is_card_payment || tx.category === 'カード支払い',
      }));
      if (rules !== undefined) {
        localStorage.setItem('lm_rules_v1', JSON.stringify(rules));
      }
      localStorage.setItem(
        'lm_tx_v1',
        JSON.stringify({
          transactions: normalizedTransactions,
          lastImportAt: state.lastImportAt,
        })
      );
      
      // ⚠️ loadFromDatabaseは初回読み込み時のみ使用すべき
      // 同期後は使用しない（ローカルの変更が失われるため）
      console.warn('⚠️ loadFromDatabase called - this will overwrite local changes!');
      
      return {
        ...state,
        transactions: normalizedTransactions,
        rules: rules !== undefined ? rules : state.rules,
        profile,
        syncStatus: 'synced',
        lastSyncAt: new Date().toISOString(),
        modifiedTransactionIds: new Set() // データベースから読み込んだ後はクリア
      };
    }
    
    case 'updateTransaction': {
      // 単一のトランザクションを更新
      console.log('🔥 updateTransaction action called for ID:', action.payload.id);
      const updatedTx = action.payload;
      
      // ハッシュ値を再生成（カテゴリ変更を検出するため）
      const generateHash = (tx) => {
        const dateValue = tx.date || '';
        const amount = tx.amount || 0;
        const categoryText = tx.category || '';
        const descText = tx.description || '';
        const detailText = tx.detail || '';
        const memoText = tx.memo || '';
        const excludeText = (tx.excludeFromTotals ?? tx.exclude_from_totals ?? false).toString();
        // user_idはサーバー側で追加されるので、ここでは含めない
        return `${dateValue}_${amount}_${categoryText}_${descText}_${detailText}_${memoText}_${excludeText}_${tx.id}`;
      };
      
      const updatedWithHash = {
        ...updatedTx,
        hash: generateHash(updatedTx),
        updated_at: new Date().toISOString()
      };
      
      console.log(`📝 Updated transaction with new hash: ${updatedWithHash.hash}`);
      
      const transactions = state.transactions.map(tx => 
        tx.id === updatedTx.id ? updatedWithHash : tx
      );
      
      // 変更されたIDを追跡
      const modifiedIds = new Set(state.modifiedTransactionIds);
      modifiedIds.add(updatedTx.id);
      console.log('📝 Modified IDs after update:', [...modifiedIds]);
      
      // pendingUpdatesマップに追加
      const pendingUpdates = new Map(state.pendingUpdates);
      pendingUpdates.set(updatedTx.id, updatedWithHash);
      console.log('📝 Pending updates count:', pendingUpdates.size);
      
      localStorage.setItem(
        'lm_tx_v1',
        JSON.stringify({ transactions, lastImportAt: state.lastImportAt })
      );
      
      return {
        ...state,
        transactions,
        syncStatus: 'pending',
        modifiedTransactionIds: modifiedIds,
        pendingUpdates
      };
    }
    
    case 'updateTransactions': {
      // 複数のトランザクションを更新（変更されたもののみ）
      console.log('🔥 updateTransactions action called for', action.payload.length, 'items');
      
      // ハッシュ値を再生成する関数
      const generateHash = (tx) => {
        const dateValue = tx.date || '';
        const amount = tx.amount || 0;
        const categoryText = tx.category || '';
        const descText = tx.description || '';
        const detailText = tx.detail || '';
        const memoText = tx.memo || '';
        const excludeText = (tx.excludeFromTotals ?? tx.exclude_from_totals ?? false).toString();
        return `${dateValue}_${amount}_${categoryText}_${descText}_${detailText}_${memoText}_${excludeText}_${tx.id}`;
      };
      
      const updatedTxMap = new Map(action.payload.map(tx => [
        tx.id, 
        { ...tx, hash: generateHash(tx), updated_at: new Date().toISOString() }
      ]));
      
      const transactions = state.transactions.map(tx => {
        if (updatedTxMap.has(tx.id)) {
          return updatedTxMap.get(tx.id);
        }
        return tx;
      });
      
      // 変更されたIDを追跡
      const modifiedIds = new Set(state.modifiedTransactionIds);
      action.payload.forEach(tx => modifiedIds.add(tx.id));
      console.log('📝 Modified IDs after batch update:', [...modifiedIds]);
      
      // pendingUpdatesマップに追加
      const pendingUpdates = new Map(state.pendingUpdates);
      updatedTxMap.forEach((tx, id) => {
        pendingUpdates.set(id, tx);
      });
      console.log('📝 Pending updates count:', pendingUpdates.size);
      
      localStorage.setItem(
        'lm_tx_v1',
        JSON.stringify({ transactions, lastImportAt: state.lastImportAt })
      );
      
      return {
        ...state,
        transactions,
        syncStatus: 'pending',
        modifiedTransactionIds: modifiedIds,
        pendingUpdates
      };
    }
    
    case 'importTransactions': {
      const append = action.append !== false;
      const importedTransactions = (action.payload || []).map(tx => ({
        ...tx,
        id: tx.id || crypto.randomUUID(),
        kind: tx.kind || (tx.amount < 0 ? 'expense' : 'income'),
      }));
      
      let finalTransactions;
      let duplicateCount = 0;
      
      if (append) {
        // 重複チェック: 日付、金額、説明が同じものを重複とみなす
        const uniqueTransactions = importedTransactions.filter(newTx => {
          const isDuplicate = state.transactions.some(existingTx => 
            existingTx.date === newTx.date &&
            existingTx.amount === newTx.amount &&
            existingTx.description === newTx.description
          );
          if (isDuplicate) duplicateCount++;
          return !isDuplicate;
        });
        finalTransactions = state.transactions.concat(uniqueTransactions);
      } else {
        finalTransactions = importedTransactions;
      }
      
      const transactions = applyRulesToTransactions(finalTransactions, state.rules);
      const lastImportAt = new Date().toISOString();
      localStorage.setItem(
        'lm_tx_v1',
        JSON.stringify({ transactions, lastImportAt })
      );
      return { 
        ...state, 
        transactions, 
        lastImportAt, 
        syncStatus: 'pending',
        lastImportInfo: {
          totalCount: importedTransactions.length,
          duplicateCount,
          importedCount: importedTransactions.length - duplicateCount
        },
        // importTransactionsの場合は全データを同期対象とする（modifiedIdsをクリア）
        modifiedTransactionIds: new Set()
      };
    }
    
    case 'setRules': {
      const rules = (action.payload || []).map(rule => ({
        ...rule,
        id: rule.id || crypto.randomUUID(),
      }));
      localStorage.setItem('lm_rules_v1', JSON.stringify(rules));
      localStorage.setItem(
        'lm_tx_v1',
        JSON.stringify({
          transactions: state.transactions,
          lastImportAt: state.lastImportAt,
        })
      );
      return { ...state, rules, syncStatus: 'pending' };
    }

    case 'addCategory': {
      const category = action.payload;
      const categories = state.categories.includes(category)
        ? state.categories
        : state.categories.concat(category);
      localStorage.setItem('lm_categories_v1', JSON.stringify(categories));
      return { ...state, categories };
    }

    case 'updateCategory': {
      const { oldCategory, newCategory } = action.payload || {};
      const categories = state.categories.map(c =>
        c === oldCategory ? newCategory : c
      );
      const transactions = state.transactions.map(tx =>
        tx.category === oldCategory ? { ...tx, category: newCategory } : tx
      );
      const rules = state.rules.map(rule =>
        rule.category === oldCategory ? { ...rule, category: newCategory } : rule
      );
      localStorage.setItem('lm_categories_v1', JSON.stringify(categories));
      localStorage.setItem(
        'lm_tx_v1',
        JSON.stringify({ transactions, lastImportAt: state.lastImportAt })
      );
      localStorage.setItem('lm_rules_v1', JSON.stringify(rules));
      return { ...state, categories, transactions, rules, syncStatus: 'pending' };
    }

    case 'deleteCategory': {
      const category = action.payload;
      const categories = state.categories.filter(c => c !== category);
      // 削除されたカテゴリを使用している取引は「その他」に変更
      const transactions = state.transactions.map(tx =>
        tx.category === category ? { ...tx, category: 'その他' } : tx
      );
      const rules = state.rules.filter(rule => rule.category !== category);
      localStorage.setItem('lm_categories_v1', JSON.stringify(categories));
      localStorage.setItem(
        'lm_tx_v1',
        JSON.stringify({ transactions, lastImportAt: state.lastImportAt })
      );
      localStorage.setItem('lm_rules_v1', JSON.stringify(rules));
      return { ...state, categories, transactions, rules, syncStatus: 'pending' };
    }
    
    case 'reorderCategories': {
      const categories = action.payload;
      localStorage.setItem('lm_categories_v1', JSON.stringify(categories));
      return { ...state, categories };
    }
    
    case 'applyRules': {
      const originalTransactions = state.transactions;
      const transactions = applyRulesToTransactions(state.transactions, state.rules);
      
      // カテゴリが変更された取引の数をカウント
      let changedCount = 0;
      transactions.forEach((tx, index) => {
        if (tx.category !== originalTransactions[index].category) {
          changedCount++;
        }
      });
      
      localStorage.setItem(
        'lm_tx_v1',
        JSON.stringify({ transactions, lastImportAt: state.lastImportAt })
      );
      return { 
        ...state, 
        transactions, 
        syncStatus: 'pending',
        lastApplyResult: {
          totalTransactions: transactions.length,
          changedTransactions: changedCount,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    case 'setSyncStatus': {
      return { ...state, syncStatus: action.payload };
    }
    
    case 'syncComplete': {
      return {
        ...state,
        syncStatus: 'synced',
        lastSyncAt: new Date().toISOString(),
        pendingUpdates: new Map(), // 同期完了時にクリア
      };
    }
    
    case 'clearModifiedIds': {
      return {
        ...state,
        modifiedTransactionIds: new Set(),
        pendingUpdates: new Map() // 変更IDクリア時に同時にクリア
      };
    }
    
    case 'setProfile': {
      return { ...state, profile: action.payload };
    }
    
    case 'clearAll': {
      localStorage.removeItem('lm_tx_v1');
      localStorage.removeItem('lm_rules_v1');
      localStorage.removeItem('lm_categories_v1');
      return initialState;
    }
    
    default:
      return state;
  }
}

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { session, loading } = useSession();
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    // ローカルストレージから自動同期の設定を読み込み（デフォルトは有効）
    const stored = localStorage.getItem('autoSyncEnabled');
    return stored !== null ? stored === 'true' : true;
  });
  
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);

  const syncWithDatabase = useCallback(
    async (overrideTransactions, onlyChanged = false) => {
      console.log('syncWithDatabase called');
      console.log('Session:', session);
      console.log('User ID:', session?.user?.id);
      console.log('Only changed:', onlyChanged);

      if (!session?.user?.id) {
        console.log('No user ID, returning false');
        return false;
      }

      let txToSync = overrideTransactions ?? state.transactions;
      
      // onlyChangedがtrueの場合、変更されたデータのみを同期
      if (onlyChanged && !overrideTransactions) {
        console.log('=== 差分同期モード ===');
        console.log('Pending updates:', state.pendingUpdates ? state.pendingUpdates.size : 0);
        console.log('Modified IDs:', state.modifiedTransactionIds ? [...state.modifiedTransactionIds] : 'none');
        console.log('Total transactions:', state.transactions.length);
        
        // pendingUpdatesマップから変更データを取得（優先）
        if (state.pendingUpdates && state.pendingUpdates.size > 0) {
          txToSync = Array.from(state.pendingUpdates.values());
          console.log(`✅ Using pending updates: ${txToSync.length} items`);
          console.log('Pending update IDs:', Array.from(state.pendingUpdates.keys()).join(', '));
        } 
        // フォールバック: modifiedTransactionIdsを使用
        else if (state.modifiedTransactionIds && state.modifiedTransactionIds.size > 0) {
          txToSync = state.transactions.filter(tx => 
            state.modifiedTransactionIds.has(tx.id)
          );
          console.log(`✅ Using modified IDs: ${txToSync.length} items`);
        } 
        // 最終フォールバック: updated_atで判定
        else {
          console.log('⚠️ No pending updates or modified IDs, falling back to updated_at check');
          const recentThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          txToSync = state.transactions.filter(tx => {
            return tx.updated_at && tx.updated_at > recentThreshold;
          });
          console.log(`Found ${txToSync.length} recently updated items`);
        }
        
        // 変更がない場合は同期をスキップ
        if (txToSync.length === 0) {
          console.log('No changes to sync');
          dispatch({ type: 'syncComplete' });
          toast.success('変更はありません');
          return true;
        }
        
        console.log(`🔄 Syncing ${txToSync.length} items out of ${state.transactions.length} total`);
      }
      console.log('Starting sync with transactions:', txToSync.length);
      dispatch({ type: 'setSyncStatus', payload: 'syncing' });

      const getErrorMessage = (error) => {
        const message = error?.message || String(error);
        if (/schema|column|relation/i.test(message)) {
          return 'データベースのスキーマが一致しません。';
        }
        if (/network|Failed to fetch|fetch failed|Supabase not initialized/i.test(message)) {
          return 'ネットワークエラーが発生しました。';
        }
        return message || '不明なエラーが発生しました。';
      };

      try {
        const [txResult, rulesResult] = await Promise.all([
          dbService.syncTransactions(session.user.id, txToSync),
          dbService.syncRules(session.user.id, state.rules),
        ]);

        if (txResult.success && rulesResult.success) {
          dispatch({ type: 'syncComplete' });
          
          // 同期成功後、変更済みIDをクリア（onlyChangedの場合のみ）
          if (onlyChanged) {
            dispatch({ type: 'clearModifiedIds' });
          }
          
          return true;
        }

        const error = txResult.error || rulesResult.error;
        const reason = getErrorMessage(error);
        toast.error((t) => (
          <div>
            <p className="font-medium">同期に失敗しました</p>
            <p className="text-sm">{reason}</p>
            <p className="text-xs mt-1">再試行するには下のボタンを押してください。</p>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                syncWithDatabase(txToSync);
              }}
              className="mt-2 text-xs text-blue-600 underline"
            >
              再試行
            </button>
          </div>
        ));
        dispatch({ type: 'setSyncStatus', payload: 'error' });
        return false;
      } catch (error) {
        console.error('Sync error:', error);
        const reason = getErrorMessage(error);
        toast.error((t) => (
          <div>
            <p className="font-medium">同期に失敗しました</p>
            <p className="text-sm">{reason}</p>
            <p className="text-xs mt-1">再試行するには下のボタンを押してください。</p>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                syncWithDatabase(txToSync);
              }}
              className="mt-2 text-xs text-blue-600 underline"
            >
              再試行
            </button>
          </div>
        ));
        dispatch({ type: 'setSyncStatus', payload: 'error' });
        return false;
      }
    },
    [session, state.transactions, state.rules]
  );

  const loadFromDatabase = useCallback(
    async ({ startDate, endDate, skipRules } = {}) => {
      if (!session?.user?.id) return;

      dispatch({ type: 'setSyncStatus', payload: 'loading' });

      try {
        const txPromise = dbService.loadTransactions(session.user.id, {
          startDate,
          endDate,
        });
        const profilePromise = dbService.loadProfile(session.user.id);

        let txResult;
        let rulesResult;
        let profileResult;

        if (skipRules) {
          [txResult, profileResult] = await Promise.all([
            txPromise,
            profilePromise,
          ]);
        } else {
          [txResult, rulesResult, profileResult] = await Promise.all([
            txPromise,
            dbService.loadRules(session.user.id),
            profilePromise,
          ]);
        }

        if (
          txResult.success &&
          profileResult.success &&
          (skipRules || rulesResult.success)
        ) {
          const payload = {
            transactions: txResult.data || [],
            profile: profileResult.data || null,
          };
          if (!skipRules) {
            payload.rules = rulesResult.data || [];
          }
          dispatch({
            type: 'loadFromDatabase',
            payload,
          });
          await saveBackup({
            transactions: payload.transactions,
            rules: payload.rules ?? state.rules,
            categories: state.categories,
          });
        } else {
          dispatch({ type: 'setSyncStatus', payload: 'error' });
        }
      } catch (error) {
        console.error('Load error:', error);
        dispatch({ type: 'setSyncStatus', payload: 'error' });
      }
    },
    [session, state.rules, state.categories]
  );

  useEffect(() => {
    (async () => {
      const backup = await loadBackup();
      if (backup.transactions.length || backup.rules.length || (backup.categories && backup.categories.length)) {
        dispatch({ type: 'loadBackup', payload: backup });
      } else {
        dispatch({ type: 'loadFromStorage' });
      }
    })();
  }, []);


  useEffect(() => {
    // Only load from database if we have a session (not in local mode) and we are online
    // AND we haven't loaded yet (to prevent reloading after sync)
    if (session?.user?.id && navigator.onLine && !hasLoadedFromDb) {
      console.log('📥 Initial load from database');
      loadFromDatabase();
      setHasLoadedFromDb(true);
    }
  }, [session, loadFromDatabase, hasLoadedFromDb]);

  useEffect(() => {
    // 自動同期が有効な場合のみ実行
    if (autoSyncEnabled && session?.user?.id && state.syncStatus === 'pending') {
      const timer = setTimeout(() => {
        // modifiedTransactionIdsがある場合は、変更されたデータのみを同期
        const hasModifiedIds = state.modifiedTransactionIds && state.modifiedTransactionIds.size > 0;
        syncWithDatabase(null, hasModifiedIds); // 変更されたデータがある場合はtrue
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoSyncEnabled, session, state.syncStatus, state.modifiedTransactionIds, syncWithDatabase]);
  
  // 自動同期の設定を変更する関数
  const toggleAutoSync = useCallback((enabled) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem('autoSyncEnabled', enabled.toString());
    console.log('Auto sync:', enabled ? 'enabled' : 'disabled');
  }, []);

  return (
    <StoreContext.Provider
      value={{
        state,
        dispatch,
        syncWithDatabase,
        loadFromDatabase,
        autoSyncEnabled,
        toggleAutoSync
      }}
    >
      {children}
      {state.syncStatus === 'error' && (
        <div className="fixed bottom-4 right-4 z-50 bg-white border rounded shadow-lg p-4">
          <p className="text-sm text-red-600 mb-2">同期に失敗しました。</p>
          <button
            onClick={() => syncWithDatabase()}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            再同期
          </button>
        </div>
      )}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}