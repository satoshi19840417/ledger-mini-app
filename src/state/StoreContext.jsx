import { createContext, useContext, useReducer, useEffect } from 'react';
/** @typedef {import('../types').Transaction} Transaction */
/** @typedef {import('../types').Rule} Rule */
/** @typedef {import('../types').StoreState} StoreState */
/** @typedef {import('../types').StoreAction} StoreAction */

/** @type {StoreState} */
const initialState = {
  transactions: [],
  rules: [],
  lastImportAt: null,
};

/**
 * @param {Transaction[]} transactions
 * @param {Rule[]} rules
 * @returns {Transaction[]}
 */
function applyRulesToTransactions(transactions, rules) {
  return transactions.map(tx => {
    const matched = rules.find(rule => {
      try {
        const pattern = rule.pattern || rule.regex || rule.keyword;
        if (!pattern) return false;
        const txKind = tx.amount < 0 ? 'expense' : 'income';
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

/**
 * @param {StoreState} state
 * @param {StoreAction} action
 * @returns {StoreState}
 */
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
        } catch {
          // ignore
        }
      }
      let rules = [];
      const ruleRaw = localStorage.getItem('lm_rules_v1');
      if (ruleRaw) {
        try {
          rules = JSON.parse(ruleRaw) || [];
        } catch {
          // ignore
        }
      }
      return { transactions, rules, lastImportAt };
    }
    case 'importTransactions': {
      const append = action.append !== false;
      const newTx = append
        ? state.transactions.concat(action.payload || [])
        : action.payload || [];
      const transactions = applyRulesToTransactions(newTx, state.rules);
      const lastImportAt = new Date().toISOString();
      localStorage.setItem(
        'lm_tx_v1',
        JSON.stringify({ transactions, lastImportAt })
      );
      return { ...state, transactions, lastImportAt };
    }
    case 'setRules': {
      const rules = action.payload || [];
      const transactions = applyRulesToTransactions(state.transactions, rules);
      const updatedState = { ...state, transactions, rules };
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
      return { ...state, transactions };
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

/**
 * @type {import('react').Context<{
 *   state: StoreState;
 *   dispatch: import('react').Dispatch<StoreAction>;
 * } | undefined>}
 */
const StoreContext = createContext();

/**
 * @param {{children: import('react').ReactNode}} props
 */
export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'loadFromStorage' });
  }, []);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

/**
 * @returns {{state: StoreState, dispatch: import('react').Dispatch<StoreAction>}}
 */
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

