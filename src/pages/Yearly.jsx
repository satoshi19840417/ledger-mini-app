import { useMemo, useState } from 'react';
import PieByCategory from '../PieByCategory.jsx';

export default function Yearly({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  kind,
}) {
  const [excludeCardPayments, setExcludeCardPayments] = useState(false);
  const [excludeRent, setExcludeRent] = useState(false);

  // カード支払いと家賃を除外するかどうかでフィルタリング
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (excludeCardPayments) {
      filtered = filtered.filter(
        tx => tx.category !== 'カード支払い' && tx.category !== 'カード払い'
      );
    }
    if (excludeRent) {
      filtered = filtered.filter(
        tx => tx.category !== '家賃'
      );
    }
    return filtered;
  }, [transactions, excludeCardPayments, excludeRent]);

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">年次分析</h1>
      <div className='card'>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type='checkbox'
              checked={excludeCardPayments}
              onChange={(e) => setExcludeCardPayments(e.target.checked)}
            />
            <span className='ml-2'>カード支払いを除外して分析</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type='checkbox'
              checked={excludeRent}
              onChange={(e) => setExcludeRent(e.target.checked)}
            />
            <span className='ml-2'>家賃を除外して分析</span>
          </label>
        </div>
        <PieByCategory
          transactions={filteredTransactions}
          period={period}
          yenUnit={yenUnit}
          lockColors={lockColors}
          hideOthers={hideOthers}
          kind={kind}
        />
      </div>
    </section>
  );
}
