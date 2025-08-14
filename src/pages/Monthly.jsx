import { useMemo, useState, useEffect, useRef } from 'react';
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
  const [excludeCardPayments, setExcludeCardPayments] = useState(true);
  const [excludeRent, setExcludeRent] = useState(false);
  const chartContainerRef = useRef(null);
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
        {months.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ marginRight: 8 }}>月選択:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: 12 }}>
            {selectedMonth ? `${selectedMonth} カテゴリー別内訳` : 'カテゴリー別内訳'}
          </h3>
          <PieByCategory
            transactions={monthTxs}
            period="all"
            yenUnit={yenUnit}
            lockColors={lockColors}
            hideOthers={hideOthers}
            kind={kind}
          />
        </div>

        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
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

        <div ref={chartContainerRef} style={{ position: 'relative' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: 12 }}>月次推移</h3>
          <BarByMonth
            transactions={filteredTransactions}
            period={period}
            yenUnit={yenUnit}
            lockColors={lockColors}
            hideOthers={hideOthers}
            kind={kind}
            height={350}
          />
        </div>
      </div>
    </section>
  );
}
