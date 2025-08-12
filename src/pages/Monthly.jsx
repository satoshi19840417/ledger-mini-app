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
  const months = useMemo(() => {
    const set = new Set(
      transactions
        .filter((tx) => tx.kind === kind)
        .map((tx) => tx.date.slice(0, 7)),
    );
    return Array.from(set).sort();
  }, [transactions, kind]);

  const [selectedMonth, setSelectedMonth] = useState(
    months[months.length - 1] || '',
  );

  useEffect(() => {
    setSelectedMonth(months[months.length - 1] || '');
  }, [months]);

  const monthTxs = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          tx.kind === kind && tx.date.slice(0, 7) === selectedMonth,
      ),
    [transactions, selectedMonth, kind],
  );

  return (
    <section>
      <div className='card'>
        <BarByMonth
          transactions={transactions}
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
