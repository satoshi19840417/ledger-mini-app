export default function NetBalance({ transactions, period, yenUnit }) {
  const monthMap = {};
  transactions.forEach((tx) => {
    const month = tx.date.slice(0, 7);
    monthMap[month] = true;
  });
  const months = Object.keys(monthMap).sort();
  const limitMap = { '3m': 3, '6m': 6, '1y': 12, all: months.length };
  const limit = limitMap[period] || months.length;
  const recentMonths = new Set(months.slice(-limit));

  const recent = transactions.filter((tx) => recentMonths.has(tx.date.slice(0, 7)));

  const incomeTotal = recent
    .filter((tx) => tx.kind === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const expenseTotal = recent
    .filter((tx) => tx.kind === 'expense')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const diff = incomeTotal - expenseTotal;

  const format = (v) => {
    const value = yenUnit === 'man' ? v / 10000 : v;
    const unit = yenUnit === 'man' ? '万円' : '円';
    return `${value.toLocaleString()} ${unit}`;
  };

  return (
    <div className='net-balance'>
      <div className='net-balance-row'>
        <span>収入</span>
        <span>{format(incomeTotal)}</span>
      </div>
      <div className='net-balance-row'>
        <span>支出</span>
        <span>{format(expenseTotal)}</span>
      </div>
      <div className={`net-balance-row${diff < 0 ? ' negative' : ''}`}>
        <span>差分</span>
        <span>{format(diff)}</span>
      </div>
    </div>
  );
}

