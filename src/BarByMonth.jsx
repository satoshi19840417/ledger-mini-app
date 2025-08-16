import { useRef, useMemo, useState, useEffect } from 'react';
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
  ReferenceLine,
  Line,
} from 'recharts';

// デフォルトと強調表示のカラー
const DEFAULT_BAR_COLOR = '#3b82f6';
const HIGHLIGHT_BAR_COLOR = '#fb923c';

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
  lockColors,
  hideOthers,
  kind = 'expense',
  height = 500,
  target,
}) {
  const scrollRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  void lockColors;
  
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
  let runningTotal = 0;
  const data = months
    .slice(-limit)
    .map((m) => {
      runningTotal += monthMap[m];
      return { month: m, total: monthMap[m], cumulative: runningTotal };
    });

  const width = data.length * 40;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const average = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, d) => acc + d.total, 0);
    return sum / data.length;
  }, [data]);
  const dataWithColors = useMemo(() => {
    const highlight = target ?? currentMonth;
    return data.map(d => ({
      ...d,
      fill: d.month === highlight ? HIGHLIGHT_BAR_COLOR : DEFAULT_BAR_COLOR,
    }));
  }, [data, target, currentMonth]);

// 直近3点の移動平均を付与（凡例やラインで使う場合に備えて）
const dataWithMovingAvg = useMemo(() => {
  return dataWithColors.map((d, idx, arr) => {
    const start = Math.max(0, idx - 2);
    const subset = arr.slice(start, idx + 1);
    const avg = subset.reduce((sum, item) => sum + (item.total ?? 0), 0) / subset.length;
    return { ...d, movingAvg: avg };
  });
}, [dataWithColors]);

// Y軸スケール用の最大値（total / cumulative / movingAvg を安全にカバー）
const maxTotal = useMemo(() => {
  return Math.max(
    0,
    ...dataWithMovingAvg.map(d =>
      Math.max(d.total ?? 0, d.cumulative ?? 0, d.movingAvg ?? 0)
    )
  );
}, [dataWithMovingAvg]);
  const displayUnit = useMemo(
    () => (maxTotal >= 1_000_000 ? 'man' : 'yen'),
    [maxTotal]
  );

  const yAxisMax = useMemo(() => Math.ceil(maxTotal * 1.1), [maxTotal]);

  // Y軸のticksを自動計算（きりの良い数値で5つ程度に分割）
  const ticks = useMemo(() => {
    const divisor = displayUnit === 'man' ? 10000 : 1;
    const max = yAxisMax / divisor;
    if (max === 0) return [0];

    // 最大値を適切な間隔で分割
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const normalizedMax = Math.ceil(max / step) * step;
    const tickCount = 5;
    const tickStep = normalizedMax / tickCount;

    const result = [];
    for (let i = 0; i <= tickCount; i++) {
      result.push(Math.round(tickStep * i * divisor));
    }
    return result.filter(v => v <= yAxisMax);
  }, [yAxisMax, displayUnit]);

  const tickFormatter = (v) => formatAmount(v, displayUnit);
  const formatValue = (v) => formatAmount(v, displayUnit);
  const legendPayload = dataWithColors.map((d) => ({
    id: d.month,
    value: d.month,
    formatted: formatValue(d.total),
    type: 'square',
    color: d.fill,
  }));

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  // データの数に応じてグラフの最小幅を計算（1項目あたり最低80px）
  const minBarWidth = Math.max(dataWithColors.length * 80, 500);
  const chartWidth = isMobile ? Math.max(minBarWidth, width) : '100%';
  
  // タッチイベントのハンドラー
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (scrollRef.current) {
      const scrollWidth = scrollRef.current.scrollWidth;
      const clientWidth = scrollRef.current.clientWidth;
      const currentScroll = scrollRef.current.scrollLeft;
      
      if (isLeftSwipe && currentScroll < scrollWidth - clientWidth) {
        // 左スワイプ（右へスクロール）
        scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
      }
      if (isRightSwipe && currentScroll > 0) {
        // 右スワイプ（左へスクロール）
        scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
      }
    }
  };
  
  // モバイルでスワイプヒントを表示
  useEffect(() => {
    if (isMobile && dataWithColors.length > 3) {
      setShowSwipeHint(true);
      const timer = setTimeout(() => setShowSwipeHint(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isMobile, dataWithColors.length]);

  return (
    <div 
      ref={scrollRef}
      style={{ 
        width: '100%', 
        overflowX: isMobile ? 'auto' : 'hidden',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch', // iOS用のスムーズスクロール
        position: 'relative',
        // スクロールバーのスタイリング
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 #f1f5f9'
      }}
      onTouchStart={isMobile ? onTouchStart : undefined}
      onTouchMove={isMobile ? onTouchMove : undefined}
      onTouchEnd={isMobile ? onTouchEnd : undefined}
    >
      {isMobile && dataWithColors.length > 3 && showSwipeHint && (
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
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          animation: 'fadeInOut 5s ease-in-out'
        }}>
          ← スワイプで他の月を表示 →
        </div>
      )}
      <div style={{ 
        width: isMobile ? chartWidth : '100%',
        minWidth: isMobile ? minBarWidth : 'auto'
      }}>
        <ResponsiveContainer width='100%' height={height}>
          <ReBarChart data={dataWithMovingAvg} margin={{ top: 8, right: isMobile ? 8 : 16, left: isMobile ? -10 : 0, bottom: 28 }}>
          <XAxis
            dataKey="month"
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
            tickFormatter={(v) => (v.length > 8 ? `${v.slice(0, 8)}…` : v)}
          />
          <YAxis
            domain={[0, yAxisMax]}
            ticks={ticks}
            tickFormatter={tickFormatter}
            width={isMobile ? 60 : 80}
            tick={{ fontSize: isMobile ? 10 : 12 }}
          />
          <Tooltip formatter={(v) => formatValue(v)} labelFormatter={(label) => label} />
          <Legend content={<ScrollableLegend />} payload={legendPayload} />
          <ReferenceLine
            y={average}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{ position: 'right', value: `平均: ${formatValue(average)}` }}
          />
          <Bar dataKey="total" name="合計">
            {dataWithMovingAvg.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.fill} />
            ))}
          </Bar>
{/* ライン（コンフリクト解消済み） */}
{dataWithMovingAvg.some(d => (d.cumulative ?? 0) > 0) && (
  <Line
    type="monotone"
    dataKey="cumulative"
    name="累積"
    stroke="#6366f1"
    strokeWidth={2}
    dot={{ r: 3 }}
    isAnimationActive={false}
  />
)}

<Line
  type="monotone"
  dataKey="movingAvg"
  name="3ヶ月移動平均"
  stroke="#0ea5e9"
  strokeWidth={2}
  dot={false}
  isAnimationActive={false}
/>

        </ReBarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

