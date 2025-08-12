import { useRef, useMemo } from 'react';
import { convertAmount, formatAmount } from './utils/currency.js';
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
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

export default function BarByMonth({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  kind = 'expense',
  height = 350,
}) {
  const monthMap = {};
  transactions
    .filter((tx) => tx.kind === kind)
    .forEach((tx) => {
      if (hideOthers && tx.category === 'その他') return;
      const month = tx.date.slice(0, 7);
      monthMap[month] = (monthMap[month] || 0) + Math.abs(tx.amount);
    });
  const months = Object.keys(monthMap).sort();
  const limitMap = { '3m': 3, '6m': 6, '1y': 12, all: months.length };
  const limit = limitMap[period] || months.length;
  const data = months
    .slice(-limit)
    .map((m) => ({ month: m, total: monthMap[m] }));

  const colorMap = useRef({});
  const dataWithColors = useMemo(() => {
    if (!lockColors) colorMap.current = {};
    data.forEach((d) => {
      if (!colorMap.current[d.month]) {
        const used = Object.keys(colorMap.current).length;
        colorMap.current[d.month] = BAR_COLORS[used % BAR_COLORS.length];
      }
    });
    return data.map((d) => ({ ...d, fill: colorMap.current[d.month] }));
  }, [data, lockColors]);

  const tickFormatter = (v) => {
    const value = convertAmount(v, yenUnit);
    return yenUnit === 'man' ? value.toFixed(1) : value.toLocaleString();
  };
  const formatValue = (v) => formatAmount(v, yenUnit);
  const tooltipFormatter = (v) => [formatValue(v), '合計'];
  const legendPayload = dataWithColors.map((d) => ({
    id: d.month,
    value: d.month,
    formatted: formatValue(d.total),
    type: 'square',
    color: d.fill,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={dataWithColors} margin={{ top: 8, right: 16, left: 0, bottom: 28 }}>
        <XAxis
          dataKey="month"
          interval={0}
          angle={-45}
          textAnchor="end"
          height={60}
          tickFormatter={(v) => (v.length > 8 ? `${v.slice(0, 8)}…` : v)}
        />
        <YAxis
          tickFormatter={tickFormatter}
          label={{
            value: yenUnit === 'man' ? '万円' : '円',
            angle: -90,
            position: 'insideLeft',
          }}
        />
        <Tooltip formatter={tooltipFormatter} labelFormatter={(label) => label} />
        <Legend content={<ScrollableLegend />} payload={legendPayload} />
        <Bar dataKey="total" name="合計">
          {dataWithColors.map((entry, idx) => (
            <Cell key={`cell-${idx}`} fill={entry.fill} />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}

