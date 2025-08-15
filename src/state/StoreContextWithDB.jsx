import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { dbService } from '../services/database';
import { useSession } from '../useSession';
import { DEFAULT_CATEGORIES } from '../defaultCategories';
import { toast } from 'react-hot-toast';

const initialState = {
  transactions: [],
  rules: [],
  lastImportAt: null,
  syncStatus: 'idle',
  lastSyncAt: null,
  profile: null,
  categories: DEFAULT_CATEGORIES,
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
    case 'loadFromStorage': {
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
      return { ...state, transactions, rules, categories, lastImportAt };
    }
    
    case 'loadFromDatabase': {
      const { transactions = [], rules = [], profile = null } = action.payload;
      const normalizedTransactions = transactions.map(tx => ({
        ...tx,
        date: tx.date || tx.occurred_on,  // occurred_onフィールドからdateを復元
        kind: tx.kind || (tx.amount < 0 ? 'expense' : 'income'),
        isCardPayment:
          tx.isCardPayment || tx.is_card_payment || tx.category === 'カード支払い',
      }));
      localStorage.setItem('lm_rules_v1', JSON.stringify(rules));
      localStorage.setItem(
        'lm_tx_v1',
        JSON.stringify({
          transactions: normalizedTransactions,
          lastImportAt: state.lastImportAt,
        })
      );
      return {
        ...state,
        transactions: normalizedTransactions,
        rules,
        profile,
        syncStatus: 'synced',
        lastSyncAt: new Date().toISOString(),
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
        }
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

  const syncWithDatabase = useCallback(
    async (overrideTransactions) => {
      console.log('syncWithDatabase called');
      console.log('Session:', session);
      console.log('User ID:', session?.user?.id);

      if (!session?.user?.id) {
        console.log('No user ID, returning false');
        return false;
      }

      const txToSync = overrideTransactions ?? state.transactions;
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

  const loadFromDatabase = useCallback(async ({ startDate, endDate } = {}) => {
    if (!session?.user?.id) return;

    dispatch({ type: 'setSyncStatus', payload: 'loading' });

    try {
      const [txResult, rulesResult, profileResult] = await Promise.all([
        dbService.loadTransactions(session.user.id, { startDate, endDate }),
        dbService.loadRules(session.user.id),
        dbService.loadProfile(session.user.id),
      ]);
      
      if (txResult.success && rulesResult.success && profileResult.success) {
        dispatch({
          type: 'loadFromDatabase',
          payload: {
            transactions: txResult.data || [],
            rules: rulesResult.data || [],
            profile: profileResult.data || null,
          },
        });
      } else {
        dispatch({ type: 'setSyncStatus', payload: 'error' });
      }
    } catch (error) {
      console.error('Load error:', error);
      dispatch({ type: 'setSyncStatus', payload: 'error' });
    }
  }, [session]);

  useEffect(() => {
    dispatch({ type: 'loadFromStorage' });
  }, []);

  useEffect(() => {
    // Only load from database if we have a session (not in local mode)
    if (session?.user?.id) {
      loadFromDatabase();
    }
  }, [session, loadFromDatabase]);

  useEffect(() => {
    // 自動同期が有効な場合のみ実行
    if (autoSyncEnabled && session?.user?.id && state.syncStatus === 'pending') {
      const timer = setTimeout(() => {
        syncWithDatabase();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoSyncEnabled, session, state.syncStatus, syncWithDatabase]);
  
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