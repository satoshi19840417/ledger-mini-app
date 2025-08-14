import { useRef, useMemo } from 'react';
import { formatAmount } from './utils/currency.js';
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Legend,
  Tooltip,
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
      {payload?.map(entry => {
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

export default function PieByCategory({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  kind = 'expense',
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

  const totals = {};
  filteredTx.forEach((tx) => {
    const cat = tx.category || 'その他';
    totals[cat] = (totals[cat] || 0) + Math.abs(tx.amount);
  });
  const totalSum = Object.values(totals).reduce((s, v) => s + v, 0);
  const items = [];
  let othersValue = 0;
  Object.entries(totals).forEach(([name, value]) => {
    const ratio = totalSum ? value / totalSum : 0;
    if (name === 'その他' || ratio < 0.03) {
      othersValue += value;
    } else {
      items.push({ name, value });
    }
  });
  if (!hideOthers && othersValue > 0) {
    items.push({ name: 'その他', value: othersValue });
  }

  const colorMap = useRef({});
  const dataWithColors = useMemo(() => {
    if (!lockColors) colorMap.current = {};
    items.forEach((d) => {
      if (!colorMap.current[d.name]) {
        const used = Object.keys(colorMap.current).length;
        colorMap.current[d.name] = BAR_COLORS[used % BAR_COLORS.length];
      }
    });
    return items.map((d) => ({ ...d, fill: colorMap.current[d.name] }));
  }, [items, lockColors]);

  const formatValue = (v) => formatAmount(v, yenUnit);
  const tooltipFormatter = (v, name) => [formatValue(v), name];
  const legendPayload = dataWithColors.map((item) => ({
    id: item.name,
    type: 'square',
    color: item.fill,
    value: item.name,
    formatted: `${((item.value / totalSum) * 100).toFixed(1)}% (${formatValue(
      item.value
    )})`,
  }));

  // カスタムラベル関数を追加
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const renderCustomLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, value, index, percent
  }) => {
    // モバイルでは5%未満のラベルを非表示
    if (isMobile && percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // モバイルではパーセンテージのみ表示
    const displayValue = isMobile 
      ? `${(percent * 100).toFixed(0)}%`
      : Math.round(value).toLocaleString();
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        style={{ 
          fontSize: isMobile ? '10px' : '12px', 
          fontWeight: 'bold',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}
      >
        {displayValue}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 250 : 200}>
      <RePieChart margin={{ top: 0, right: 0, bottom: isMobile ? 50 : 0, left: 0 }}>
        <Pie 
          data={dataWithColors} 
          dataKey="value" 
          nameKey="name" 
          label={renderCustomLabel}
          labelLine={false}
          outerRadius={isMobile ? "70%" : "80%"}
        >
          {dataWithColors.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Legend content={<ScrollableLegend />} payload={legendPayload} />
        <Tooltip formatter={tooltipFormatter} />
      </RePieChart>
    </ResponsiveContainer>
  );
}

