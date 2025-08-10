import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Legend, Cell } from 'recharts';

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
            title={label}
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
          </li>
        );
      })}
    </ul>
  );
}

export default function Charts({ monthly, categoryPieLimited }) {
  return (
    <div className="grid2" style={{ height: 360 }}>
      <ResponsiveContainer>
        <BarChart data={monthly} margin={{ top: 8, right: 16, left: 0, bottom: 28 }}>
          <XAxis
            dataKey="month"
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
            tickFormatter={(v) => (v.length > 8 ? `${v.slice(0, 8)}…` : v)}
          />
          <YAxis
            tickFormatter={(v) => (v / 10000).toFixed(1)}
            label={{ value: '万円', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(v) => [`${(v / 10000).toFixed(1)} 万円`, '合計']}
            labelFormatter={(label) => label}
          />
          <Legend content={<ScrollableLegend />} />
          <Bar dataKey="total" name="合計">
            {monthly.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <ResponsiveContainer>
        <PieChart>
          <Pie data={categoryPieLimited} dataKey="value" nameKey="name" label outerRadius="80%" />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ maxHeight: 300, overflowY: 'auto' }}
            payload={categoryPieLimited.map(item => ({
              id: item.name,
              value: item.name,
              type: 'square',
              color: item.fill,
            }))}
          />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

