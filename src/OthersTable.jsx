import { useState } from 'react';
import FullScreenModal from './FullScreenModal';
import { CATEGORIES } from './categories';
import { formatAmount } from './utils/currency.js';

function OthersRow({ row, onAdd, isMobile, yenUnit }) {
  const [cat, setCat] = useState('食費');
  const [mode, setMode] = useState('contains');
  const [open, setOpen] = useState(false);

  const submit = () => {
    onAdd(cat, mode);
    setOpen(false);
  };

  return (
    <tr>
      <td className="truncate" title={row.name} style={{ borderBottom: '1px solid #f0f0f0', padding: 6 }}>
        {row.name}
      </td>
      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 6 }}>
        {formatAmount(row.total, yenUnit)}
      </td>
      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 6 }}>
        {isMobile ? (
          <>
            <button onClick={() => setOpen(true)}>ルール追加</button>
            <FullScreenModal
              open={open}
              onClose={() => setOpen(false)}
              title="ルール追加"
              primaryAction={<button onClick={submit}>追加</button>}
              secondaryAction={<button onClick={() => setOpen(false)}>キャンセル</button>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <select value={cat} onChange={e => setCat(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={mode} onChange={e => setMode(e.target.value)}>
                  <option value="contains">正規表現なし</option>
                  <option value="regex">正規表現</option>
                </select>
              </div>
            </FullScreenModal>
          </>
        ) : (
          <>
            <select value={cat} onChange={e => setCat(e.target.value)} style={{ marginRight: 8 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={mode} onChange={e => setMode(e.target.value)} style={{ marginRight: 8 }}>
              <option value="contains">正規表現なし</option>
              <option value="regex">正規表現</option>
            </select>
            <button onClick={() => {
              console.log('Button clicked with:', cat, mode);
              onAdd(cat, mode);
            }}>ルール追加</button>
          </>
        )}
      </td>
      <td style={{ borderBottom: '1px solid #f0f0f0', padding: 6 }} />
    </tr>
  );
}

/**
 * @param {{
 *   rows: { name: string; total: number }[];
 *   addRule: (rule: import('./types').Rule) => void;
 *   isMobile: boolean;
 *   kind: 'income' | 'expense';
 *   yenUnit: 'yen' | 'man';
 * }} props
 * `addRule` は新しいルールを上位コンポーネントで保存するためのコールバック。
 * 利用側では `dispatch({ type: 'setRules', payload: [...rules, newRule] })`
 * および `dispatch({ type: 'applyRules' })` を実行する想定。
 */
export default function OthersTable({ rows, addRule, isMobile, kind, yenUnit }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left' }}>
          <th style={{ borderBottom: '1px solid #eee', padding: 6 }}>店舗/内容</th>
          <th style={{ borderBottom: '1px solid #eee', padding: 6, width: 140 }}>{kind === 'income' ? '収入合計' : '支出合計'}</th>
          <th style={{ borderBottom: '1px solid #eee', padding: 6, width: 260 }}>カテゴリに登録</th>
          <th style={{ borderBottom: '1px solid #eee', padding: 6, width: 100 }} />
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={4} style={{ padding: 16, color: '#666' }}>
              該当データがありません（期間や表示対象、フィルタを見直してください）
            </td>
          </tr>
        ) : (
          rows.map(row => (
            <OthersRow
              key={row.name}
              row={row}
              onAdd={(cat, mode) => {
                console.log('onAdd called with:', { cat, mode, rowName: row.name });
                addRule({
                  pattern: row.name,
                  mode,
                  target: 'memo',
                  category: cat,
                  kind
                });
              }}
              isMobile={isMobile}
              yenUnit={yenUnit}
            />
          ))
        )}
      </tbody>
    </table>
  );
}
