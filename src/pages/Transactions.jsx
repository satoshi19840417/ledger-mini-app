import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../state/StoreContextWithDB';
import { CATEGORIES } from '../categories';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
/** @typedef {import('../types').Transaction} Transaction */
/** @typedef {import('../types').Rule} Rule */

export default function Transactions() {
  const { state, dispatch } = useStore();
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
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [newRule, setNewRule] = useState({
    pattern: '',
    mode: 'contains',
    target: 'description',
    category: CATEGORIES[0],
    kind: 'both',
  });

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
      if (type === 'income' && tx.kind !== 'income') return false;
      if (type === 'expense' && tx.kind !== 'expense') return false;
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

  const openRuleModal = (tx) => {
    setSelectedTx(tx);
    setNewRule({
      pattern: tx.description || tx.detail || '',
      mode: 'contains',
      target: 'description',
      category: tx.category || CATEGORIES[0],
      kind: tx.kind || 'both',
    });
    setShowRuleModal(true);
  };

  const saveRule = () => {
    const rules = state.rules || [];
    const updatedRules = [...rules, newRule];
    dispatch({ type: 'setRules', payload: updatedRules });
    dispatch({ type: 'applyRules' });
    setShowRuleModal(false);
    setSelectedTx(null);
  };

  const applyRuleToTransaction = () => {
    if (!selectedTx) return;
    const updatedTxs = state.transactions.map(tx => 
      tx.id === selectedTx.id ? { ...tx, category: newRule.category } : tx
    );
    dispatch({ type: 'importTransactions', payload: updatedTxs, append: false });
    setShowRuleModal(false);
    setSelectedTx(null);
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
              <th style={{ borderBottom: '1px solid #eee', padding: 4 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {pageTxs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 8, color: '#666' }}>
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
                  <td style={{ padding: 4 }}>
                    <button 
                      onClick={() => openRuleModal(tx)}
                      style={{ fontSize: '0.85rem', padding: '2px 8px' }}
                    >
                      ルール作成
                    </button>
                  </td>
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

      {showRuleModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowRuleModal(false)}
        >
          <div 
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3>分類ルール作成</h3>
            {selectedTx && (
              <div style={{ marginBottom: 16, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                <div><strong>対象明細:</strong></div>
                <div>日付: {selectedTx.date}</div>
                <div>内容: {selectedTx.description || selectedTx.detail || ''}</div>
                <div>金額: {selectedTx.amount.toLocaleString()}円</div>
                <div>現在のカテゴリ: {selectedTx.category || '未分類'}</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>パターン</label>
                <input
                  type='text'
                  value={newRule.pattern}
                  onChange={e => setNewRule(r => ({ ...r, pattern: e.target.value }))}
                  style={{ width: '100%', padding: 6 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>マッチング方法</label>
                <select
                  value={newRule.mode}
                  onChange={e => setNewRule(r => ({ ...r, mode: e.target.value }))}
                  style={{ width: '100%', padding: 6 }}
                >
                  <option value='contains'>部分一致</option>
                  <option value='regex'>正規表現</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>対象フィールド</label>
                <select
                  value={newRule.target}
                  onChange={e => setNewRule(r => ({ ...r, target: e.target.value }))}
                  style={{ width: '100%', padding: 6 }}
                >
                  <option value='description'>説明</option>
                  <option value='detail'>詳細</option>
                  <option value='memo'>メモ</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>カテゴリ</label>
                <select
                  value={newRule.category}
                  onChange={e => setNewRule(r => ({ ...r, category: e.target.value }))}
                  style={{ width: '100%', padding: 6 }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>適用対象</label>
                <select
                  value={newRule.kind}
                  onChange={e => setNewRule(r => ({ ...r, kind: e.target.value }))}
                  style={{ width: '100%', padding: 6 }}
                >
                  <option value='both'>両方</option>
                  <option value='expense'>支出のみ</option>
                  <option value='income'>収入のみ</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button 
                  onClick={applyRuleToTransaction}
                  style={{ flex: 1, padding: '8px 16px', background: '#e3f2fd', border: '1px solid #90caf9' }}
                >
                  この明細のみ変更
                </button>
                <button 
                  onClick={saveRule}
                  style={{ flex: 1, padding: '8px 16px', background: '#4caf50', color: '#fff', border: 'none' }}
                >
                  ルールを保存
                </button>
                <button 
                  onClick={() => setShowRuleModal(false)}
                  style={{ padding: '8px 16px' }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
