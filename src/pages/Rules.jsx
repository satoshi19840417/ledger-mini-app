import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../state/StoreContextWithDB';
/** @typedef {import('../types').Rule} Rule */

export default function Rules() {
  const { state, dispatch } = useStore();
  /** @type {Rule[]} */
  const rules = state.rules;
  const categories = state.categories;

  const [newRule, setNewRule] = useState({
    pattern: '',
    mode: 'contains',
    target: 'description',
    category: categories[0],
    kind: 'both',
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [editingRule, setEditingRule] = useState({});
  const [applyMessage, setApplyMessage] = useState('');
  const [sortBy, setSortBy] = useState('order'); // 'order' | 'category'

  // lastApplyResultの変更を監視
  useEffect(() => {
    if (state.lastApplyResult) {
      const { totalTransactions, changedTransactions } = state.lastApplyResult;
      setApplyMessage(
        changedTransactions > 0
          ? `✅ ${totalTransactions}件の取引中、${changedTransactions}件のカテゴリを更新しました`
          : `ℹ️ ${totalTransactions}件の取引を確認しましたが、変更はありませんでした`
      );
      const timer = setTimeout(() => setApplyMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [state.lastApplyResult]);

  const saveRules = updated => {
    dispatch({ type: 'setRules', payload: updated });
    dispatch({ type: 'applyRules' });
  };

  const addRule = e => {
    e.preventDefault();
    const updated = rules.concat(newRule);
    saveRules(updated);
    setNewRule({
      pattern: '',
      mode: 'contains',
      target: 'description',
      category: categories[0],
      kind: 'both',
    });
  };

  const deleteRule = idx => {
    const updated = rules.filter((_, i) => i !== idx);
    saveRules(updated);
  };

  const startEdit = idx => {
    setEditingIndex(idx);
    setEditingRule({ ...rules[idx] });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingRule({});
  };

  const saveEdit = idx => {
    const updated = [...rules];
    updated[idx] = editingRule;
    saveRules(updated);
    cancelEdit();
  };

  const moveRule = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= rules.length) return;
    const updated = [...rules];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    saveRules(updated);
  };

  // ソート済みのルールを取得
  const sortedRules = useMemo(() => {
    if (sortBy === 'category') {
      return [...rules].sort((a, b) => {
        // カテゴリでソート（同じカテゴリ内では元の順序を維持）
        if (a.category === b.category) {
          return rules.indexOf(a) - rules.indexOf(b);
        }
        return (a.category || '').localeCompare(b.category || '', 'ja');
      });
    }
    return rules; // 元の順序を維持
  }, [rules, sortBy]);

  return (
    <section>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h2>再分類ルール</h2>
        <button 
          onClick={() => {
            dispatch({ type: 'applyRules' });
            setApplyMessage('ルールを適用中...');
          }}
          disabled={state.transactions.length === 0}
          style={{
            opacity: state.transactions.length === 0 ? 0.5 : 1,
            cursor: state.transactions.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          データ反映
        </button>
      </div>
      {applyMessage && (
        <div style={{ 
          backgroundColor: '#4CAF50', 
          color: 'white', 
          padding: '8px', 
          borderRadius: '4px',
          marginTop: '8px',
          textAlign: 'center'
        }}>
          {applyMessage}
        </div>
      )}
      <div className='card'>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>（{rules.length}件のルール）</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setSortBy('order')}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                backgroundColor: sortBy === 'order' ? '#4CAF50' : '#e0e0e0',
                color: sortBy === 'order' ? 'white' : 'black',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              順序順
            </button>
            <button
              onClick={() => setSortBy('category')}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                backgroundColor: sortBy === 'category' ? '#4CAF50' : '#e0e0e0',
                color: sortBy === 'category' ? 'white' : 'black',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              カテゴリ順
            </button>
          </div>
        </div>
        <table className='text-left' style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className='text-left' style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ borderBottom: '2px solid #ddd', padding: 8, fontWeight: 'bold' }}>パターン</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: 8, fontWeight: 'bold' }}>モード</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: 8, fontWeight: 'bold' }}>対象</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: 8, fontWeight: 'bold', cursor: 'pointer', position: 'relative' }} onClick={() => setSortBy(sortBy === 'category' ? 'order' : 'category')}>
                カテゴリ
                {sortBy === 'category' && <span style={{ position: 'absolute', marginLeft: 4 }}>▼</span>}
              </th>
              <th style={{ borderBottom: '2px solid #ddd', padding: 8, fontWeight: 'bold' }}>種別</th>
              <th style={{ borderBottom: '2px solid #ddd', padding: 8, fontWeight: 'bold' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {sortedRules.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 8, color: '#666' }}>
                  ルールがありません
                </td>
              </tr>
            ) : (
              sortedRules.map((rule, idx) => {
                const originalIndex = rules.indexOf(rule);
                return (
                <tr key={idx} style={{ 
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9f9f9'
                }}>
                  {editingIndex === originalIndex ? (
                    <>
                      <td style={{ padding: 4 }}>
                        <input
                          type='text'
                          value={editingRule.pattern || ''}
                          onChange={e =>
                            setEditingRule(r => ({ ...r, pattern: e.target.value }))
                          }
                        />
                      </td>
                      <td style={{ padding: 4 }}>
                        <select
                          value={editingRule.mode || 'contains'}
                          onChange={e =>
                            setEditingRule(r => ({ ...r, mode: e.target.value }))
                          }
                        >
                          <option value='contains'>部分一致</option>
                          <option value='regex'>正規表現</option>
                        </select>
                      </td>
                      <td style={{ padding: 4 }}>
                        <select
                          value={editingRule.target || 'description'}
                          onChange={e =>
                            setEditingRule(r => ({ ...r, target: e.target.value }))
                          }
                        >
                          <option value='description'>説明</option>
                          <option value='detail'>詳細</option>
                          <option value='memo'>メモ</option>
                        </select>
                      </td>
                      <td style={{ padding: 4 }}>
                        <select
                          value={editingRule.category || categories[0]}
                          onChange={e =>
                            setEditingRule(r => ({ ...r, category: e.target.value }))
                          }
                        >
                          {categories.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: 4 }}>
                        <select
                          value={editingRule.kind || 'both'}
                          onChange={e =>
                            setEditingRule(r => ({ ...r, kind: e.target.value }))
                          }
                        >
                          <option value='both'>すべて</option>
                          <option value='expense'>支出のみ</option>
                          <option value='income'>収入のみ</option>
                        </select>
                      </td>
                      <td style={{ padding: 4, display: 'flex', gap: 4 }}>
                        <button onClick={() => saveEdit(originalIndex)}>保存</button>
                        <button onClick={cancelEdit}>取消</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: 4 }}>{rule.pattern || ''}</td>
                      <td style={{ padding: 4 }}>{rule.mode || ''}</td>
                      <td style={{ padding: 4 }}>{rule.target || ''}</td>
                      <td style={{ padding: 4 }}>{rule.category || ''}</td>
                      <td style={{ padding: 4 }}>{rule.kind || ''}</td>
                      <td style={{ padding: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {sortBy === 'order' && (
                          <>
                            <button onClick={() => moveRule(originalIndex, -1)} disabled={originalIndex === 0}>
                              ↑
                            </button>
                            <button
                              onClick={() => moveRule(originalIndex, 1)}
                              disabled={originalIndex === rules.length - 1}
                            >
                              ↓
                            </button>
                          </>
                        )}
                        <button onClick={() => startEdit(originalIndex)}>編集</button>
                        <button onClick={() => deleteRule(originalIndex)}>削除</button>
                      </td>
                    </>
                  )}
                </tr>
                );
              })
            )}
          </tbody>
        </table>

        <form
          onSubmit={addRule}
          className='text-left'
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 8,
            alignItems: 'center',
          }}
        >
          <input
            type='text'
            placeholder='パターン'
            value={newRule.pattern}
            onChange={e => setNewRule(r => ({ ...r, pattern: e.target.value }))}
          />
          <select
            value={newRule.mode}
            onChange={e => setNewRule(r => ({ ...r, mode: e.target.value }))}
          >
            <option value='contains'>部分一致</option>
            <option value='regex'>正規表現</option>
          </select>
          <select
            value={newRule.target}
            onChange={e => setNewRule(r => ({ ...r, target: e.target.value }))}
          >
            <option value='description'>説明</option>
            <option value='detail'>詳細</option>
            <option value='memo'>メモ</option>
          </select>
                        <select
                          value={newRule.category}
                          onChange={e => setNewRule(r => ({ ...r, category: e.target.value }))}
                        >
                          {categories.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
          <select
            value={newRule.kind}
            onChange={e => setNewRule(r => ({ ...r, kind: e.target.value }))}
          >
            <option value='both'>すべて</option>
            <option value='expense'>支出のみ</option>
            <option value='income'>収入のみ</option>
          </select>
          <button type='submit'>追加</button>
        </form>
      </div>
    </section>
  );
}
