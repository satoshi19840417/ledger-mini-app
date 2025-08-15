import { useMemo } from 'react';
import { formatAmount } from './utils/currency.js';

export default function MonthAmountMatrix({ transactions, kind = 'expense', yenUnit }) {
  const { months, totals, max } = useMemo(() => {
    const map = {};
    transactions
      .filter((tx) => tx.kind === kind)
      .forEach((tx) => {
        const month = tx.date.slice(0, 7);
        map[month] = (map[month] || 0) + Math.abs(tx.amount);
      });
    const keys = Object.keys(map).sort();
    const maxVal = Math.max(...Object.values(map), 0);
    return { months: keys, totals: map, max: maxVal };
  }, [transactions, kind]);

  const colorFor = (val) => {
    if (!max || val === 0) return '#f9fafb';
    const ratio = val / max;
    const lightness = 90 - 50 * ratio;
    return `hsl(217, 91%, ${lightness}%)`;
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {months.map((m) => (
        <div
          key={m}
          className="p-2 text-center rounded"
          style={{ backgroundColor: colorFor(totals[m]) }}
        >
          <div>{m}</div>
          <div>{formatAmount(totals[m], yenUnit)}</div>
        </div>
      ))}
    </div>
  );
}
