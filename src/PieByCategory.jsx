import { useRef, useMemo } from 'react';
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

export default function PieByCategory({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
}) {
  const monthMap = {};
  const expenses = transactions.filter((tx) => tx.amount < 0);
  expenses.forEach((tx) => {
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

  const formatValue = (v) =>
    yenUnit === 'man' ? `${(v / 10000).toFixed(1)} 万円` : `${v} 円`;
  const tooltipFormatter = (v, name) => [formatValue(v), name];
  const legendPayload = dataWithColors.map((item) => ({
    id: item.name,
    type: 'square',
    color: item.fill,
    value: `${item.name}: ${formatValue(item.value)}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RePieChart>
        <Pie data={dataWithColors} dataKey="value" nameKey="name" label outerRadius="80%">
          {dataWithColors.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          wrapperStyle={{ maxHeight: 300, overflowY: 'auto' }}
          payload={legendPayload}
        />
        <Tooltip formatter={tooltipFormatter} />
      </RePieChart>
    </ResponsiveContainer>
  );
}

