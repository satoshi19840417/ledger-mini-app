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
  const unclassifiedCount = txs.filter(tx => !tx.category).length;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [editedCategories, setEditedCategories] = useState({});
  const [excludeCardPayments, setExcludeCardPayments] = useState(true);
  const [showUnclassifiedOnly, setShowUnclassifiedOnly] = useState(false);
  const [ruleAppliedMessage, setRuleAppliedMessage] = useState('');
  const [newRule, setNewRule] = useState({
    pattern: '',
    mode: 'contains',
    target: 'description',
    category: CATEGORIES[0],
    kind: 'both',
  });

  const filtered = useMemo(() => {
    return txs.filter(tx => {
      if (showUnclassifiedOnly && tx.category) return false;
      if (
        excludeCardPayments &&
        (tx.category === 'カード支払い' || tx.category === 'カード払い')
      )
        return false;
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      if (categories.length && !categories.includes(tx.category)) return false;
      if (categoryQuery) {
        const c = (tx.category || '').toLowerCase();
        if (!c.includes(categoryQuery.toLowerCase())) return false;
      }
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
  }, [txs, startDate, endDate, categories, categoryQuery, keyword, minAmount, maxAmount, type, excludeCardPayments, showUnclassifiedOnly]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, categories, categoryQuery, keyword, minAmount, maxAmount, type, excludeCardPayments, showUnclassifiedOnly]);

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
    // ルール保存後、自動的に未分類の取引にルールを適用
    setRuleAppliedMessage('ルールを保存し、全取引に適用しています...');
    setTimeout(() => {
      dispatch({ type: 'applyRules' });
      setRuleAppliedMessage('ルールが適用されました');
      setTimeout(() => setRuleAppliedMessage(''), 3000);
    }, 100);
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

  const handleCategoryChange = (txId, newCategory) => {
    setEditedCategories(prev => ({
      ...prev,
      [txId]: newCategory
    }));
  };

  const applyEditedCategories = () => {
    if (Object.keys(editedCategories).length === 0) return;
    
    const updatedTxs = state.transactions.map(tx => {
      if (editedCategories[tx.id]) {
        return { ...tx, category: editedCategories[tx.id] };
      }
      return tx;
    });
    
    dispatch({ type: 'importTransactions', payload: updatedTxs, append: false });
    setEditedCategories({});
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategories([]);
    setCategoryQuery('');
    setKeyword('');
    setMinAmount('');
    setMaxAmount('');
    setType('all');
    setExcludeCardPayments(false);
    setShowUnclassifiedOnly(false);
    setPage(1);
  };

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">取引一覧</h1>
      {ruleAppliedMessage && (
        <div style={{ 
          backgroundColor: '#4CAF50', 
          color: 'white', 
          padding: '12px', 
          borderRadius: '4px',
          marginBottom: '16px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          {ruleAppliedMessage}
        </div>
      )}
      <div className='card'>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>（{filtered.length} 件の取引）</span>
            {!showUnclassifiedOnly && unclassifiedCount > 0 && (
              <button
                onClick={() => setShowUnclassifiedOnly(true)}
                style={{
                  padding: '4px 12px',
                  background: '#ff5722',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}
              >
                未分類 {unclassifiedCount}件を表示
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.keys(editedCategories).length > 0 && (
              <button 
                onClick={applyEditedCategories}
                style={{ 
                  background: '#4caf50', 
                  color: '#fff',
                  fontWeight: 'bold'
                }}
              >
                変更を保存 ({Object.keys(editedCategories).length}件)
              </button>
            )}
            <button onClick={exportCsv}>CSV出力</button>
            <button onClick={exportExcel}>Excel出力</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, alignItems: 'center' }}>
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
            placeholder='カテゴリ検索'
            value={categoryQuery}
            onChange={e => setCategoryQuery(e.target.value)}
          />
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type='checkbox'
              checked={excludeCardPayments}
              onChange={(e) => setExcludeCardPayments(e.target.checked)}
            />
            <span>カード支払い除外</span>
          </label>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4,
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: showUnclassifiedOnly ? '#fff3e0' : 'transparent',
            border: showUnclassifiedOnly ? '2px solid #ff5722' : '1px solid transparent'
          }}>
            <input
              type='checkbox'
              checked={showUnclassifiedOnly}
              onChange={(e) => setShowUnclassifiedOnly(e.target.checked)}
            />
            <span style={{ 
              fontWeight: showUnclassifiedOnly ? 'bold' : 'normal',
              color: showUnclassifiedOnly ? '#ff5722' : 'inherit'
            }}>
              未分類のみ {unclassifiedCount > 0 && `(${unclassifiedCount}件)`}
            </span>
          </label>
          <button 
            onClick={clearFilters}
            style={{ 
              padding: '6px 12px',
              background: '#f44336',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            条件クリア
          </button>
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ textAlign: 'left', backgroundColor: '#f0f0f0' }}>
              <th style={{ borderBottom: '2px solid #ddd', padding: 8, whiteSpace: 'nowrap', fontWeight: 'bold' }}>日付</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: 8, whiteSpace: 'nowrap', fontWeight: 'bold' }}>カテゴリ</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: 8, whiteSpace: 'nowrap', fontWeight: 'bold' }}>金額</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: 8, minWidth: '150px', fontWeight: 'bold' }}>内容</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: 8, minWidth: '100px', fontWeight: 'bold' }}>メモ</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: 8, whiteSpace: 'nowrap', fontWeight: 'bold' }}>操作</th>
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
                <tr key={idx} style={{ 
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9f9f9'
                }}>
                  <td style={{ padding: 6 }}>{tx.date}</td>
                  <td style={{ padding: 6 }}>
                    <select
                      value={editedCategories[tx.id] || tx.category || ''}
                      onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                      style={{ 
                        width: '100%',
                        padding: '2px 4px',
                        background: editedCategories[tx.id] ? '#fffbf0' : '#fff',
                        border: editedCategories[tx.id] ? '1px solid #ff9800' : '1px solid #ddd'
                      }}
                    >
                      <option value="">未分類</option>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 6, textAlign: 'right' }}>
                    {tx.amount.toLocaleString()}
                  </td>
                  <td style={{ padding: 6 }}>{tx.description || tx.detail || ''}</td>
                  <td style={{ padding: 6 }}>{tx.memo || ''}</td>
                  <td style={{ padding: 6 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button 
                        type="button"
                        onClick={() => openRuleModal(tx)}
                        style={{ 
                          fontSize: '0.85rem', 
                          padding: '4px 8px',
                          cursor: 'pointer',
                          backgroundColor: '#fff',
                          border: '1px solid #ccc',
                          borderRadius: '4px'
                        }}
                      >
                        ルール作成
                      </button>
                      {editedCategories[tx.id] && (
                        <button 
                          type="button"
                          onClick={() => {
                            const updatedTxs = state.transactions.map(t => 
                              t.id === tx.id ? { ...t, category: editedCategories[tx.id] } : t
                            );
                            dispatch({ type: 'importTransactions', payload: updatedTxs, append: false });
                            setEditedCategories(prev => {
                              const newState = { ...prev };
                              delete newState[tx.id];
                              return newState;
                            });
                          }}
                          style={{ 
                            fontSize: '0.85rem', 
                            padding: '4px 8px',
                            cursor: 'pointer',
                            backgroundColor: '#4caf50',
                            color: '#fff',
                            border: '1px solid #4caf50',
                            borderRadius: '4px'
                          }}
                        >
                          データ反映
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

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
