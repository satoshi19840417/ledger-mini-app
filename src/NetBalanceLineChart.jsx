import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { convertAmount, formatAmount } from './utils/currency.js';
import { addMonthlyDiffs } from './utils/diff.js';

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
  const baseData = months.slice(-limit).map((m) => ({
    month: m,
    diff: convertAmount(monthMap[m], yenUnit),
  }));
  const data = addMonthlyDiffs(baseData, 'diff');

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const height = isMobile ? 250 : 300;

  const tickFormatter = (v) => v.toLocaleString();

  const formatDiffValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const sign = value > 0 ? '+' : value < 0 ? '-' : '±';
    const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '';
    return `${sign}${formatAmount(Math.abs(value), yenUnit)}${arrow}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white p-2 border rounded">
        <p>{label}</p>
        <p>{formatAmount(d.diff, yenUnit)}</p>
        {d.prevMonthDiff !== null && (
          <p>前月比: {formatDiffValue(d.prevMonthDiff)}</p>
        )}
        {d.yearOnYearDiff !== null && (
          <p>前年比: {formatDiffValue(d.yearOnYearDiff)}</p>
        )}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={tickFormatter} />
          <ReferenceLine y={0} stroke="#000" strokeWidth={4} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="diff" stroke="#8884d8" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

