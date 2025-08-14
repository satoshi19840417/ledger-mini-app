import { useMemo, useState, useEffect } from 'react';
import BarByMonth from '../BarByMonth.jsx';
import PieByCategory from '../PieByCategory.jsx';

export default function Monthly({
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

  const months = useMemo(() => {
    const set = new Set(
      filteredTransactions
        .filter((tx) => tx.kind === kind)
        .map((tx) => tx.date.slice(0, 7)),
    );
    return Array.from(set).sort();
  }, [filteredTransactions, kind]);

  const [selectedMonth, setSelectedMonth] = useState(
    months[months.length - 1] || '',
  );

  useEffect(() => {
    setSelectedMonth(months[months.length - 1] || '');
  }, [months]);

  const monthTxs = useMemo(
    () =>
      filteredTransactions.filter(
        (tx) =>
          tx.kind === kind && tx.date.slice(0, 7) === selectedMonth,
      ),
    [filteredTransactions, selectedMonth, kind],
  );

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">月次分析</h1>
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
        <BarByMonth
          transactions={filteredTransactions}
          period={period}
          yenUnit={yenUnit}
          lockColors={lockColors}
          hideOthers={hideOthers}
          kind={kind}
          height={350}
        />
        <div style={{ marginTop: 16 }}>
          {months.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
          <PieByCategory
            transactions={monthTxs}
            period="all"
            yenUnit={yenUnit}
            lockColors={lockColors}
            hideOthers={hideOthers}
            kind={kind}
          />
        </div>
      </div>
    </section>
  );
}
