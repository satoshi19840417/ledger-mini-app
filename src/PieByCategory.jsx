import { useRef, useMemo, useEffect } from 'react';
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
        padding: isMobile ? '0 8px' : 0,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        maxHeight: isMobile ? 100 : undefined,
        overflowY: isMobile ? 'auto' : undefined,
        fontSize: isMobile ? '12px' : '14px',
        justifyContent: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '4px' : '8px',
      }}
    >
      {payload?.map(entry => {
        const label = entry.value || '';
        const truncated = isMobile && label.length > 10 ? `${label.slice(0, 10)}…` : label;
        return (
          <li
            key={label}
            title={`${label} ${entry.formatted ?? ''}`}
            style={{ 
              marginRight: isMobile ? 0 : 12, 
              display: 'flex', 
              alignItems: 'center',
              padding: isMobile ? '2px 0' : '0'
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                backgroundColor: entry.color,
                marginRight: 4,
                flexShrink: 0,
              }}
            />
            <span style={{ whiteSpace: 'nowrap' }}>{truncated}</span>
            {entry.formatted && (
              <span style={{ 
                marginLeft: 4, 
                color: 'var(--muted)',
                fontSize: isMobile ? '11px' : '12px',
                whiteSpace: 'nowrap'
              }}>
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
  chartHeight,
  radius,
}) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  chartHeight = chartHeight ?? 400;
  radius = radius ?? (isMobile ? '75%' : '90%');
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
  if (items.length === 0 && othersValue > 0) {
    items.push({ name: 'その他', value: othersValue });
  } else if (!hideOthers && othersValue > 0) {
    items.push({ name: 'その他', value: othersValue });
  }
  items.sort((a, b) => {
    if (a.name === 'その他') return 1;
    if (b.name === 'その他') return -1;
    return b.value - a.value;
  });

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

  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [chartHeight, dataWithColors.length]);

  if (items.length === 0) {
    return <p>データがありません</p>;
  }

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
    <div
      className="w-full h-[250px]"
      style={{
        height: chartHeight,
        maxWidth: isMobile ? '100%' : 'none',
        margin: '0 auto'
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RePieChart margin={{
          top: isMobile ? 10 : 0,
          right: isMobile ? 10 : 30,
          bottom: isMobile ? 80 : 20,
          left: isMobile ? 10 : 30
        }}>
          <Pie
            data={dataWithColors}
            dataKey="value"
            nameKey="name"
            label={renderCustomLabel}
            labelLine={false}
            outerRadius={radius}
            cx={isMobile ? "50%" : "50%"}
            cy={isMobile ? "45%" : "50%"}
          >
            {dataWithColors.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Legend 
            content={<ScrollableLegend />} 
            payload={legendPayload}
            wrapperStyle={{
              paddingTop: isMobile ? '10px' : '0px',
              maxWidth: '100%',
              overflow: 'auto'
            }}
            verticalAlign={isMobile ? "bottom" : "middle"}
            align={isMobile ? "center" : "right"}
          />
          <Tooltip formatter={tooltipFormatter} />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
}

