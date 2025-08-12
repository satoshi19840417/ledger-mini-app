import { useState } from 'react';
import { useStore } from '../state/StoreContext';
import { CATEGORIES } from '../categories';
/** @typedef {import('../types').Rule} Rule */

export default function Rules() {
  const { state, dispatch } = useStore();
  /** @type {Rule[]} */
  const rules = state.rules;

  const [newRule, setNewRule] = useState({
    pattern: '',
    mode: 'contains',
    target: 'description',
    category: CATEGORIES[0],
    kind: 'both',
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [editingRule, setEditingRule] = useState({});

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
      category: CATEGORIES[0],
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

  return (
    <section>
      <h2>再分類ルール</h2>
      <div className='card'>
        <div style={{ marginBottom: 16 }}>
          <p style={{ marginBottom: 8 }}>ルールは JSON 形式で定義します。例:</p>
          <pre
            style={{
              background: '#f8f8f8',
              padding: 8,
              overflowX: 'auto',
              marginBottom: 8,
            }}
          >
{`[
  { "pattern": "スタバ", "mode": "contains", "target": "detail", "kind": "expense", "category": "カフェ" },
  { "regex": "Salary\\s*Payment", "flags": "i", "mode": "regex", "target": "description", "kind": "income", "category": "給与" }
]`}
          </pre>
          <table style={{ fontSize: '0.9em', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 4 }}>キー</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 4 }}>説明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: 4 }}>pattern</td>
                <td style={{ padding: 4 }}>説明などに含まれる文字列を部分一致で検索します</td>
              </tr>
              <tr>
                <td style={{ padding: 4 }}>regex</td>
                <td style={{ padding: 4 }}>正規表現パターン</td>
              </tr>
              <tr>
                <td style={{ padding: 4 }}>flags</td>
                <td style={{ padding: 4 }}>正規表現のフラグ (例: i)</td>
              </tr>
              <tr>
                <td style={{ padding: 4 }}>keyword</td>
                <td style={{ padding: 4 }}>pattern/regex が無い場合に用いるキーワード</td>
              </tr>
              <tr>
                <td style={{ padding: 4 }}>mode</td>
                <td style={{ padding: 4 }}>'contains' または 'regex' のマッチ方法</td>
              </tr>
              <tr>
                <td style={{ padding: 4 }}>target</td>
                <td style={{ padding: 4 }}>評価対象フィールド ('description'/'detail'/'memo')</td>
              </tr>
              <tr>
                <td style={{ padding: 4 }}>kind</td>
                <td style={{ padding: 4 }}>適用対象の取引種別 ('expense'/'income'/'both')</td>
              </tr>
              <tr>
                <td style={{ padding: 4 }}>category</td>
                <td style={{ padding: 4 }}>条件に一致したときに設定するカテゴリ</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginBottom: 8 }}>（{rules.length}件のルール）</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={{ borderBottom: '1px solid #eee', padding: 4 }}>パターン</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 4 }}>モード</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 4 }}>対象</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 4 }}>カテゴリ</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 4 }}>種別</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 4 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 8, color: '#666' }}>
                  ルールがありません
                </td>
              </tr>
            ) : (
              rules.map((rule, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  {editingIndex === idx ? (
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
                          <option value='contains'>contains</option>
                          <option value='regex'>regex</option>
                        </select>
                      </td>
                      <td style={{ padding: 4 }}>
                        <select
                          value={editingRule.target || 'description'}
                          onChange={e =>
                            setEditingRule(r => ({ ...r, target: e.target.value }))
                          }
                        >
                          <option value='description'>description</option>
                          <option value='detail'>detail</option>
                          <option value='memo'>memo</option>
                        </select>
                      </td>
                      <td style={{ padding: 4 }}>
                        <select
                          value={editingRule.category || CATEGORIES[0]}
                          onChange={e =>
                            setEditingRule(r => ({ ...r, category: e.target.value }))
                          }
                        >
                          {CATEGORIES.map(c => (
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
                          <option value='both'>both</option>
                          <option value='expense'>expense</option>
                          <option value='income'>income</option>
                        </select>
                      </td>
                      <td style={{ padding: 4, display: 'flex', gap: 4 }}>
                        <button onClick={() => saveEdit(idx)}>保存</button>
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
                        <button onClick={() => moveRule(idx, -1)} disabled={idx === 0}>
                          ↑
                        </button>
                        <button
                          onClick={() => moveRule(idx, 1)}
                          disabled={idx === rules.length - 1}
                        >
                          ↓
                        </button>
                        <button onClick={() => startEdit(idx)}>編集</button>
                        <button onClick={() => deleteRule(idx)}>削除</button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        <form
          onSubmit={addRule}
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
            placeholder='pattern'
            value={newRule.pattern}
            onChange={e => setNewRule(r => ({ ...r, pattern: e.target.value }))}
          />
          <select
            value={newRule.mode}
            onChange={e => setNewRule(r => ({ ...r, mode: e.target.value }))}
          >
            <option value='contains'>contains</option>
            <option value='regex'>regex</option>
          </select>
          <select
            value={newRule.target}
            onChange={e => setNewRule(r => ({ ...r, target: e.target.value }))}
          >
            <option value='description'>description</option>
            <option value='detail'>detail</option>
            <option value='memo'>memo</option>
          </select>
          <select
            value={newRule.category}
            onChange={e => setNewRule(r => ({ ...r, category: e.target.value }))}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={newRule.kind}
            onChange={e => setNewRule(r => ({ ...r, kind: e.target.value }))}
          >
            <option value='both'>both</option>
            <option value='expense'>expense</option>
            <option value='income'>income</option>
          </select>
          <button type='submit'>追加</button>
        </form>
      </div>
    </section>
  );
}
