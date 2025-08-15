// src/NetBalanceLineChart.jsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Brush, // ← 追加
} from 'recharts';
import { convertAmount, formatAmount } from './utils/currency.js';

export default function NetBalanceLineChart({ transactions, period, yenUnit }) {
  // ---- 集計 ----------------------------------------------------------
  const monthMap = {};
  transactions.forEach((tx) => {
    const month = tx.date.slice(0, 7); // YYYY-MM
    if (!monthMap[month]) monthMap[month] = 0;
    const diff = tx.kind === 'income' ? tx.amount : -Math.abs(tx.amount);
    monthMap[month] += diff;
  });

  const months = Object.keys(monthMap).sort();
  const limitMap = { '3m': 3, '6m': 6, '1y': 12, all: months.length };
  const limit = limitMap[period] ?? months.length;

  const data = months.slice(-limit).map((m) => ({
    month: m,
    diff: convertAmount(monthMap[m], yenUnit),
  }));

  const average =
    data.length > 0
      ? data.reduce((sum, d) => sum + d.diff, 0) / data.length
      : 0;

  // ---- 画面サイズ（SSR安全） -----------------------------------------
  const isMobile =
    typeof window !== 'undefined' && window.innerWidth < 768;
  const height = isMobile ? 250 : 300;

  // ---- 1・4・7・10月の区切り線（Q1〜Q4） -------------------------------
  const quarterLines = data
    .filter((d) => ['-01', '-04', '-07', '-10'].some((mm) => d.month.endsWith(mm)))
    .map((d) => {
      const m = parseInt(d.month.slice(5, 7), 10);
      const q = Math.floor((m - 1) / 3) + 1;
      return { x: d.month, label: `Q${q}` };
    });

  // ---- 表示用フォーマッタ --------------------------------------------
  const formatMonth = (m) => `${m.slice(2, 4)}/${m.slice(5, 7)}`; // YY/MM
  const yFmt = (v) => formatAmount(v, yenUnit);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div style={{ backgroundColor: '#fff', border: '1px solid #ccc', padding: 8 }}>
        <p style={{ margin: 0 }}>{formatMonth(label)}</p>
        <p style={{ margin: 0 }}>差分: {yFmt(payload[0].value)}</p>
        <p style={{ margin: 0 }}>平均: {yFmt(average)}</p>
      </div>
    );
  };

  // ---- 描画 -----------------------------------------------------------
  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 16, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <YAxis tickFormatter={yFmt} />
          {/* 隔月表示: interval={1} で2つに1つだけ表示 */}
          <XAxis dataKey="month" tickFormatter={formatMonth} interval={1} />

          {/* 0円基準線 */}
          <ReferenceLine y={0} stroke="#000" strokeWidth={1} />

          {/* 四半期の区切り線とラベル */}
          {quarterLines.map((q) => (
            <ReferenceLine
              key={q.x}
              x={q.x}
              stroke="#ccc"
              strokeWidth={1}
              label={{ position: 'top', value: q.label, fill: '#94a3b8' }}
            />
          ))}

          {/* ツールチップは1つに統一（重複排除） */}
          <Tooltip content={<CustomTooltip />} />

          <Line
            type="monotone"
            dataKey="diff"
            stroke="#8884d8"
            dot={{ r: 3 }}
          />

          {/* PCのみブラシを有効化。直近6か月を初期表示 */}
          {!isMobile && (
            <Brush
              dataKey="month"
              height={20}
              travellerWidth={10}
              startIndex={Math.max(data.length - 6, 0)}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


