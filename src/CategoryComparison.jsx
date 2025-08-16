import { useRef, useMemo } from 'react';
import { UNCATEGORIZED_LABEL } from './defaultCategories.js';
import { formatAmount } from './utils/currency.js';
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

const BAR_COLORS = [
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#a78bfa',
  '#fb923c',
];

function ScrollableLegend({ payload }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        maxHeight: isMobile ? 72 : undefined,
        overflowY: isMobile ? 'auto' : undefined,
      }}
    >
      {payload?.map((entry) => {
        const label = entry.value || '';
        const truncated = label.length > 8 ? `${label.slice(0, 8)}…` : label;
        return (
          <li
            key={label}
            title={`${label} ${entry.formatted ?? ''}`}
            style={{ marginRight: 12, display: 'flex', alignItems: 'center' }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                backgroundColor: entry.color,
                marginRight: 4,
              }}
            />
            <span>{truncated}</span>
            {entry.formatted && (
              <span style={{ marginLeft: 4, color: 'var(--muted)' }}>
                {entry.formatted}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function CategoryComparison({
  transactions,
  period = 'all',
  kind = 'expense',
  yenUnit,
  hideOthers,
  lockColors,
  height = 400,
  selectedCategories,
}) {
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.kind !== kind) return false;
      const cat = tx.category || UNCATEGORIZED_LABEL;
      if (hideOthers && cat === 'その他') return false;
      return true;
    });
  }, [transactions, kind, hideOthers]);

  const monthMap = {};
  filtered.forEach((tx) => {
    const month = tx.date.slice(0, 7);
    const cat = tx.category || UNCATEGORIZED_LABEL;
    monthMap[month] = monthMap[month] || {};
    monthMap[month][cat] = (monthMap[month][cat] || 0) + Math.abs(tx.amount);
  });

  const months = Object.keys(monthMap).sort();
  const limitMap = { '3m': 3, '6m': 6, '1y': 12, all: months.length };
  const limit = limitMap[period] || months.length;
  const selectedMonths = months.slice(-limit);

  const categories = useMemo(() => {
    if (selectedCategories && selectedCategories.length > 0) {
      return selectedCategories;
    }
    const totals = {};
    filtered.forEach((tx) => {
      const cat = tx.category || UNCATEGORIZED_LABEL;
      totals[cat] = (totals[cat] || 0) + Math.abs(tx.amount);
    });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, BAR_COLORS.length)
      .map(([cat]) => cat);
  }, [filtered, selectedCategories]);

  const data = selectedMonths.map((m) => {
    const row = { month: m };
    categories.forEach((cat) => {
      row[cat] = monthMap[m]?.[cat] || 0;
    });
    return row;
  });

  const colorMap = useRef({});
  useMemo(() => {
    if (!lockColors) colorMap.current = {};
    categories.forEach((cat) => {
      if (!colorMap.current[cat]) {
        const used = Object.keys(colorMap.current).length;
        colorMap.current[cat] = BAR_COLORS[used % BAR_COLORS.length];
      }
    });
  }, [categories, lockColors]);

  const hasData = data.some((d) => categories.some((cat) => d[cat] > 0));
  if (!hasData) {
    return <p>データがありません</p>;
  }

  const totals = {};
  data.forEach((row) => {
    categories.forEach((cat) => {
      totals[cat] = (totals[cat] || 0) + (row[cat] || 0);
    });
  });

  const formatValue = (v) => formatAmount(v, yenUnit);
  const tooltipFormatter = (v, name) => [formatValue(v), name];
  const legendPayload = categories.map((cat) => ({
    id: cat,
    type: 'square',
    color: colorMap.current[cat],
    value: cat,
    formatted: formatValue(totals[cat] || 0),
  }));

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const minWidth = Math.max(selectedMonths.length * categories.length * 40, 500);
  const chartWidth = isMobile ? Math.max(minWidth, selectedMonths.length * 80) : '100%';

  return (
    <div
      style={{
        width: '100%',
        overflowX: isMobile ? 'auto' : 'hidden',
        overflowY: 'hidden',
      }}
    >
      <div style={{ width: isMobile ? chartWidth : '100%', minWidth: isMobile ? minWidth : 'auto' }}>
        <ResponsiveContainer width="100%" height={height}>
          <ReBarChart data={data} margin={{ top: 8, right: isMobile ? 8 : 16, left: isMobile ? -10 : 0, bottom: 28 }}>
            <XAxis dataKey="month" interval={0} angle={-45} textAnchor="end" height={80} />
            <YAxis tickFormatter={formatValue} width={isMobile ? 60 : 80} tick={{ fontSize: isMobile ? 10 : 12 }} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={(label) => label} />
            <Legend content={<ScrollableLegend />} payload={legendPayload} />
            {categories.map((cat) => (
              <Bar key={cat} dataKey={cat} name={cat} fill={colorMap.current[cat]} />
            ))}
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
