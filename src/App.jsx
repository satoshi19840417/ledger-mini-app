import { useEffect, useState, lazy, Suspense, useRef, useMemo } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './App.css';
import { useStore } from './state/StoreContextWithDB.jsx';
import BarByMonth from './BarByMonth.jsx';
import NetBalance from './NetBalance.jsx';
import NetBalanceLineChart from './NetBalanceLineChart.jsx';
import PieByCategory from './PieByCategory.jsx';
import { useSession, logout } from './useSession';
import Auth from './components/Auth.jsx';
import PasswordReset from './components/PasswordReset.jsx';
import AmountVisual from './components/ui/AmountVisual.jsx';
import ToggleButton from './components/ui/ToggleButton.jsx';
import SegmentControl from './components/ui/SegmentControl.jsx';

// shadcn/ui components
import { Button } from './components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card.jsx';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from './components/ui/badge.jsx';

// Lucide icons
import { 
  BarChart3, 
  TrendingUp, 
  Search, 
  Calendar, 
  Upload, 
  Download, 
  Trash2, 
  FileText, 
  CreditCard, 
  Tag, 
  Settings as SettingsIcon, 
  User, 
  Palette, 
  Menu, 
  LogOut, 
  RefreshCw, 
  Cloud 
} from 'lucide-react';

