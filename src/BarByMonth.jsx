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

  const width = data.length * 40;

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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  // データの数に応じてグラフの最小幅を計算（1項目あたり最低80px）
  const minBarWidth = Math.max(dataWithColors.length * 80, 350);
  const chartWidth = isMobile ? Math.max(minBarWidth, width) : '100%';

  return (
    <div style={{ 
      width: '100%', 
      overflowX: isMobile ? 'auto' : 'hidden',
      overflowY: 'hidden',
      WebkitOverflowScrolling: 'touch', // iOS用のスムーズスクロール
      position: 'relative',
      // スクロールバーのスタイリング
      scrollbarWidth: 'thin',
      scrollbarColor: '#cbd5e1 #f1f5f9'
    }}>
      {isMobile && dataWithColors.length > 3 && (
        <div style={{
          position: 'sticky',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: '5px',
          zIndex: 10,
          background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.95), rgba(99, 102, 241, 0.95))',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '16px',
          fontSize: '11px',
          fontWeight: '600',
          pointerEvents: 'none',
          width: 'fit-content',
          margin: '0 auto',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}>
          ← スワイプで他の月を表示 →
        </div>
      )}
      <div style={{ 
        width: isMobile ? chartWidth : '100%',
        minWidth: isMobile ? minBarWidth : 'auto'
      }}>
        <ResponsiveContainer width='100%' height={height}>
          <ReBarChart data={dataWithColors} margin={{ top: 8, right: isMobile ? 8 : 16, left: isMobile ? -10 : 0, bottom: 28 }}>
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
            width={isMobile ? 45 : 60}
            label={{
              value: yenUnit === 'man' ? '万円' : '円',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: isMobile ? 10 : 12 }
            }}
            tick={{ fontSize: isMobile ? 10 : 12 }}
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
      </div>
    </div>
  );
}

