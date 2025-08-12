import { useMemo, useState, useEffect } from 'react';
import PieByCategory from '../PieByCategory.jsx';
import BarByMonth from '../BarByMonth.jsx';
import MonthlyComparisonTable from '../MonthlyComparisonTable.jsx';

export default function MonthlyAnalysis({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
}) {
  const months = useMemo(() => {
    const monthSet = new Set();
    transactions.forEach(tx => {
      monthSet.add(tx.date.slice(0, 7));
    });
    return Array.from(monthSet).sort();
  }, [transactions]);

  const rows = useMemo(
    () =>
      months.map(m => {
        let incomeTotal = 0;
        let expenseTotal = 0;
        transactions.forEach(tx => {
          if (tx.date.slice(0, 7) !== m) return;
          if (tx.kind === 'income') incomeTotal += Math.abs(tx.amount);
          if (tx.kind === 'expense') expenseTotal += Math.abs(tx.amount);
        });
        return { month: m, incomeTotal, expenseTotal, diff: incomeTotal - expenseTotal };
      }),
    [months, transactions],
  );

  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1] || '');

  useEffect(() => {
    setSelectedMonth(months[months.length - 1] || '');
  }, [months]);

  const monthTxs = useMemo(
    () => transactions.filter(tx => tx.date.slice(0, 7) === selectedMonth),
    [transactions, selectedMonth],
  );

  return (
    <section>
      <div className='card'>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <BarByMonth
              transactions={transactions}
              period={period}
              yenUnit={yenUnit}
              lockColors={lockColors}
              hideOthers={hideOthers}
              kind='expense'
              height={200}
            />
          </div>
          <div style={{ flex: 1, minWidth: 300 }}>
            <BarByMonth
              transactions={transactions}
              period={period}
              yenUnit={yenUnit}
              lockColors={lockColors}
              hideOthers={hideOthers}
              kind='income'
              height={200}
            />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <MonthlyComparisonTable
            rows={rows}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            yenUnit={yenUnit}
          />
          {months.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                {months.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
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
        </div>
      </div>
    </section>
  );
}
