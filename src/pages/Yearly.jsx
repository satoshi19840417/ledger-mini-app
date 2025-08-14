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

  // カード支払いを除外するかどうかでフィルタリング
  const filteredTransactions = useMemo(() => {
    if (excludeCardPayments) {
      return transactions.filter(tx => tx.category !== 'カード支払い');
    }
    return transactions;
  }, [transactions, excludeCardPayments]);

  return (
    <section>
      <div className='card'>
        <div style={{ marginBottom: 16 }}>
          <label>
            <input
              type='checkbox'
              checked={excludeCardPayments}
              onChange={(e) => setExcludeCardPayments(e.target.checked)}
            />
            <span className='ml-2'>カード支払いを除外して分析</span>
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
