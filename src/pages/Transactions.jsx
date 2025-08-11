import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../state/StoreContext';
import { CATEGORIES } from '../categories';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
/** @typedef {import('../types').Transaction} Transaction */

export default function Transactions() {
  const { state } = useStore();
  /** @type {Transaction[]} */
  const txs = state.transactions;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return txs.filter(tx => {
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      if (categories.length && !categories.includes(tx.category)) return false;
      if (keyword) {
        const k = keyword.toLowerCase();
        const target = `${tx.description || ''} ${tx.detail || ''} ${tx.memo || ''}`.toLowerCase();
        if (!target.includes(k)) return false;
      }
      const amt = Math.abs(tx.amount);
      if (minAmount !== '' && amt < Number(minAmount)) return false;
      if (maxAmount !== '' && amt > Number(maxAmount)) return false;
      if (type === 'income' && tx.amount <= 0) return false;
      if (type === 'expense' && tx.amount >= 0) return false;
      return true;
    });
  }, [txs, startDate, endDate, categories, keyword, minAmount, maxAmount, type]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, categories, keyword, minAmount, maxAmount, type]);

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageTxs = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, 'transactions.xlsx');
  };

  return (
    <section>
      <h2>取引一覧</h2>
      <div className='card'>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>（{filtered.length} 件の取引）</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportCsv}>CSV出力</button>
            <button onClick={exportExcel}>Excel出力</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <input type='date' value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type='date' value={endDate} onChange={e => setEndDate(e.target.value)} />
          <select
            multiple
            value={categories}
            onChange={e => setCategories(Array.from(e.target.selectedOptions).map(o => o.value))}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type='text'
            placeholder='キーワード'
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
          <input
            type='number'
            placeholder='最小金額'
            value={minAmount}
            onChange={e => setMinAmount(e.target.value)}
          />
          <input
            type='number'
            placeholder='最大金額'
            value={maxAmount}
            onChange={e => setMaxAmount(e.target.value)}
          />
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value='all'>すべて</option>
            <option value='expense'>支出</option>
            <option value='income'>収入</option>
          </select>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={{ borderBottom: '1px solid #eee', padding: 4 }}>日付</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 4 }}>カテゴリ</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 4 }}>金額</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 4 }}>内容</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 4 }}>メモ</th>
            </tr>
          </thead>
          <tbody>
            {pageTxs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 8, color: '#666' }}>
                  該当取引がありません
                </td>
              </tr>
            ) : (
              pageTxs.map((tx, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: 4 }}>{tx.date}</td>
                  <td style={{ padding: 4 }}>{tx.category || ''}</td>
                  <td style={{ padding: 4, textAlign: 'right' }}>
                    {tx.amount.toLocaleString()}
                  </td>
                  <td style={{ padding: 4 }}>{tx.description || tx.detail || ''}</td>
                  <td style={{ padding: 4 }}>{tx.memo || ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 4,
            marginTop: 8,
            flexWrap: 'wrap',
          }}
        >
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              style={{
                fontWeight: page === i + 1 ? 'bold' : 'normal',
                minWidth: 32,
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
