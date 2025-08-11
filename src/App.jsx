import { useEffect, useState } from 'react';
import './App.css';

const NAV = {
  main: [
    { key: 'dashboard', label: 'ダッシュボード' },
    { key: 'monthly', label: '月次比較' },
    { key: 'yearly', label: '年間サマリ' },
  ],
  data: [
    { key: 'import', label: 'CSV取込' },
    { key: 'rules', label: '再分類ルール' },
    { key: 'tx', label: '取引一覧' },
  ],
  settings: [{ key: 'prefs', label: '設定' }],
};

export default function App() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [period, setPeriod] = useState('3m'); // 3m|6m|1y|all
  const [yenUnit, setYenUnit] = useState('yen'); // yen|man
  const [lockColors, setLockColors] = useState(true);
  const [hideOthers, setHideOthers] = useState(false);

  // URLハッシュと同期
  useEffect(() => {
    const initial = window.location.hash?.slice(1);
    if (initial && exists(initial)) setPage(initial);
    const onHash = () => {
      const h = window.location.hash?.slice(1);
      if (exists(h)) setPage(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (page) window.location.hash = page;
  }, [page]);
  const exists = k =>
    [...NAV.main, ...NAV.data, ...NAV.settings].some(i => i.key === k);

  // ページ切替（モバイルは自動でドロワー閉）
  const go = k => {
    setPage(k);
    setOpen(false);
  };

  return (
    <div className='app-shell'>
      {/* ヘッダー */}
      <header className='header'>
        <button className='burger' aria-label='menu' onClick={() => setOpen(true)}>☰</button>
        <div className='title'>家計簿カテゴリ管理</div>
        <div className='header-controls'>
          <select value={period} onChange={e => setPeriod(e.target.value)}>
            <option value='3m'>最近3ヶ月</option>
            <option value='6m'>半年</option>
            <option value='1y'>1年</option>
            <option value='all'>全期間</option>
          </select>
        </div>
      </header>

      {/* ドロワー */}
      <aside className={`drawer ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <nav className='drawer-panel' onClick={e => e.stopPropagation()}>
          <h4>メイン</h4>
          {NAV.main.map(i => (
            <NavItem key={i.key} active={page === i.key} onClick={() => go(i.key)}>{i.label}</NavItem>
          ))}
          <h4>データ</h4>
          {NAV.data.map(i => (
            <NavItem key={i.key} active={page === i.key} onClick={() => go(i.key)}>{i.label}</NavItem>
          ))}
          <h4>設定</h4>
          {NAV.settings.map(i => (
            <NavItem key={i.key} active={page === i.key} onClick={() => go(i.key)}>{i.label}</NavItem>
          ))}
        </nav>
      </aside>

      {/* コンテンツ（ダッシュボードを最優先で表示） */}
      <main className='content'>
        {page === 'dashboard' && (
          <Dashboard
            period={period}
            yenUnit={yenUnit}
            lockColors={lockColors}
            hideOthers={hideOthers}
            onToggleUnit={() => setYenUnit(v => (v === 'yen' ? 'man' : 'yen'))}
            onToggleColors={() => setLockColors(v => !v)}
            onToggleOthers={() => setHideOthers(v => !v)}
          />
        )}
        {page === 'monthly' && <Monthly />}
        {page === 'yearly' && <Yearly />}
        {page === 'import' && <ImportCsv />}
        {page === 'rules' && <Rules />}
        {page === 'tx' && <Transactions />}
        {page === 'prefs' && <Prefs />}
      </main>

      {/* 最小限のスタイル（既存CSSに合わせて調整可） */}
      <style>{css}</style>
    </div>
  );
}

function NavItem({ active, onClick, children }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

// ====== ページ雛形（既存の中身をはめ込んでください） ======
function Dashboard({ period, yenUnit, lockColors, hideOthers, onToggleUnit, onToggleColors, onToggleOthers }) {
  return (
    <section>
      <h2>ダッシュボード</h2>
      <div className='quick'>
        <label><input type='checkbox' checked={yenUnit === 'man'} onChange={onToggleUnit} /> 万円表示</label>
        <label><input type='checkbox' checked={lockColors} onChange={onToggleColors} /> カテゴリ色固定</label>
        <label><input type='checkbox' checked={hideOthers} onChange={onToggleOthers} /> 「その他」を除外</label>
        <span className='pill'>期間: {period}</span>
      </div>

      <div className='card'>（棒グラフをここに：既存のコンポーネントを貼付）</div>
      <div className='card'>（円グラフをここに：既存のコンポーネントを貼付）</div>
    </section>
  );
}
function Monthly(){ return <section><h2>月次比較</h2><div className='card'>（棒/折れ線 既存グラフ）</div></section>; }
function Yearly(){ return <section><h2>年間サマリ</h2><div className='card'>（円/ツリー 既存グラフ）</div></section>; }
function ImportCsv(){ return <section><h2>CSV取込</h2><div className='card'>（既存のアップローダ）</div></section>; }
function Rules(){ return <section><h2>再分類ルール</h2><div className='card'>（既存のルール表）</div></section>; }
function Transactions(){ return <section><h2>取引一覧</h2><div className='card'>（検索・絞り込み）</div></section>; }
function Prefs(){ return <section><h2>設定</h2><div className='card'>（表示設定ほか）</div></section>; }

const css = `
:root { --bg:#fff; --fg:#222; --muted:#666; --line:#eee; }
*{box-sizing:border-box} body{margin:0}
.app-shell{min-height:100svh;background:var(--bg);color:var(--fg)}
.header{position:sticky;top:0;display:flex;gap:.75rem;align-items:center;justify-content:space-between;padding:.75rem 1rem;border-bottom:1px solid var(--line);background:var(--bg);z-index:20}
.title{font-weight:600}
.burger{font-size:1.1rem;padding:.4rem .6rem;border:1px solid var(--line);background:#fafafa;border-radius:.5rem}
.header-controls select{padding:.4rem .6rem;border:1px solid var(--line);border-radius:.5rem}
.content{max-width:1100px;margin:1rem auto;padding:0 1rem;display:grid;gap:1rem}
.card{border:1px solid var(--line);border-radius:.75rem;padding:1rem;background:#fff}
.quick{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;margin-bottom:.5rem}
.quick label{display:flex;gap:.4rem;align-items:center;font-size:.92rem;color:var(--muted)}
.pill{padding:.2rem .6rem;border:1px solid var(--line);border-radius:999px;font-size:.8rem;color:var(--muted)}
.drawer{position:fixed;inset:0;display:none;background:rgba(0,0,0,.2)}
.drawer.open{display:block}
.drawer-panel{position:absolute;inset:0 auto 0 0;width:min(82vw,320px);background:#fff;border-right:1px solid var(--line);padding:1rem;overflow:auto}
.drawer-panel h4{margin:.75rem 0 .25rem;color:var(--muted);font-weight:600;font-size:.85rem}
.nav-item{display:block;width:100%;text-align:left;padding:.6rem .7rem;margin:.15rem 0;border:1px solid transparent;border-radius:.6rem}
.nav-item:hover{background:#fafafa}
.nav-item.active{background:#f3f6ff;border-color:#dfe8ff}
@media(min-width:1024px){
  .drawer{display:block;background:transparent;position:sticky;inset:auto}
  .drawer-panel{position:fixed;left:0;top:0;bottom:0}
  .content{margin-left:min(82vw,320px)}
}
`;

