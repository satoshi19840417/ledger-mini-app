import { useEffect, useState, useRef } from 'react';
import { useStore } from '../state/StoreContext';

export default function Prefs() {
  const init = {
    period: localStorage.getItem('period') || '3m',
    yenUnit: localStorage.getItem('yenUnit') || 'yen',
    lockColors:
      localStorage.getItem('lockColors') !== null
        ? localStorage.getItem('lockColors') === '1'
        : true,
    hideOthers:
      localStorage.getItem('hideOthers') !== null
        ? localStorage.getItem('hideOthers') === '1'
        : false,
    kind: localStorage.getItem('kind') || 'expense',
  };

  const [period, setPeriod] = useState(init.period);
  const [yenUnit, setYenUnit] = useState(init.yenUnit);
  const [lockColors, setLockColors] = useState(init.lockColors);
  const [hideOthers, setHideOthers] = useState(init.hideOthers);
  const [kind, setKind] = useState(init.kind);

  const { state, dispatch } = useStore();
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const data = JSON.stringify(
      { transactions: state.transactions, rules: state.rules },
      null,
      2
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ledger-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json.transactions) {
        dispatch({
          type: 'importTransactions',
          payload: json.transactions,
          append: false,
        });
      }
      if (json.rules) {
        dispatch({ type: 'setRules', payload: json.rules });
      }
    } catch (err) {
      console.error('Import failed', err);
    }
    e.target.value = '';
  };

  const handleClear = () => {
    if (window.confirm('本当に全データを削除しますか？')) {
      dispatch({ type: 'clearAll' });
    }
  };

  useEffect(() => {
    localStorage.setItem('period', period);
    localStorage.setItem('yenUnit', yenUnit);
    localStorage.setItem('lockColors', lockColors ? '1' : '0');
    localStorage.setItem('hideOthers', hideOthers ? '1' : '0');
    localStorage.setItem('kind', kind);

    const params = new URLSearchParams();
    params.set('period', period);
    params.set('unit', yenUnit);
    params.set('colors', lockColors ? '1' : '0');
    params.set('others', hideOthers ? '1' : '0');
    params.set('kind', kind);
    window.location.hash = `prefs?${params.toString()}`;
  }, [period, yenUnit, lockColors, hideOthers, kind]);

  return (
    <section>
      <h2>設定</h2>
      <div className='card'>
        <form>
          <label>
            表示期間
            <select value={period} onChange={e => setPeriod(e.target.value)}>
              <option value='3m'>3ヶ月</option>
              <option value='6m'>半年</option>
              <option value='1y'>1年</option>
              <option value='all'>全期間</option>
            </select>
          </label>
          <label>
            金額単位
            <select value={yenUnit} onChange={e => setYenUnit(e.target.value)}>
              <option value='yen'>円</option>
              <option value='man'>万円</option>
            </select>
          </label>
          <label>
            <input
              type='checkbox'
              checked={lockColors}
              onChange={e => setLockColors(e.target.checked)}
            />
            カテゴリ色固定
          </label>
          <label>
            <input
              type='checkbox'
              checked={hideOthers}
              onChange={e => setHideOthers(e.target.checked)}
            />
            「その他」を除外
          </label>
          <div>
            表示種別
            <label>
              <input
                type='radio'
                name='kind'
                value='expense'
                checked={kind === 'expense'}
                onChange={() => setKind('expense')}
              />
              支出
            </label>
            <label>
              <input
                type='radio'
                name='kind'
                value='income'
                checked={kind === 'income'}
                onChange={() => setKind('income')}
              />
              収入
            </label>
          </div>
        </form>
      </div>
      <div className='card' style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type='button' onClick={handleExport}>
            データのエクスポート
          </button>
          <button type='button' onClick={handleImportClick}>
            データのインポート
          </button>
          <input
            type='file'
            accept='application/json'
            ref={fileInputRef}
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button type='button' onClick={handleClear}>
            データをすべて削除
          </button>
        </div>
      </div>
    </section>
  );
}
