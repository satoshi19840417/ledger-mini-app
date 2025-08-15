import { formatAmount } from './utils/currency.js';
import AmountVisual from './components/ui/AmountVisual.jsx';

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
  
  // 万円単位への変換
  const displayIncome = yenUnit === 'man' ? incomeTotal / 10000 : incomeTotal;
  const displayExpense = yenUnit === 'man' ? expenseTotal / 10000 : expenseTotal;
  const displayDiff = yenUnit === 'man' ? diff / 10000 : diff;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  return (
    <div className='net-balance' style={{ 
      padding: isMobile ? '12px' : '16px'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <AmountVisual
          amount={displayIncome}
          label={`収入${yenUnit === 'man' ? '(万円)' : ''}`}
          isIncome={true}
          showBar={true}
          maxAmount={yenUnit === 'man' ? 50 : 500000}
          compact={isMobile}
        />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <AmountVisual
          amount={-displayExpense}
          label={`支出${yenUnit === 'man' ? '(万円)' : ''}`}
          isIncome={false}
          showBar={true}
          maxAmount={yenUnit === 'man' ? 50 : 500000}
          compact={isMobile}
        />
      </div>
      <div style={{
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '2px solid #e5e7eb'
      }}>
        <AmountVisual
          amount={displayDiff}
          label={`差分${yenUnit === 'man' ? '(万円)' : ''}`}
          showBar={false}
          compact={isMobile}
        />
      </div>
    </div>
  );
}

