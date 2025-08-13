import { useEffect, useState, lazy, Suspense, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './App.css';
import { useStore } from './state/StoreContextWithDB.jsx';
import BarByMonth from './BarByMonth.jsx';
import NetBalance from './NetBalance.jsx';
import PieByCategory from './PieByCategory.jsx';
import { useSession, logout } from './useSession';
import Auth from './components/Auth.jsx';
import PasswordReset from './components/PasswordReset.jsx';

const Monthly = lazy(() => import('./pages/Monthly.jsx'));
const MonthlyAnalysis = lazy(() => import('./pages/MonthlyAnalysis.jsx'));
const Yearly = lazy(() => import('./pages/Yearly.jsx'));
const ImportCsv = lazy(() => import('./pages/ImportCsv.jsx'));
const Rules = lazy(() => import('./pages/Rules.jsx'));
const Transactions = lazy(() => import('./pages/Transactions.jsx'));
const Others = lazy(() => import('./pages/Others.jsx'));
const Prefs = lazy(() => import('./pages/Prefs.jsx'));

const NAV = {
  main: [
    { key: 'dashboard', label: 'ダッシュボード' },
    { key: 'monthly', label: '月次比較' },
    { key: 'analysis', label: '月次分析' },
    { key: 'yearly', label: '年間サマリ' },
  ],
  data: [
    { key: 'import', label: 'CSV取込' },
    { key: 'rules', label: '再分類ルール' },
    { key: 'others', label: 'その他集計' },
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
    kind: ['expense', 'income'].includes(params.get('kind'))
      ? params.get('kind')
      : undefined,
  };
}

function serializeHash({
  page,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  kind,
}) {
  const params = new URLSearchParams();
  params.set('period', period);
  params.set('unit', yenUnit);
  params.set('colors', lockColors ? '1' : '0');
  params.set('others', hideOthers ? '1' : '0');
  params.set('kind', kind);
  return `${page}?${params.toString()}`;
}

export default function App() {
  const { state, dispatch } = useStore();
  const { session, loading } = useSession();
  const isLocalMode = localStorage.getItem('localMode') === 'true';

  const isAuthenticated = session || isLocalMode;

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
      kind: localStorage.getItem('kind'),
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
      kind: h.kind || stored.kind || 'expense',
    };
  };
  const init = getInitial();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(init.page);
  const [period, setPeriod] = useState(init.period); // 3m|6m|1y|all
  const [yenUnit, setYenUnit] = useState(init.yenUnit); // yen|man
  const [lockColors, setLockColors] = useState(init.lockColors);
  const [hideOthers, setHideOthers] = useState(init.hideOthers);
  const [kind, setKind] = useState(init.kind);
  const burgerRef = useRef(null);
  const panelRef = useRef(null);
  const [needRefresh, setNeedRefresh] = useState(false);
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      setNeedRefresh(true);
    },
  });

  const loadDemo = async () => {
    try {
      const res = await fetch('/demo/sample.json');
      const data = await res.json();
      dispatch({ type: 'importTransactions', payload: data, append: false });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') {
      loadDemo();
    }
  }, []);

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
      if (h.kind) setKind(h.kind);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const hash = serializeHash({
      page,
      period,
      yenUnit,
      lockColors,
      hideOthers,
      kind,
    });
    if (window.location.hash.slice(1) !== hash) window.location.hash = hash;
    localStorage.setItem('page', page);
    localStorage.setItem('period', period);
    localStorage.setItem('yenUnit', yenUnit);
    localStorage.setItem('lockColors', lockColors ? '1' : '0');
    localStorage.setItem('hideOthers', hideOthers ? '1' : '0');
    localStorage.setItem('kind', kind);
  }, [page, period, yenUnit, lockColors, hideOthers, kind]);

  // ページ切替（モバイルは自動でドロワー閉）
  const go = k => {
    setPage(k);
    setOpen(false);
  };

  // ログアウト処理
  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      // Clear local storage
      localStorage.clear();
      // Reload the page to reset the app state
      window.location.reload();
    }
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

