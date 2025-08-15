import { useMemo, useState } from 'react';
import BarByMonth from '../BarByMonth.jsx';

export default function MonthlyAnalysis({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
}) {
  const [excludeCardPayments, setExcludeCardPayments] = useState(false);
  const [excludeRent, setExcludeRent] = useState(false);
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (excludeCardPayments) {
      filtered = filtered.filter(
        tx => tx.category !== 'カード支払い' && tx.category !== 'カード払い',
      );
    }
    if (excludeRent) {
      filtered = filtered.filter(tx => tx.category !== '家賃');
    }
    return filtered;
  }, [transactions, excludeCardPayments, excludeRent]);

  return (
    <section>
      {/* 月次推移グラフ */}
      <div className='card' style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 16 }}>月次推移</h3>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type='checkbox'
              checked={excludeCardPayments}
              onChange={e => setExcludeCardPayments(e.target.checked)}
            />
            <span className='ml-2'>カード支払いを除外</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type='checkbox'
              checked={excludeRent}
              onChange={e => setExcludeRent(e.target.checked)}
            />
            <span className='ml-2'>家賃を除外</span>
          </label>
        </div>
        <BarByMonth
          transactions={filteredTransactions}
          period={period}
          yenUnit={yenUnit}
          lockColors={lockColors}
          hideOthers={hideOthers}
          kind="expense"
          height={350}
        />
      </div>
    </section>
  );
}
