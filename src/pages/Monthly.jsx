import { useMemo, useState, useEffect, useRef } from 'react';
import BarByMonth from '../BarByMonth.jsx';
import PieByCategory from '../PieByCategory.jsx';
import { CATEGORIES } from '../categories.js';

export default function Monthly({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  kind,
}) {
  const [excludeCardPayments, setExcludeCardPayments] = useState(false);
  const [excludeRent, setExcludeRent] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const chartContainerRef = useRef(null);
  // カード支払い・家賃・カテゴリを除外するかどうかでフィルタリング
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
    if (selectedCategory) {
      filtered = filtered.filter(
        tx => tx.category === selectedCategory
      );
    }
    return filtered;
  }, [transactions, excludeCardPayments, excludeRent, selectedCategory]);

  const months = useMemo(() => {
    void selectedCategory; // 依存配列に含めるため
    const set = new Set(
      filteredTransactions
        .filter((tx) => tx.kind === kind)
        .map((tx) => tx.date.slice(0, 7)),
    );
    return Array.from(set).sort();
  }, [filteredTransactions, kind, selectedCategory]);

  const [selectedMonth, setSelectedMonth] = useState(
    months[months.length - 1] || '',
  );

  useEffect(() => {
    setSelectedMonth(months[months.length - 1] || '');
  }, [months, selectedCategory]);

  const monthTxs = useMemo(
    () => {
      void selectedCategory; // 依存配列に含めるため
      return filteredTransactions.filter(
        (tx) =>
          tx.kind === kind && tx.date.slice(0, 7) === selectedMonth,
      );
    },
    [filteredTransactions, selectedMonth, kind, selectedCategory],
  );

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">月次分析</h1>
      <div className='card'>
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
          <div>
            <label style={{ marginRight: 8 }}>カテゴリ:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value=''>全カテゴリ</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {months.length > 0 && (
            <div style={{ marginLeft: 'auto' }}>
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
        </div>
        
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
