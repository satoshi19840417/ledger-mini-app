import { formatAmount } from './utils/currency.js';

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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  return (
    <div className='net-balance' style={{ 
      fontSize: isMobile ? '14px' : '16px',
      padding: isMobile ? '8px' : '0'
    }}>
      <div className='net-balance-row'>
        <span>収入</span>
        <span style={{ fontWeight: 'bold' }}>{formatAmount(incomeTotal, yenUnit)}</span>
      </div>
      <div className='net-balance-row'>
        <span>支出</span>
        <span style={{ fontWeight: 'bold' }}>{formatAmount(expenseTotal, yenUnit)}</span>
      </div>
      <div className={`net-balance-row${diff < 0 ? ' negative' : ''}`} style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '2px solid #e5e7eb',
        fontWeight: 'bold'
      }}>
        <span>差分</span>
        <span>{formatAmount(diff, yenUnit)}</span>
      </div>
    </div>
  );
}

