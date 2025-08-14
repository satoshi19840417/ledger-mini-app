import { useMemo, useState, useEffect } from 'react';
import OthersTable from '../OthersTable.jsx';
import { useStore } from '../state/StoreContextWithDB.jsx';

export default function Others({ yenUnit }) {
  const { state, dispatch } = useStore();
  const [selectedKind, setSelectedKind] = useState('expense');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const rows = useMemo(() => {
    const map = {};
    const filteredTxs = state.transactions
      .filter((tx) => tx.category === 'その他' && tx.kind === selectedKind);
    
    console.log('Others page - filtered transactions:', filteredTxs.length);
    console.log('Selected kind:', selectedKind);
    
    filteredTxs.forEach(tx => {
      if (!tx.memo) return;
      map[tx.memo] = (map[tx.memo] || 0) + Math.abs(tx.amount);
    });
    
    const result = Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    
    console.log('Others page - rows:', result);
    return result;
  }, [state.transactions, selectedKind]);

  const addRule = newRule => {
    console.log('addRule called with:', newRule);
    console.log('Current rules:', state.rules);
    // ルールを追加・変更した後はルール画面の「データ反映」ボタンを押して取引に反映してください
    dispatch({ type: 'setRules', payload: [...state.rules, newRule] });
    console.log('Rule added and applied');
  };

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
