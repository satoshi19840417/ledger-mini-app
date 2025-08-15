import { useMemo, useState, useEffect } from 'react';
import PieByCategory from '../PieByCategory.jsx';
import BalanceChart from '../BalanceChart.jsx';
import MonthlyComparisonTable from '../MonthlyComparisonTable.jsx';
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

  const months = useMemo(() => {
    const monthSet = new Set();
    filteredTransactions.forEach(tx => {
      monthSet.add(tx.date.slice(0, 7));
    });
    return Array.from(monthSet).sort();
  }, [filteredTransactions]);

  const rows = useMemo(
    () =>
      months.map(m => {
        let incomeTotal = 0;
        let expenseTotal = 0;
        filteredTransactions.forEach(tx => {
          if (tx.date.slice(0, 7) !== m) return;
          if (tx.kind === 'income') incomeTotal += Math.abs(tx.amount);
          if (tx.kind === 'expense') expenseTotal += Math.abs(tx.amount);
        });
        return { month: m, incomeTotal, expenseTotal, diff: incomeTotal - expenseTotal };
      }),
    [months, filteredTransactions],
  );

  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1] || '');

  useEffect(() => {
    setSelectedMonth(months[months.length - 1] || '');
  }, [months]);

  const monthTxs = useMemo(
    () =>
      filteredTransactions.filter(tx => tx.date.slice(0, 7) === selectedMonth),
    [filteredTransactions, selectedMonth],
  );

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
      
      {/* 月ごとの詳細分析 */}
      <div className='card'>
        <h3 style={{ marginBottom: 16 }}>月ごとの詳細分析</h3>
        {months.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {months.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h3 style={{ textAlign: 'center', marginBottom: 8 }}>支出</h3>
            <PieByCategory
              transactions={monthTxs}
              period='all'
              yenUnit={yenUnit}
              lockColors={lockColors}
              hideOthers={hideOthers}
              kind='expense'
            />
          </div>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h3 style={{ textAlign: 'center', marginBottom: 8 }}>収入</h3>
            <PieByCategory
              transactions={monthTxs}
              period='all'
              yenUnit={yenUnit}
              lockColors={lockColors}
              hideOthers={hideOthers}
              kind='income'
            />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ textAlign: 'center', marginBottom: 8 }}>収支推移</h3>
          <BalanceChart
            transactions={filteredTransactions}
            period={period}
            yenUnit={yenUnit}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <MonthlyComparisonTable
            rows={rows}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            yenUnit={yenUnit}
          />
        </div>
      </div>
    </section>
  );
}
