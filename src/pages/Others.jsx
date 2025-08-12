import { useMemo } from 'react';
import OthersTable from '../OthersTable.jsx';
import { useStore } from '../state/StoreContext.jsx';

export default function Others() {
  const { state, dispatch } = useStore();
  const rows = useMemo(() => {
    const map = {};
    state.transactions
      .filter((tx) => tx.category === 'その他' && tx.kind === 'expense')
      .forEach(tx => {
        if (!tx.memo) return;
        map[tx.memo] = (map[tx.memo] || 0) + Math.abs(tx.amount);
      });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [state.transactions]);

  const addRule = newRule => {
    dispatch({ type: 'setRules', payload: [...state.rules, newRule] });
    dispatch({ type: 'applyRules' });
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <section>
      <h2>その他の内訳</h2>
      <div className="card">
        <OthersTable rows={rows} addRule={addRule} isMobile={isMobile} />
      </div>
    </section>
  );
}
