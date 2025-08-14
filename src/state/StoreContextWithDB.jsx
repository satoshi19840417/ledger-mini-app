import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { dbService } from '../services/database';
import { useSession } from '../useSession';

const initialState = {
  transactions: [],
  rules: [],
  lastImportAt: null,
  syncStatus: 'idle',
  lastSyncAt: null,
  profile: null,
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
      return { ...state, transactions, rules, lastImportAt };
    }
    
    case 'loadFromDatabase': {
      const { transactions = [], rules = [], profile = null } = action.payload;
      return {
        ...state,
        transactions: transactions.map(tx => ({
          ...tx,
          kind: tx.kind || (tx.amount < 0 ? 'expense' : 'income'),
        })),
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
      const transactions = applyRulesToTransactions(state.transactions, rules);
      const updatedState = { ...state, transactions, rules, syncStatus: 'pending' };
      localStorage.setItem('lm_rules_v1', JSON.stringify(updatedState.rules));
      localStorage.setItem(
        'lm_tx_v1',
        JSON.stringify({
          transactions: updatedState.transactions,
          lastImportAt: state.lastImportAt,
        })
      );
      return updatedState;
    }
    
    case 'applyRules': {
      const transactions = applyRulesToTransactions(state.transactions, state.rules);
      localStorage.setItem(
        'lm_tx_v1',
        JSON.stringify({ transactions, lastImportAt: state.lastImportAt })
      );
      return { ...state, transactions, syncStatus: 'pending' };
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
      return initialState;
    }
    
    default:
      return state;
  }
}

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const session = useSession();

  const syncWithDatabase = useCallback(async () => {
    if (!session?.user?.id) return;
    
    dispatch({ type: 'setSyncStatus', payload: 'syncing' });
    
    try {
      const [txResult, rulesResult] = await Promise.all([
        dbService.syncTransactions(session.user.id, state.transactions),
        dbService.syncRules(session.user.id, state.rules),
      ]);
      
      if (txResult.success && rulesResult.success) {
        dispatch({ type: 'syncComplete' });
      } else {
        dispatch({ type: 'setSyncStatus', payload: 'error' });
      }
    } catch (error) {
      console.error('Sync error:', error);
      dispatch({ type: 'setSyncStatus', payload: 'error' });
    }
  }, [session, state.transactions, state.rules]);

  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id) return;
    
    dispatch({ type: 'setSyncStatus', payload: 'loading' });
    
    try {
      const [txResult, rulesResult, profileResult] = await Promise.all([
        dbService.loadTransactions(session.user.id),
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
    if (session?.user?.id && state.syncStatus === 'pending') {
      const timer = setTimeout(() => {
        syncWithDatabase();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [session, state.syncStatus, syncWithDatabase]);

  return (
    <StoreContext.Provider 
      value={{ 
        state, 
        dispatch, 
        syncWithDatabase, 
        loadFromDatabase 
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}