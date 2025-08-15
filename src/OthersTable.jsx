import { useState, useEffect } from 'react';
import FullScreenModal from './FullScreenModal';
import { formatAmount } from './utils/currency.js';
import { useStore } from './state/StoreContextWithDB';

function OthersRow({ row, onAdd, isMobile, yenUnit, categories }) {
  const [cat, setCat] = useState(categories[0] || '');
  const [mode, setMode] = useState('contains');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (categories.length) {
      setCat(categories[0]);
    }
  }, [categories]);

  const submit = () => {
    onAdd(cat, mode);
    setOpen(false);
  };
  
  const handlePCSubmit = (e) => {
    e.stopPropagation();
    console.log('PC Button clicked - cat:', cat, 'mode:', mode);
    console.log('onAdd function:', onAdd);
    try {
      onAdd(cat, mode);
      console.log('onAdd called successfully');
    } catch (error) {
      console.error('Error calling onAdd:', error);
    }
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
            <button type="button" onClick={() => setOpen(true)}>ルール追加</button>
            <FullScreenModal
              open={open}
              onClose={() => setOpen(false)}
              title="ルール追加"
              primaryAction={<button onClick={submit}>追加</button>}
              secondaryAction={<button onClick={() => setOpen(false)}>キャンセル</button>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <select value={cat} onChange={e => setCat(e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={mode} onChange={e => setMode(e.target.value)} style={{ marginRight: 8 }}>
              <option value="contains">正規表現なし</option>
              <option value="regex">正規表現</option>
            </select>
            <button 
              type="button" 
              onClick={handlePCSubmit}
              style={{ cursor: 'pointer', padding: '4px 8px' }}
            >
              ルール追加
            </button>
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
 * 利用側では `dispatch({ type: 'setRules', payload: [...rules, newRule] })` を実行した後、
 * ルール画面の「データ反映」ボタンを押して取引に反映してください。
*/
export default function OthersTable({ rows, addRule, isMobile, kind, yenUnit }) {
  const { state } = useStore();
  const categories = state.categories;

  return (
    <table className='text-left' style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
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
              onAdd={(cat, mode) => addRule({
                pattern: row.name,
                mode,
                target: 'memo',
                category: cat,
                kind
              })}
              isMobile={isMobile}
              yenUnit={yenUnit}
              categories={categories}
            />
          ))
        )}
      </tbody>
    </table>
  );
}
