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
import { toast } from 'react-hot-toast';
import { supabase } from './lib/supabaseClient.js';

// shadcn/ui components
import { Button } from './components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card.jsx';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './components/ui/sheet.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from './components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Lucide icons
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
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
  Menu, 
  LogOut, 
  RefreshCw, 
  Cloud,
  Home,
  EyeOff,
  Database,
  AlertCircle
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
const DatabaseTest = lazy(() => import('./pages/DatabaseTest.jsx'));
const Data = lazy(() => import('./pages/Data.jsx'));
const SettingsHub = lazy(() => import('./pages/SettingsHub.jsx'));

const NAV = {
  main: [
    { key: 'dashboard', label: 'TOP', icon: Home },
    { key: 'data', label: 'データ', icon: Database },
    { key: 'settings-hub', label: '設定', icon: SettingsIcon },
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
  [...NAV.main, ...NAV.data, ...NAV.settings].some(i => i.key === k) || ['dashboard', 'monthly', 'analysis', 'yearly', 'data', 'settings-hub', 'dbtest'].includes(k);

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
  const isLocalMode =
    localStorage.getItem('localMode') === 'true' || (!loading && !session);
  const [syncing, setSyncing] = useState(false);

  const isAuthenticated = session || isLocalMode;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // 旧形式のfilterModeからrentを除去
  useEffect(() => {
    const fm = localStorage.getItem('filterMode');
    if (fm) {
      try {
        const parsed = JSON.parse(fm);
        if (parsed.rent !== undefined) {
          localStorage.setItem(
            'filterMode',
            JSON.stringify({
              others: parsed.others || 'include',
              card: parsed.card || 'exclude',
            })
          );
        }
      } catch {
        localStorage.setItem(
          'filterMode',
          JSON.stringify({ others: 'include', card: 'exclude' })
        );
      }
    }
  }, []);
  
  // デバッグ用：データの状態を確認
  useEffect(() => {
    console.log('Current state transactions:', state.transactions?.length || 0);
    console.log('Session:', session);
    console.log('IsLocalMode:', isLocalMode);
    console.log('IsAuthenticated:', isAuthenticated);
  }, [state.transactions, session, isLocalMode, isAuthenticated]);

  // オンライン/オフライン時の処理
  useEffect(() => {
    const handleOffline = () => {
      dispatch({ type: 'loadFromBackup' });
      toast.error('オフラインになりました。バックアップから読み込みました。');
    };
    const handleOnline = () => {
      toast.loading('オンラインに復帰。最新データを取得しています...', { id: 'sync' });
      loadFromDatabase()
        .then(() => {
          toast.success('最新データを取得しバックアップを更新しました。', { id: 'sync' });
        })
        .catch(() => {
          toast.error('最新データの取得に失敗しました。', { id: 'sync' });
        });
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [dispatch, loadFromDatabase]);

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
  const [filterMode, setFilterMode] = useState(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem('filterMode') || '{}',
      );
      return {
        others: stored.others || 'include',
        card: stored.card || 'exclude',
        rent: stored.rent || 'include',
      };
    } catch {
      return { others: 'include', card: 'exclude', rent: 'include' };
    }
  });
  const burgerRef = useRef(null);
  const panelRef = useRef(null);
  const [needRefresh, setNeedRefresh] = useState(false);
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      setNeedRefresh(true);
    },
  });

  // filterModeをlocalStorageの変更と同期
  useEffect(() => {
    const load = () => {
      try {
        const stored = JSON.parse(
          localStorage.getItem('filterMode') || '{}',
        );
        setFilterMode({
          others: stored.others || 'include',
          card: stored.card || 'exclude',
          rent: stored.rent || 'include',
        });
      } catch {
        setFilterMode({ others: 'include', card: 'exclude', rent: 'include' });
      }
    };
    const onStorage = e => {
      if (e.key === 'filterMode') load();
    };
    window.addEventListener('storage', onStorage);
    const interval = setInterval(load, 1000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, []);

  // 集計対象外を除外したトランザクション
  const filteredTransactionsForAnalysis = useMemo(() => {
    let txs = state.transactions.filter(tx => !tx.excludeFromTotals);

    if (filterMode.others === 'exclude') {
      txs = txs.filter(tx => tx.category !== 'その他');
    } else if (filterMode.others === 'only') {
      txs = txs.filter(tx => tx.category === 'その他');
    }

    if (filterMode.card === 'exclude') {
      txs = txs.filter(tx => !tx.isCardPayment);
    } else if (filterMode.card === 'only') {
      txs = txs.filter(tx => tx.isCardPayment);
    }

    if (filterMode.rent === 'exclude') {
      txs = txs.filter(tx => tx.category !== '家賃');
    } else if (filterMode.rent === 'only') {
      txs = txs.filter(tx => tx.category === '家賃');
    }

    return txs;
  }, [state.transactions, filterMode]);

  const loadDemo = async () => {
    try {
      console.log('Loading demo data...');
      const res = await fetch('/demo/sample.json');
      if (!res.ok) {
        console.error('Failed to load demo data:', res.status, res.statusText);
        alert('デモデータの読み込みに失敗しました');
        return;
      }
      const data = await res.json();
      console.log('Demo data loaded:', data.length, 'transactions');
      dispatch({ type: 'importTransactions', payload: data, append: false });
      alert(`デモデータ（${data.length}件）を読み込みました`);
    } catch (error) {
      console.error('Error loading demo data:', error);
      alert('デモデータの読み込み中にエラーが発生しました');
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
  onKindChange,
}) {
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => !tx.excludeFromTotals);
  }, [transactions]);
  
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
      
      {/* データベーステストページへのリンク */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-blue-700 mb-3">
              {!supabase ? 'ローカルモードで動作中' : 'データベース接続の状態を確認'}
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.hash = 'dbtest'}
              className="border-blue-300 hover:bg-blue-50"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              データベース診断ツールを開く
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 収支切り替え */}
      <Card className={kind === 'expense' ? 'border-red-200 bg-red-50/30' : 'border-green-200 bg-green-50/30'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">表示モード</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={kind === 'expense' ? 'default' : 'outline'}
              onClick={() => onKindChange('expense')}
              className={kind === 'expense' 
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' 
                : 'border-gray-300 hover:bg-red-50 hover:border-red-300'}
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              支出
            </Button>
            <Button
              variant={kind === 'income' ? 'default' : 'outline'}
              onClick={() => onKindChange('income')}
              className={kind === 'income' 
                ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
                : 'border-gray-300 hover:bg-green-50 hover:border-green-300'}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              収入
            </Button>
          </div>
          <div className="mt-3 text-center">
            <Badge 
              variant={kind === 'expense' ? 'destructive' : 'default'}
              className={kind === 'expense' 
                ? 'bg-red-100 text-red-700 border-red-200' 
                : 'bg-green-100 text-green-700 border-green-200'}
            >
              現在: {kind === 'expense' ? '支出モード' : '収入モード'}
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* 収支サマリー with AmountVisual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-100 bg-green-50/20">
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
        <Card className="border-red-100 bg-red-50/20">
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
        <Card className={netBalance >= 0 ? 'border-blue-100 bg-blue-50/20' : 'border-orange-100 bg-orange-50/20'}>
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
        <Card className={kind === 'expense' ? 'border-red-100' : 'border-green-100'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {kind === 'expense' ? (
                <TrendingDown className="h-5 w-5 text-red-500" />
              ) : (
                <TrendingUp className="h-5 w-5 text-green-500" />
              )}
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

        <Card className={kind === 'expense' ? 'border-red-100' : 'border-green-100'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className={kind === 'expense' ? 'h-5 w-5 text-red-500' : 'h-5 w-5 text-green-500'} />
              {kind === 'expense' ? '支出' : '収入'}カテゴリ別内訳
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-[250px]">
            <PieByCategory
              transactions={filteredTransactions}
              period={period}
              yenUnit={yenUnit}
              lockColors={lockColors}
              hideOthers={hideOthers}
              kind={kind}
              chartHeight={isMobile ? 300 : 250}
              radius={isMobile ? '65%' : '80%'}
            />
          </CardContent>
        </Card>
      </div>

      <Card className={kind === 'expense' ? 'border-red-100' : 'border-green-100'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className={kind === 'expense' ? 'h-5 w-5 text-red-500' : 'h-5 w-5 text-green-500'} />
            {kind === 'expense' ? '支出' : '収入'}の月別推移
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
    <div className='app-shell' style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
              <SelectItem value="1y">1年間</SelectItem>
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
                
                {/* クラウド同期切り替えボタン */}
                <div className="space-y-2 border-t pt-4 mt-4">
                  <div className="px-2">
                    {isLocalMode ? (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          localStorage.removeItem('localMode');
                          window.location.reload();
                        }}
                      >
                        <Cloud className="h-4 w-4" />
                        クラウド同期に切り替え
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          localStorage.setItem('localMode', 'true');
                          window.location.reload();
                        }}
                      >
                        <Database className="h-4 w-4" />
                        ローカルモードに切り替え
                      </Button>
                    )}
                  </div>
                </div>
                
              </div>
        </SheetContent>
      </Sheet>

      {/* コンテンツ */}
      <main className='content text-center' style={{ flex: 1, paddingBottom: '120px' }}>
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
        {/* メインナビゲーションタブ */}
        {['dashboard', 'monthly', 'analysis', 'yearly'].includes(page) ? (
          <Tabs value={page} onValueChange={setPage} className="w-full">
            <div className="border-b mb-6 bg-white">
              <TabsList className="h-auto p-0 bg-transparent rounded-none w-full justify-start">
                <TabsTrigger 
                  value="dashboard" 
                  className="relative flex items-center gap-2 rounded-t-lg rounded-b-none border-b-3 border-transparent 
                             data-[state=active]:border-blue-500 data-[state=active]:bg-gradient-to-t data-[state=active]:from-blue-50 data-[state=active]:to-white 
                             data-[state=active]:text-blue-700 data-[state=active]:shadow-sm
                             hover:bg-gray-50 px-4 py-3 transition-all duration-200"
                >
                  <Home className={`h-4 w-4 ${page === 'dashboard' ? 'text-blue-600' : ''}`} />
                  <span className="font-medium">TOP</span>
                  {page === 'dashboard' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="monthly" 
                  className="relative flex items-center gap-2 rounded-t-lg rounded-b-none border-b-3 border-transparent 
                             data-[state=active]:border-blue-500 data-[state=active]:bg-gradient-to-t data-[state=active]:from-blue-50 data-[state=active]:to-white 
                             data-[state=active]:text-blue-700 data-[state=active]:shadow-sm
                             hover:bg-gray-50 px-4 py-3 transition-all duration-200"
                >
                  <TrendingUp className={`h-4 w-4 ${page === 'monthly' ? 'text-blue-600' : ''}`} />
                  <span className="hidden sm:inline font-medium">比較</span>
                  <span className="sm:hidden font-medium">比較</span>
                  {page === 'monthly' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="analysis" 
                  className="relative flex items-center gap-2 rounded-t-lg rounded-b-none border-b-3 border-transparent 
                             data-[state=active]:border-blue-500 data-[state=active]:bg-gradient-to-t data-[state=active]:from-blue-50 data-[state=active]:to-white 
                             data-[state=active]:text-blue-700 data-[state=active]:shadow-sm
                             hover:bg-gray-50 px-4 py-3 transition-all duration-200"
                >
                  <Search className={`h-4 w-4 ${page === 'analysis' ? 'text-blue-600' : ''}`} />
                  <span className="hidden sm:inline font-medium">分析</span>
                  <span className="sm:hidden font-medium">分析</span>
                  {page === 'analysis' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="yearly" 
                  className="relative flex items-center gap-2 rounded-t-lg rounded-b-none border-b-3 border-transparent 
                             data-[state=active]:border-blue-500 data-[state=active]:bg-gradient-to-t data-[state=active]:from-blue-50 data-[state=active]:to-white 
                             data-[state=active]:text-blue-700 data-[state=active]:shadow-sm
                             hover:bg-gray-50 px-4 py-3 transition-all duration-200"
                >
                  <Calendar className={`h-4 w-4 ${page === 'yearly' ? 'text-blue-600' : ''}`} />
                  <span className="hidden sm:inline font-medium">年間サマリ</span>
                  <span className="sm:hidden font-medium">年間</span>
                  {page === 'yearly' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="dashboard">
              <Dashboard
                transactions={state.transactions}
                period={period}
                yenUnit={yenUnit}
                lockColors={lockColors}
                hideOthers={hideOthers}
                kind={kind}
                onKindChange={setKind}
              />
            </TabsContent>
            
            <TabsContent value="monthly">
              <Suspense fallback={<div>Loading...</div>}>
                <MonthlyAnalysis
                  transactions={filteredTransactionsForAnalysis}
                  period={period}
                  yenUnit={yenUnit}
                  lockColors={lockColors}
                  hideOthers={hideOthers}
                  filterMode={filterMode}
                />
              </Suspense>
            </TabsContent>
            
            <TabsContent value="analysis">
              <Suspense fallback={<div>Loading...</div>}>
                <Card className={`mb-4 ${kind === 'expense' ? 'border-red-200 bg-red-50/30' : 'border-green-200 bg-green-50/30'}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={kind === 'expense' ? 'default' : 'outline'}
                        onClick={() => setKind('expense')}
                        className={kind === 'expense' 
                          ? 'flex-1 bg-red-500 hover:bg-red-600 text-white' 
                          : 'flex-1 hover:bg-red-50'}
                      >
                        <TrendingDown className="w-4 h-4 mr-2" />
                        支出分析
                      </Button>
                      <Button
                        size="sm"
                        variant={kind === 'income' ? 'default' : 'outline'}
                        onClick={() => setKind('income')}
                        className={kind === 'income' 
                          ? 'flex-1 bg-green-500 hover:bg-green-600 text-white' 
                          : 'flex-1 hover:bg-green-50'}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        収入分析
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Monthly
                  transactions={filteredTransactionsForAnalysis}
                  yenUnit={yenUnit}
                  lockColors={lockColors}
                  hideOthers={hideOthers}
                  kind={kind}
                />
              </Suspense>
            </TabsContent>
            
            <TabsContent value="yearly">
              <Suspense fallback={<div>Loading...</div>}>
                <Card className={`mb-4 ${kind === 'expense' ? 'border-red-200 bg-red-50/30' : 'border-green-200 bg-green-50/30'}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={kind === 'expense' ? 'default' : 'outline'}
                        onClick={() => setKind('expense')}
                        className={kind === 'expense' 
                          ? 'flex-1 bg-red-500 hover:bg-red-600 text-white' 
                          : 'flex-1 hover:bg-green-50'}
                      >
                        <TrendingDown className="w-4 h-4 mr-2" />
                        支出サマリ
                      </Button>
                      <Button
                        size="sm"
                        variant={kind === 'income' ? 'default' : 'outline'}
                        onClick={() => setKind('income')}
                        className={kind === 'income' 
                          ? 'flex-1 bg-green-500 hover:bg-green-600 text-white' 
                          : 'flex-1 hover:bg-green-50'}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        収入サマリ
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Yearly
                  transactions={filteredTransactionsForAnalysis}
                  period={period}
                  yenUnit={yenUnit}
                  lockColors={lockColors}
                  hideOthers={hideOthers}
                  kind={kind}
                  filterMode={filterMode}
                />
              </Suspense>
            </TabsContent>
          </Tabs>
        ) : (
          <Suspense fallback={<div>Loading...</div>}>
            {page === 'data' && <Data />}
            {page === 'settings-hub' && <SettingsHub />}
            {page === 'import' && <ImportCsv />}
            {page === 'export' && <ExportCsv />}
            {page === 'cleanup' && <DataCleanup />}
            {page === 'rules' && <Rules />}
            {page === 'others' && <Others yenUnit={yenUnit} />}
            {page === 'tx' && <Transactions />}
            {page === 'categories' && <Categories />}
            {page === 'prefs' && <Prefs />}
            {page === 'settings' && <Settings />}
            {page === 'dbtest' && <DatabaseTest />}
          </Suspense>
        )}
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
      <footer className='border-t bg-white shadow-lg' style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 40 
      }}>
        <div className="flex justify-center gap-2 py-3 px-4 border-b">
          <Button
            variant={page === 'dashboard' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPage('dashboard')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            TOP
          </Button>
          <Button
            variant={page === 'data' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPage('data')}
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            データ
          </Button>
          <Button
            variant={page === 'settings-hub' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPage('settings-hub')}
            className="gap-2"
          >
            <SettingsIcon className="h-4 w-4" />
            設定
          </Button>
        </div>
        <div className='py-2 px-4 text-center text-xs text-muted-foreground bg-muted/50'>
          MODE: {import.meta.env.MODE} / lastModified: {document.lastModified}
        </div>
      </footer>

    </div>
  );
}
