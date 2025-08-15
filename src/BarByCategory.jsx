import { useRef, useMemo } from 'react';
import { formatAmount } from './utils/currency.js';
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
import { DEFAULT_CATEGORIES as CATEGORIES } from './defaultCategories.js';

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

export default function BarByCategory({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  kind = 'expense',
  height = 400,
  selectedCategories = [],
}) {
  const monthMap = {};
  const txs = transactions.filter((tx) => tx.kind === kind);
  txs.forEach((tx) => {
    const month = tx.date.slice(0, 7);
    (monthMap[month] = monthMap[month] || []).push(tx);
  });
  const months = Object.keys(monthMap).sort();
  const limitMap = { '3m': 3, '6m': 6, '1y': 12, all: months.length };
  const limit = limitMap[period] || months.length;
  const selectedMonths = months.slice(-limit);
  const filteredTx = selectedMonths.flatMap((m) => monthMap[m] || []);

  const selectedSet = new Set(selectedCategories);
  const totals = {};
  filteredTx.forEach((tx) => {
    const cat = tx.category || 'その他';
    if (hideOthers && cat === 'その他') return;
    if (selectedCategories.length > 0 && !selectedSet.has(cat)) return;
    totals[cat] = (totals[cat] || 0) + Math.abs(tx.amount);
  });

  const items = Object.entries(totals).map(([category, total]) => ({ category, total }));
  items.sort((a, b) => {
    const ai = CATEGORIES.indexOf(a.category);
    const bi = CATEGORIES.indexOf(b.category);
    if (ai === -1 && bi === -1) return b.total - a.total;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    if (ai === bi) return b.total - a.total;
    return ai - bi;
  });

  const colorMap = useRef({});
  const dataWithColors = useMemo(() => {
    if (!lockColors) colorMap.current = {};
    items.forEach((d) => {
      if (!colorMap.current[d.category]) {
        const used = Object.keys(colorMap.current).length;
        colorMap.current[d.category] = BAR_COLORS[used % BAR_COLORS.length];
      }
    });
    return items.map((d) => ({ ...d, fill: colorMap.current[d.category] }));
  }, [items, lockColors]);

  if (dataWithColors.length === 0) {
    return <p>データがありません</p>;
  }

  const formatValue = (v) => formatAmount(v, yenUnit);
  const tooltipFormatter = (v, name) => [formatValue(v), name];
  const legendPayload = dataWithColors.map((item) => ({
    id: item.category,
    type: 'square',
    color: item.fill,
    value: item.category,
    formatted: formatValue(item.total),
  }));

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const minBarWidth = Math.max(dataWithColors.length * 80, 500);
  const chartWidth = isMobile ? Math.max(minBarWidth, dataWithColors.length * 60) : '100%';

  return (
    <div
      style={{
        width: '100%',
        overflowX: isMobile ? 'auto' : 'hidden',
        overflowY: 'hidden',
      }}
    >
      <div style={{ width: isMobile ? chartWidth : '100%', minWidth: isMobile ? minBarWidth : 'auto' }}>
        <ResponsiveContainer width="100%" height={height}>
          <ReBarChart data={dataWithColors} margin={{ top: 8, right: isMobile ? 8 : 16, left: isMobile ? -10 : 0, bottom: 28 }}>
            <XAxis
              dataKey="category"
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
              tickFormatter={(v) => (v.length > 8 ? `${v.slice(0, 8)}…` : v)}
            />
            <YAxis tickFormatter={formatValue} width={isMobile ? 60 : 80} tick={{ fontSize: isMobile ? 10 : 12 }} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={(label) => label} />
            <Legend content={<ScrollableLegend />} payload={legendPayload} />
            <Bar dataKey="total" name="合計">
              {dataWithColors.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.fill} />
              ))}
            </Bar>
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

