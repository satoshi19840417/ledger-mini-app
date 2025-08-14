import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { convertAmount, formatAmount } from './utils/currency.js';

export default function NetBalanceLineChart({ transactions, period, yenUnit }) {
  const monthMap = {};
  transactions.forEach((tx) => {
    const month = tx.date.slice(0, 7);
    if (!monthMap[month]) monthMap[month] = 0;
    const diff = tx.kind === 'income' ? tx.amount : -Math.abs(tx.amount);
    monthMap[month] += diff;
  });
  const months = Object.keys(monthMap).sort();
  const limitMap = { '3m': 3, '6m': 6, '1y': 12, all: months.length };
  const limit = limitMap[period] || months.length;
  const data = months.slice(-limit).map((m) => ({
    month: m,
    diff: convertAmount(monthMap[m], yenUnit),
  }));

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const height = isMobile ? 250 : 300;

  const tickFormatter = (v) => v.toLocaleString();
  const tooltipFormatter = (v) => formatAmount(v, yenUnit);

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={tickFormatter} />
          <Tooltip formatter={tooltipFormatter} />
          <Line type="monotone" dataKey="diff" stroke="#8884d8" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