const NavItem = ({ active, onClick, children }) => (
  <button
    className={`nav-item ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    {children}
  </button>
);

function Dashboard({
  transactions,
  period,
  yenUnit,
  lockColors,
  hideOthers,
  kind,
  onToggleUnit,
  onToggleColors,
  onToggleOthers,
  onKindChange,
}) {
  return (
    <section>
      <div className="quick">
        <label>
          <input
            type="radio"
            name="kind"
            value="expense"
            checked={kind === 'expense'}
            onChange={() => onKindChange('expense')}
          />
          支出
        </label>

        <label>
          <input
            type="radio"
            name="kind"
            value="income"
            checked={kind === 'income'}
            onChange={() => onKindChange('income')}
          />
          収入
        </label>

        <label>
          <input
            type="checkbox"
            checked={yenUnit === 'man'}
            onChange={onToggleUnit}
          />
          円→万円
        </label>

        <label>
          <input
            type="checkbox"
            checked={lockColors}
            onChange={onToggleColors}
          />
          カテゴリ色固定
        </label>

        <label>
          <input
            type="checkbox"
            checked={hideOthers}
            onChange={onToggleOthers}
          />
          「その他」を除外
        </label>
      </div>

      <div className="card">
        <NetBalance
          transactions={transactions}
          period={period}
          yenUnit={yenUnit}
        />
      </div>

      <div className="card">
        <BarByMonth
          transactions={transactions}
          period={period}
          yenUnit={yenUnit}
          lockColors={lockColors}
          hideOthers={hideOthers}
          kind={kind}
          height={350}
        />
      </div>

      <div className="card">
        <PieByCategory
          transactions={transactions}
          period={period}
          yenUnit={yenUnit}
          lockColors={lockColors}
          hideOthers={hideOthers}
          kind={kind}
        />
      </div>
    </section>
  );
}

  
  // パスワードリセットのコールバック処理を確認
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const isPasswordReset = hashParams.get('type') === 'recovery' && hashParams.get('access_token');
  
  if (isPasswordReset) {
    return <PasswordReset />;
  }
  
  // ローディング中は何も表示しない
  if (loading && !isLocalMode) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#6b7280'
      }}>
        読み込み中...
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Auth onSkipAuth={() => window.location.reload()} />;
  }

  return (
    <div className='app-shell'>
      {/* ヘッダー */}
      <header className='header'>
        <div className='header-controls'>
          <select value={period} onChange={e => setPeriod(e.target.value)}>
            <option value='3m'>最近3ヶ月</option>
            <option value='6m'>半年</option>
            <option value='1y'>1年</option>
            <option value='all'>全期間</option>
          </select>
        </div>
        <div className='title'>家計簿カテゴリ管理</div>
        <button
          ref={burgerRef}
          className='burger'
          aria-label='menu'
          onClick={() => setOpen(true)}
        >
          ☰
        </button>
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
          {isAuthenticated && (
            <>
              <h4>アカウント</h4>
              {session ? (
                <button className='nav-item logout-btn' onClick={handleLogout}>
                  ログアウト
                </button>
              ) : (
                <button 
                  className='nav-item' 
                  onClick={() => {
                    localStorage.removeItem('localMode');
                    window.location.reload();
                  }}
                  style={{ color: '#3b82f6' }}
                >
                  クラウド同期に切り替え
                </button>
              )}
            </>
          )}
        </nav>
      </aside>

      {/* コンテンツ（ダッシュボードを最優先で表示） */}
      <main className='content'>
        {state.transactions.length === 0 && (
          <div className='card empty-banner'>
            <p>取引がありません。</p>
            <div className='actions'>
              <a href='#import' className='btn'>CSV取込へ</a>
              <button className='btn' onClick={loadDemo}>デモ読込</button>
            </div>
          </div>
        )}
        {page === 'dashboard' && (
          <Dashboard
            transactions={state.transactions}
            period={period}
            yenUnit={yenUnit}
            lockColors={lockColors}
            hideOthers={hideOthers}
            kind={kind}
            onToggleUnit={() => setYenUnit(v => (v === 'yen' ? 'man' : 'yen'))}
            onToggleColors={() => setLockColors(v => !v)}
            onToggleOthers={() => setHideOthers(v => !v)}
            onKindChange={setKind}
          />
        )}
        <Suspense fallback={<div>Loading...</div>}>
          {page === 'monthly' && (
            <>
              <div className='quick'>
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
              <Monthly
                transactions={state.transactions}
                period={period}
                yenUnit={yenUnit}
                lockColors={lockColors}
                hideOthers={hideOthers}
                kind={kind}
              />
            </>
          )}
          {page === 'analysis' && (
            <MonthlyAnalysis
              transactions={state.transactions}
              period={period}
              yenUnit={yenUnit}
              lockColors={lockColors}
              hideOthers={hideOthers}
            />
          )}
          {page === 'yearly' && (
            <>
              <div className='quick'>
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
              <Yearly
                transactions={state.transactions}
                period={period}
                yenUnit={yenUnit}
                lockColors={lockColors}
                hideOthers={hideOthers}
                kind={kind}
              />
            </>
          )}
          {page === 'import' && <ImportCsv />}
          {page === 'rules' && <Rules />}
          {page === 'others' && <Others yenUnit={yenUnit} />}
          {page === 'tx' && <Transactions />}
          {page === 'prefs' && <Prefs />}
        </Suspense>
      </main>

      {needRefresh && (
        <div className='pwa-refresh'>
          新しいバージョンがあります。
          <button onClick={() => updateServiceWorker(true)}>更新</button>
        </div>
      )}
      <footer className='footer'>
        MODE: {import.meta.env.MODE} / lastModified: {document.lastModified}
      </footer>

    </div>
  );
}
