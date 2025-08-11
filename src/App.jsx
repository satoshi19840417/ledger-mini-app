import { useEffect, useState, lazy, Suspense, useRef } from 'react';
import './App.css';
import { useStore } from './state/StoreContext.jsx';
import BarByMonth from './BarByMonth.jsx';
import PieByCategory from './PieByCategory.jsx';

const Monthly = lazy(() => import('./pages/Monthly.jsx'));
const Yearly = lazy(() => import('./pages/Yearly.jsx'));
const ImportCsv = lazy(() => import('./pages/ImportCsv.jsx'));
const Rules = lazy(() => import('./pages/Rules.jsx'));
const Transactions = lazy(() => import('./pages/Transactions.jsx'));
const Prefs = lazy(() => import('./pages/Prefs.jsx'));

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

const exists = k =>
  [...NAV.main, ...NAV.data, ...NAV.settings].some(i => i.key === k);

function parseHash(hash) {
  const [raw, q = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(q);
  return {
    page: exists(raw) ? raw : undefined,
    period: params.get('period') || undefined,
    yenUnit: params.get('unit') || undefined,
    lockColors:
      params.get('colors') !== null ? params.get('colors') === '1' : undefined,
    hideOthers:
      params.get('others') !== null ? params.get('others') === '1' : undefined,
  };
}

function serializeHash({
  page,
  period,
  yenUnit,
  lockColors,
  hideOthers,
}) {
  const params = new URLSearchParams();
  params.set('period', period);
  params.set('unit', yenUnit);
  params.set('colors', lockColors ? '1' : '0');
  params.set('others', hideOthers ? '1' : '0');
  return `${page}?${params.toString()}`;
}

export default function App() {
  const { state, dispatch } = useStore();
  const getInitial = () => {
    const h = parseHash(window.location.hash || '');
    const stored = {
      page: localStorage.getItem('page'),
      period: localStorage.getItem('period'),
      yenUnit: localStorage.getItem('yenUnit'),
      lockColors:
        localStorage.getItem('lockColors') !== null
          ? localStorage.getItem('lockColors') === '1'
          : undefined,
      hideOthers:
        localStorage.getItem('hideOthers') !== null
          ? localStorage.getItem('hideOthers') === '1'
          : undefined,
    };
    return {
      page: h.page || (exists(stored.page) ? stored.page : 'dashboard'),
      period: h.period || stored.period || '3m',
      yenUnit: h.yenUnit || stored.yenUnit || 'yen',
      lockColors:
        h.lockColors !== undefined
          ? h.lockColors
          : stored.lockColors !== undefined
          ? stored.lockColors
          : true,
      hideOthers:
        h.hideOthers !== undefined
          ? h.hideOthers
          : stored.hideOthers !== undefined
          ? stored.hideOthers
          : false,
    };
  };
  const init = getInitial();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(init.page);
  const [period, setPeriod] = useState(init.period); // 3m|6m|1y|all
  const [yenUnit, setYenUnit] = useState(init.yenUnit); // yen|man
  const [lockColors, setLockColors] = useState(init.lockColors);
  const [hideOthers, setHideOthers] = useState(init.hideOthers);
  const burgerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    dispatch({ type: 'applyRules' });
  }, [state.rules, state.transactions, dispatch]);

  useEffect(() => {
    const onHash = () => {
      const h = parseHash(window.location.hash || '');
      setPage(h.page || 'dashboard');
      if (h.period) setPeriod(h.period);
      if (h.yenUnit) setYenUnit(h.yenUnit);
      if (h.lockColors !== undefined) setLockColors(h.lockColors);
      if (h.hideOthers !== undefined) setHideOthers(h.hideOthers);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const hash = serializeHash({ page, period, yenUnit, lockColors, hideOthers });
    if (window.location.hash.slice(1) !== hash) window.location.hash = hash;
    localStorage.setItem('page', page);
    localStorage.setItem('period', period);
    localStorage.setItem('yenUnit', yenUnit);
    localStorage.setItem('lockColors', lockColors ? '1' : '0');
    localStorage.setItem('hideOthers', hideOthers ? '1' : '0');
  }, [page, period, yenUnit, lockColors, hideOthers]);

  // ページ切替（モバイルは自動でドロワー閉）
  const go = k => {
    setPage(k);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      burgerRef.current?.focus();
      return;
    }
    const panel = panelRef.current;
    const focusable = panel.querySelectorAll('button');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    const onKey = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === 'Tab') {
        if (focusable.length === 0) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = Array.from(focusable);
        const idx = items.indexOf(document.activeElement);
        if (idx !== -1) {
          const delta = e.key === 'ArrowDown' ? 1 : -1;
          const next = (idx + delta + items.length) % items.length;
          items[next].focus();
        }
      }
    };
    panel.addEventListener('keydown', onKey);
    return () => panel.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className='app-shell'>
      {/* ヘッダー */}
      <header className='header'>
        <button
          ref={burgerRef}
          className='burger'
          aria-label='menu'
          onClick={() => setOpen(true)}
        >
          ☰
        </button>
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
      <aside
        role='dialog'
        aria-label='メニュー'
        className={`drawer ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
      >
        <nav
          ref={panelRef}
          className='drawer-panel'
          onClick={e => e.stopPropagation()}
        >
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
            transactions={state.transactions}
            period={period}
            yenUnit={yenUnit}
            lockColors={lockColors}
            hideOthers={hideOthers}
            onToggleUnit={() => setYenUnit(v => (v === 'yen' ? 'man' : 'yen'))}
            onToggleColors={() => setLockColors(v => !v)}
            onToggleOthers={() => setHideOthers(v => !v)}
          />
        )}
        <Suspense fallback={<div>Loading...</div>}>
          {page === 'monthly' && (
            <Monthly
              transactions={state.transactions}
              period={period}
              yenUnit={yenUnit}
              lockColors={lockColors}
              hideOthers={hideOthers}
            />
          )}
          {page === 'yearly' && (
            <Yearly
              transactions={state.transactions}
              period={period}
              yenUnit={yenUnit}
              lockColors={lockColors}
              hideOthers={hideOthers}
            />
          )}
          {page === 'import' && <ImportCsv />}
          {page === 'rules' && <Rules />}
          {page === 'tx' && <Transactions />}
          {page === 'prefs' && <Prefs />}
        </Suspense>
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
function Dashboard({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  onToggleUnit,
  onToggleColors,
  onToggleOthers,
}) {
  return (
    <section>
      <div className='quick'>
        <label>
          <input type='checkbox' checked={yenUnit === 'man'} onChange={onToggleUnit} /> 円→万円
        </label>
        <label>
          <input type='checkbox' checked={lockColors} onChange={onToggleColors} /> カテゴリ色固定
        </label>
        <label>
          <input type='checkbox' checked={hideOthers} onChange={onToggleOthers} /> 「その他」を除外
        </label>
      </div>

      <div className='card'>
        <BarByMonth
          transactions={transactions}
          period={period}
          yenUnit={yenUnit}
          lockColors={lockColors}
          hideOthers={hideOthers}
        />
      </div>
      <div className='card'>
        <PieByCategory
          transactions={transactions}
          period={period}
          yenUnit={yenUnit}
          lockColors={lockColors}
          hideOthers={hideOthers}
        />
      </div>
    </section>
  );
}

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

