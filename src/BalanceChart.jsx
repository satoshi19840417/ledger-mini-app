import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { formatAmount } from './utils/currency.js';

export default function BalanceChart({ transactions, period, yenUnit }) {
  const data = useMemo(() => {
    const monthMap = {};
    transactions.forEach(tx => {
      const month = tx.date.slice(0, 7);
      if (!monthMap[month]) monthMap[month] = { income: 0, expense: 0 };
      if (tx.kind === 'income') monthMap[month].income += Math.abs(tx.amount);
      if (tx.kind === 'expense') monthMap[month].expense += Math.abs(tx.amount);
    });
    const months = Object.keys(monthMap).sort();
    const limitMap = { '3m': 3, '6m': 6, '1y': 12, all: months.length };
    const limit = limitMap[period] || months.length;
    return months.slice(-limit).map(m => {
      const income = monthMap[m].income;
      const expense = monthMap[m].expense;
      return {
        month: m,
        income,
        expense: -expense,
        diff: income - expense,
      };
    });
  }, [transactions, period]);

  const maxAbs = useMemo(
    () => Math.max(...data.flatMap(d => [Math.abs(d.income), Math.abs(d.expense)]), 0),
    [data]
  );
  const domain = [-maxAbs, maxAbs];
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const minChartWidth = Math.max(data.length * 80, 350);
  const chartWidth = isMobile ? `${minChartWidth}px` : '100%';

  const tooltipFormatter = (value, name) => {
    if (name === 'income') return [formatAmount(value, yenUnit), '収入'];
    if (name === 'expense') return [formatAmount(Math.abs(value), yenUnit), '支出'];
    if (name === 'diff') return [formatAmount(value, yenUnit), '差分'];
    return value;
  };

  return (
    <div
      style={{
        width: '100%',
        overflowX: isMobile ? 'auto' : 'hidden',
      }}
    >
      <div style={{ width: chartWidth, height: 200 }}>
        <ResponsiveContainer width='100%' height='100%'>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='month' />
            <YAxis domain={domain} tickFormatter={v => formatAmount(v, yenUnit)} />
            <ReferenceLine y={0} stroke='#000' strokeWidth={4} />
            <Tooltip formatter={tooltipFormatter} />
            <Bar dataKey='income' fill='#34d399' name='収入' />
            <Bar dataKey='expense' fill='#f87171' name='支出' />
            <Line type='monotone' dataKey='diff' stroke='#3b82f6' dot={false} name='差分' />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
