import { useMemo, useState } from 'react';
import OthersTable from '../OthersTable.jsx';
import { useStore } from '../state/StoreContextWithDB.jsx';

export default function Others({ yenUnit }) {
  const { state, dispatch } = useStore();
  const [selectedKind, setSelectedKind] = useState('expense');
  const rows = useMemo(() => {
    const map = {};
    state.transactions
      .filter((tx) => tx.category === 'その他' && tx.kind === selectedKind)
      .forEach(tx => {
        if (!tx.memo) return;
        map[tx.memo] = (map[tx.memo] || 0) + Math.abs(tx.amount);
      });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [state.transactions, selectedKind]);

  const addRule = newRule => {
    dispatch({ type: 'setRules', payload: [...state.rules, newRule] });
    dispatch({ type: 'applyRules' });
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <section>
      <h2>その他の内訳</h2>
      <div className="card">
        <div style={{ marginBottom: 8 }}>
          <select value={selectedKind} onChange={e => setSelectedKind(e.target.value)}>
            <option value="expense">支出</option>
            <option value="income">収入</option>
          </select>
        </div>
        <OthersTable
          rows={rows}
          addRule={addRule}
          isMobile={isMobile}
          kind={selectedKind}
          yenUnit={yenUnit}
        />
      </div>
    </section>
  );
}
