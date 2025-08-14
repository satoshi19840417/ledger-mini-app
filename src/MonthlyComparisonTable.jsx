import React from 'react';

export default function MonthlyComparisonTable({ rows, selectedMonth, onSelectMonth, yenUnit }) {
  const formatValue = v =>
    yenUnit === 'man' ? `${(v / 10000).toFixed(1)} 万円` : `${v.toLocaleString()} 円`;
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th style={{ borderBottom: '1px solid #eee', padding: 6, whiteSpace: 'nowrap' }}>月</th>
            <th style={{ borderBottom: '1px solid #eee', padding: 6, whiteSpace: 'nowrap' }}>収入</th>
            <th style={{ borderBottom: '1px solid #eee', padding: 6, whiteSpace: 'nowrap' }}>支出</th>
            <th style={{ borderBottom: '1px solid #eee', padding: 6, whiteSpace: 'nowrap' }}>差分</th>
          </tr>
        </thead>
      <tbody>
        {rows.map(row => (
          <tr
            key={row.month}
            onClick={() => onSelectMonth(row.month)}
            style={{
              backgroundColor: row.month === selectedMonth ? '#f0f8ff' : undefined,
              cursor: 'pointer'
            }}
          >
            <td style={{ borderBottom: '1px solid #f0f0f0', padding: 6, whiteSpace: 'nowrap' }}>{row.month}</td>
            <td style={{ borderBottom: '1px solid #f0f0f0', padding: 6, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {formatValue(row.incomeTotal)}
            </td>
            <td style={{ borderBottom: '1px solid #f0f0f0', padding: 6, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {formatValue(row.expenseTotal)}
            </td>
            <td style={{ borderBottom: '1px solid #f0f0f0', padding: 6, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {formatValue(row.diff)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