const Monthly = lazy(() => import('./pages/Monthly.jsx'));
const MonthlyAnalysis = lazy(() => import('./pages/MonthlyAnalysis.jsx'));
const Yearly = lazy(() => import('./pages/Yearly.jsx'));
const ImportCsv = lazy(() => import('./pages/ImportCsv.jsx'));
const ExportCsv = lazy(() => import('./pages/ExportCsv.jsx'));
const DataCleanup = lazy(() => import('./pages/DataCleanup.jsx'));
const Rules = lazy(() => import('./pages/Rules.jsx'));
const Transactions = lazy(() => import('./pages/Transactions.jsx'));
const Others = lazy(() => import('./pages/Others.jsx'));
const Prefs = lazy(() => import('./pages/Prefs.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Categories = lazy(() => import('./pages/Categories.jsx'));

const NAV = {
  main: [
    { key: 'dashboard', label: 'ダッシュボード', icon: BarChart3 },
    { key: 'monthly', label: '月次比較', icon: TrendingUp },
    { key: 'analysis', label: '月次分析', icon: Search },
    { key: 'yearly', label: '年間サマリ', icon: Calendar },
  ],
  data: [
    { key: 'import', label: 'CSV取込', icon: Upload },
    { key: 'export', label: 'CSVエクスポート', icon: Download },
    { key: 'cleanup', label: 'データクリーンアップ', icon: Trash2 },
    { key: 'rules', label: '再分類ルール', icon: FileText },
    { key: 'others', label: 'その他集計', icon: FileText },
    { key: 'tx', label: '取引一覧', icon: CreditCard },
    { key: 'categories', label: 'カテゴリ管理', icon: Tag },
  ],
  settings: [
    { key: 'prefs', label: '設定', icon: SettingsIcon },
    { key: 'settings', label: 'アカウント設定', icon: User }
  ],
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
  const { state, dispatch, loadFromDatabase } = useStore();
  const { session, loading } = useSession();
  const isLocalMode = localStorage.getItem('localMode') === 'true';
  const [syncing, setSyncing] = useState(false);

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
  
  // 集計対象外を除外したトランザクション
  const filteredTransactionsForAnalysis = useMemo(() => {
    return state.transactions.filter(tx => !tx.excludeFromTotals);
  }, [state.transactions]);

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
    console.log('ログアウトボタンがクリックされました');
    try {
      // ローカルモードの場合は直接クリアしてリロード
      if (localStorage.getItem('localMode') === 'true') {
        console.log('ローカルモードでのログアウト');
        localStorage.clear();
        window.location.reload();
        return;
      }
      
      // Supabase認証のログアウト
      const success = await logout();
      console.log('ログアウト結果:', success);
      if (success) {
        console.log('ローカルストレージをクリアします');
        // Clear local storage
        localStorage.clear();
        // Reload the page to reset the app state
        console.log('ページをリロードします');
        window.location.reload();
      } else {
        console.error('ログアウトに失敗しました');
        // 失敗してもローカルストレージをクリアしてリロード
        localStorage.clear();
        window.location.reload();
      }
    } catch (error) {
      console.error('ログアウトエラー:', error);
      // エラーが発生してもローカルストレージをクリアしてリロード
      localStorage.clear();
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

const NavItem = ({ active, onClick, icon: Icon, children }) => (
  <Button
    variant={active ? "secondary" : "ghost"}
    className="w-full justify-start gap-2 h-auto py-3 px-4 text-gray-700 hover:text-gray-900"
    style={{ color: active ? '#1f2937' : '#4b5563' }}
    onClick={onClick}
  >
    <Icon className="h-4 w-4" />
    {children}
  </Button>
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
  const [excludeCardPayments, setExcludeCardPayments] = useState(true);
  const [excludeRent, setExcludeRent] = useState(false);
  
  // カード支払いと家賃を除外するかどうかでフィルタリング
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    // 集計対象外を除外
    filtered = filtered.filter(tx => !tx.excludeFromTotals);
    if (excludeCardPayments) {
      filtered = filtered.filter(
        tx => tx.category !== 'カード支払い' && tx.category !== 'カード払い'
      );
    }
    if (excludeRent) {
      filtered = filtered.filter(
        tx => tx.category !== '家賃'
      );
    }
    return filtered;
  }, [transactions, excludeCardPayments, excludeRent]);
  
  // 収支計算
  const monthMap = {};
  filteredTransactions.forEach((tx) => {
    const month = tx.date.slice(0, 7);
    monthMap[month] = true;
  });
  const months = Object.keys(monthMap).sort();
  const limitMap = { '3m': 3, '6m': 6, '1y': 12, all: months.length };
  const limit = limitMap[period] || months.length;
  const recentMonths = new Set(months.slice(-limit));
  const recent = filteredTransactions.filter((tx) => recentMonths.has(tx.date.slice(0, 7)));
  
  const incomeTotal = recent
    .filter((tx) => tx.kind === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const expenseTotal = recent
    .filter((tx) => tx.kind === 'expense')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const netBalance = incomeTotal - expenseTotal;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <Badge variant="outline" className="text-sm">
          {period === '3m' ? '最近3ヶ月' : period === '6m' ? '半年' : period === '1y' ? '1年' : '全期間'}
        </Badge>
      </div>
      
      {/* セグメントコントロールで収支切り替え */}
      <Card>
        <CardContent className="pt-6">
          <SegmentControl
            options={[
              { value: 'expense', label: '支出', icon: '💰' },
              { value: 'income', label: '収入', icon: '💵' }
            ]}
            value={kind}
            onChange={onKindChange}
            size="lg"
          />
        </CardContent>
      </Card>
      
      {/* トグルボタン群 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">表示オプション</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <ToggleButton
              icon={yenUnit === 'man' ? '万' : '円'}
              tooltip={yenUnit === 'man' ? '万円表示' : '円表示'}
              active={yenUnit === 'man'}
              onClick={onToggleUnit}
              variant="primary"
            />
            <ToggleButton
              icon="🎨"
              tooltip="カテゴリ色固定"
              active={lockColors}
              onClick={onToggleColors}
            />
            <ToggleButton
              icon="🚫"
              tooltip="その他を除外"
              active={hideOthers}
              onClick={onToggleOthers}
            />
            <ToggleButton
              icon="💳"
              tooltip="カード支払いを除外"
              active={excludeCardPayments}
              onClick={() => setExcludeCardPayments(!excludeCardPayments)}
              variant="success"
            />
            <ToggleButton
              icon="🏠"
              tooltip="家賃を除外"
              active={excludeRent}
              onClick={() => setExcludeRent(!excludeRent)}
              variant="danger"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* 収支サマリー with AmountVisual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <AmountVisual
              amount={incomeTotal}
              label="収入合計"
              isIncome={true}
              showBar={true}
              maxAmount={1000000}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <AmountVisual
              amount={-expenseTotal}
              label="支出合計"
              isIncome={false}
              showBar={true}
              maxAmount={1000000}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <AmountVisual
              amount={netBalance}
              label="収支バランス"
              showBar={false}
            />
          </CardContent>
        </Card>
      </div>

      {/* グラフカード群 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              収支推移
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NetBalanceLineChart
              transactions={filteredTransactions}
              period={period}
              yenUnit={yenUnit}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              カテゴリ別内訳
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieByCategory
              transactions={filteredTransactions}
              period={period}
              yenUnit={yenUnit}
              lockColors={lockColors}
              hideOthers={hideOthers}
              kind={kind}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            月別推移
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <BarByMonth
              transactions={filteredTransactions}
              period={period}
              yenUnit={yenUnit}
              lockColors={lockColors}
              hideOthers={hideOthers}
              kind={kind}
              height={350}
            />
          </div>
        </CardContent>
      </Card>
    </div>
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
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">最近3ヶ月</SelectItem>
              <SelectItem value="6m">半年</SelectItem>
              <SelectItem value="1y">1年</SelectItem>
              <SelectItem value="all">全期間</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='title'>
          <span>家計簿カテゴリ管理</span>
        </div>
        <Button
          ref={burgerRef}
          className='burger'
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* ドロワー */}
      <Sheet open={open} onOpenChange={setOpen}>

        <SheetContent ref={panelRef} side="right" className="w-80 overflow-y-auto bg-white">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-gray-900">
                  <BarChart3 className="h-5 w-5" />
                  メニュー
                </SheetTitle>
                {state.profile?.display_name && (
                  <div className="text-sm text-gray-600">
                    {state.profile.display_name}
                  </div>
                )}
              </SheetHeader>
              
              <div className="space-y-6 mt-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-600 px-2">メイン</h4>
                  <div className="space-y-1">
                    {NAV.main.map(i => (
                      <NavItem key={i.key} active={page === i.key} onClick={() => go(i.key)} icon={i.icon}>{i.label}</NavItem>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-600 px-2">データ</h4>
                  <div className="space-y-1">
                    {NAV.data.map(i => (
                      <NavItem key={i.key} active={page === i.key} onClick={() => go(i.key)} icon={i.icon}>{i.label}</NavItem>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-600 px-2">設定</h4>
                  <div className="space-y-1">
                    {NAV.settings.map(i => (
                      <NavItem key={i.key} active={page === i.key} onClick={() => go(i.key)} icon={i.icon}>{i.label}</NavItem>
                    ))}
                  </div>
                </div>
                
                {isAuthenticated && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600 px-2">アカウント</h4>
                    <div className="space-y-1">
                      {session ? (
                        <>
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2 h-auto py-3 px-4 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleLogout();
                            }}
                          >
                            <LogOut className="h-4 w-4" />
                            ログアウト
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2 h-auto py-3 px-4 text-emerald-600 hover:text-emerald-600"
                            disabled={syncing}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSyncing(true);
                              try {
                                await loadFromDatabase();
                                alert('データを同期しました');
                              } catch (error) {
                                console.error('Sync error:', error);
                                alert('同期に失敗しました');
                              } finally {
                                setSyncing(false);
                                setOpen(false);
                              }
                            }}
                          >
                            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? '同期中...' : 'データを同期'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2 h-auto py-3 px-4 text-blue-600 hover:text-blue-600"
                          onClick={() => {
                            localStorage.removeItem('localMode');
                            window.location.reload();
                          }}
                        >
                          <Cloud className="h-4 w-4" />
                          クラウド同期に切り替え
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
        </SheetContent>
      </Sheet>

      {/* コンテンツ（ダッシュボードを最優先で表示） */}
      <main className='content'>
        {state.transactions.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="space-y-4">
                <p className="text-lg text-muted-foreground">取引がありません。</p>
                <div className="flex gap-4 justify-center">
                  <Button asChild>
                    <a href='#import'>
                      <Upload className="h-4 w-4 mr-2" />
                      CSV取込へ
                    </a>
                  </Button>
                  <Button variant="outline" onClick={loadDemo}>
                    <FileText className="h-4 w-4 mr-2" />
                    デモ読込
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
              <MonthlyAnalysis
                transactions={filteredTransactionsForAnalysis}
                period={period}
                yenUnit={yenUnit}
                lockColors={lockColors}
                hideOthers={hideOthers}
              />
            )}
            {page === 'analysis' && (
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
                  transactions={filteredTransactionsForAnalysis}
                  period={period}
                  yenUnit={yenUnit}
                  lockColors={lockColors}
                  hideOthers={hideOthers}
                  kind={kind}
                />
              </>
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
                transactions={filteredTransactionsForAnalysis}
                period={period}
                yenUnit={yenUnit}
                lockColors={lockColors}
                hideOthers={hideOthers}
                kind={kind}
              />
            </>
          )}
          {page === 'import' && <ImportCsv />}
          {page === 'export' && <ExportCsv />}
          {page === 'cleanup' && <DataCleanup />}
          {page === 'rules' && <Rules />}
          {page === 'others' && <Others yenUnit={yenUnit} />}
          {page === 'tx' && <Transactions />}
          {page === 'categories' && <Categories />}
          {page === 'prefs' && <Prefs />}
          {page === 'settings' && <Settings />}
        </Suspense>
      </main>

      {needRefresh && (
        <Card className="fixed bottom-4 right-4 z-50 max-w-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm">新しいバージョンがあります。</p>
              <Button size="sm" onClick={() => updateServiceWorker(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <footer className='border-t bg-muted/50 py-4 px-4 text-center text-sm text-muted-foreground'>
        MODE: {import.meta.env.MODE} / lastModified: {document.lastModified}
      </footer>

    </div>
  );
}
