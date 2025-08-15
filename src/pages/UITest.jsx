import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, Home, Settings, User, AlertCircle, CheckCircle, Info, XCircle,
  TrendingUp, TrendingDown, DollarSign, CreditCard, Activity, Download, Upload,
  Filter, Search, Menu, X, ChevronRight, ChevronLeft, Plus, Minus, Edit, Trash,
  Save, Copy, Share, Heart, Star, Bell, Mail, MessageCircle, Send, Eye, EyeOff,
  Lock, Unlock, RefreshCw, BarChart, PieChart, LineChart, FileText, Folder, File,
  Database, Cloud, Sun, Moon, LogOut, LogIn,
} from 'lucide-react';
import '../styles/UITest.css';

// カテゴリアイコンマッピング
const CATEGORY_ICONS = {
  '食費': '🍽️',
  '外食費': '🍜',
  '家賃': '🏠',
  '住居・光熱': '💡',
  '日用品・消耗品': '🧻',
  '通信': '📱',
  '交通・移動': '🚗',
  '医療・健康': '🏥',
  '衣服・美容': '👕',
  '趣味・娯楽': '🎮',
  '旅行・レジャー': '✈️',
  '教育・書籍': '📚',
  '交際費': '🍻',
  'ビジネス': '💼',
  '税金・保険': '📋',
  'Amazon': '📦',
  'カード払い': '💳',
  '給与': '💰',
  '投資利益': '📈',
  '雑収入': '💵',
  'その他': '📌'
};

// ナビゲーションアイコン
const NAV_ICONS = {
  main: [
    { key: 'dashboard', icon: '📊', label: 'ダッシュボード', shortLabel: 'ホーム' },
    { key: 'monthly', icon: '📅', label: '月次比較', shortLabel: '月次' },
    { key: 'analysis', icon: '🔍', label: '月次分析', shortLabel: '分析' },
    { key: 'yearly', icon: '📈', label: '年間サマリ', shortLabel: '年間' },
  ],
  data: [
    { key: 'import', icon: '📥', label: 'CSV取込', shortLabel: 'CSV' },
    { key: 'export', icon: '📤', label: 'エクスポート', shortLabel: '出力' },
    { key: 'cleanup', icon: '🧹', label: 'クリーンアップ', shortLabel: '整理' },
    { key: 'rules', icon: '⚙️', label: 'ルール設定', shortLabel: 'ルール' },
  ],
  settings: [
    { key: 'prefs', icon: '🎨', label: '表示設定', shortLabel: '表示' },
    { key: 'settings', icon: '👤', label: 'アカウント', shortLabel: 'アカウント' }
  ]
};

// 視覚的な金額表示コンポーネント
function AmountVisual({ amount, label, isIncome = false, showBar = true }) {
  const maxAmount = 500000; // 50万円を最大値として表示
  const percentage = Math.min((Math.abs(amount) / maxAmount) * 100, 100);
  const formattedAmount = Math.abs(amount).toLocaleString();
  
  return (
    <div className="amount-visual">
      <div className="amount-label">{label}</div>
      <div className="amount-content">
        <span className={`amount-icon ${isIncome ? 'income' : 'expense'}`}>
          {isIncome ? '➕' : '➖'}
        </span>
        <div className="amount-bar-container">
          {showBar && (
            <div 
              className={`amount-bar ${isIncome ? 'income' : 'expense'}`}
              style={{ width: `${percentage}%` }}
            />
          )}
          <span className="amount-value">¥{formattedAmount}</span>
        </div>
      </div>
    </div>
  );
}

// トグルボタンコンポーネント
function ToggleButton({ icon, tooltip, active, onClick }) {
  return (
    <button 
      className={`toggle-button ${active ? 'active' : ''}`}
      onClick={onClick}
      title={tooltip}
    >
      <span className="toggle-icon">{icon}</span>
      <span className="toggle-tooltip">{tooltip}</span>
    </button>
  );
}

// セグメントコントロール
function SegmentControl({ options, value, onChange }) {
  return (
    <div className="segment-control">
      {options.map(option => (
        <button
          key={option.value}
          className={`segment-option ${value === option.value ? 'active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// カテゴリカード
function CategoryCard({ category, amount, percentage }) {
  const icon = CATEGORY_ICONS[category] || '📌';
  const isIncome = amount > 0;
  
  return (
    <div className="category-card">
      <div className="category-icon">{icon}</div>
      <div className="category-info">
        <div className="category-name">{category}</div>
        <div className={`category-amount ${isIncome ? 'income' : 'expense'}`}>
          ¥{Math.abs(amount).toLocaleString()}
        </div>
      </div>
      <div className="category-chart">
        <svg width="40" height="40">
          <circle
            cx="20"
            cy="20"
            r="15"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"
          />
          <circle
            cx="20"
            cy="20"
            r="15"
            fill="none"
            stroke={isIncome ? '#10b981' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={`${(percentage * 94) / 100} 94`}
            strokeDashoffset="23.5"
            strokeLinecap="round"
          />
        </svg>
        <div className="percentage">{percentage}%</div>
      </div>
    </div>
  );
}

// アイコンナビゲーション
function IconNavigation({ activeTab, onTabChange }) {
  return (
    <nav className="icon-navigation">
      <div className="nav-section">
        <div className="nav-section-title">メイン</div>
        <div className="nav-items">
          {NAV_ICONS.main.map(item => (
            <button
              key={item.key}
              className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => onTabChange(item.key)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="nav-section">
        <div className="nav-section-title">データ</div>
        <div className="nav-items">
          {NAV_ICONS.data.map(item => (
            <button
              key={item.key}
              className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => onTabChange(item.key)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ステータスインジケーター
function StatusIndicator({ status, message }) {
  const icons = {
    syncing: '🔄',
    synced: '✅',
    error: '❌',
    pending: '⏳'
  };
  
  return (
    <div className={`status-indicator ${status}`}>
      <span className="status-icon">{icons[status]}</span>
      <span className="status-message">{message}</span>
    </div>
  );
}

// メインのUIテストページ
export default function UITest() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [period, setPeriod] = useState('3m');
  const [yenUnit, setYenUnit] = useState(false);
  const [lockColors, setLockColors] = useState(true);
  const [hideOthers, setHideOthers] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');
  const [switchValue, setSwitchValue] = useState(false);
  const [textareaValue, setTextareaValue] = useState('');
  
  // サンプルデータ
  const sampleCategories = [
    { category: '食費', amount: -45000, percentage: 25 },
    { category: '家賃', amount: -80000, percentage: 45 },
    { category: '交通・移動', amount: -15000, percentage: 8 },
    { category: '給与', amount: 250000, percentage: 100 },
    { category: '趣味・娯楽', amount: -20000, percentage: 11 },
    { category: '通信', amount: -8000, percentage: 4 }
  ];
  
  const periodOptions = [
    { value: '3m', label: '3ヶ月' },
    { value: '6m', label: '半年' },
    { value: '1y', label: '1年' },
    { value: 'all', label: '全期間' }
  ];
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-4xl font-bold mb-8">UI コンポーネント テストページ</h1>
      
      <div className="space-y-8">
        {/* shadcn/uiコンポーネントセクション */}
        <Card>
          <CardHeader>
            <CardTitle>shadcn/ui コンポーネント</CardTitle>
            <CardDescription>新しいUIシステムのコンポーネント</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ボタン */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">ボタン</h3>
              <div className="flex flex-wrap gap-2">
                <Button>Default</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon"><Settings className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* フォーム要素 */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">フォーム要素</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="input">Input</Label>
                  <Input 
                    id="input" 
                    placeholder="テキストを入力..." 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="select">Select</Label>
                  <Select value={selectValue} onValueChange={setSelectValue}>
                    <SelectTrigger id="select">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">オプション 1</SelectItem>
                      <SelectItem value="option2">オプション 2</SelectItem>
                      <SelectItem value="option3">オプション 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="textarea">Textarea</Label>
                <Textarea 
                  id="textarea" 
                  placeholder="複数行のテキストを入力..."
                  value={textareaValue}
                  onChange={(e) => setTextareaValue(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="checkbox" 
                  checked={checkboxValue}
                  onCheckedChange={setCheckboxValue}
                />
                <Label htmlFor="checkbox">チェックボックス</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="switch" 
                  checked={switchValue}
                  onCheckedChange={setSwitchValue}
                />
                <Label htmlFor="switch">スイッチ</Label>
              </div>
            </div>

            {/* バッジ */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">バッジ</h3>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge>
                  <Activity className="mr-1 h-3 w-3" />
                  With Icon
                </Badge>
              </div>
            </div>

            {/* アラート */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">アラート</h3>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>情報</AlertTitle>
                <AlertDescription>
                  これは情報アラートです。
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>エラー</AlertTitle>
                <AlertDescription>
                  これはエラーアラートです。
                </AlertDescription>
              </Alert>
            </div>

            {/* タブ */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">タブ</h3>
              <Tabs defaultValue="tab1" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="tab1">タブ 1</TabsTrigger>
                  <TabsTrigger value="tab2">タブ 2</TabsTrigger>
                  <TabsTrigger value="tab3">タブ 3</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">
                  <Card>
                    <CardHeader>
                      <CardTitle>タブ 1</CardTitle>
                    </CardHeader>
                    <CardContent>
                      タブ 1 のコンテンツです。
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="tab2">
                  <Card>
                    <CardHeader>
                      <CardTitle>タブ 2</CardTitle>
                    </CardHeader>
                    <CardContent>
                      タブ 2 のコンテンツです。
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="tab3">
                  <Card>
                    <CardHeader>
                      <CardTitle>タブ 3</CardTitle>
                    </CardHeader>
                    <CardContent>
                      タブ 3 のコンテンツです。
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Lucideアイコン */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Lucide アイコン</h3>
              <div className="grid grid-cols-8 md:grid-cols-12 gap-4">
                {[
                  { Icon: Home, name: 'Home' },
                  { Icon: User, name: 'User' },
                  { Icon: Settings, name: 'Settings' },
                  { Icon: Calendar, name: 'Calendar' },
                  { Icon: Search, name: 'Search' },
                  { Icon: Filter, name: 'Filter' },
                  { Icon: Download, name: 'Download' },
                  { Icon: Upload, name: 'Upload' },
                  { Icon: TrendingUp, name: 'TrendingUp' },
                  { Icon: TrendingDown, name: 'TrendingDown' },
                  { Icon: DollarSign, name: 'Dollar' },
                  { Icon: CreditCard, name: 'Card' },
                ].map(({ Icon, name }) => (
                  <div key={name} className="flex flex-col items-center gap-2 p-2 rounded hover:bg-accent">
                    <Icon className="h-5 w-5" />
                    <span className="text-xs text-muted-foreground">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 既存のカスタムコンポーネント */}
        <Card>
          <CardHeader>
            <CardTitle>カスタムコンポーネント</CardTitle>
            <CardDescription>既存の視覚的なUI要素</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">アイコンナビゲーション</h3>
              <IconNavigation activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">視覚的な金額表示</h3>
              <div className="amount-examples">
                <AmountVisual amount={-125000} label="今月の支出" isIncome={false} />
                <AmountVisual amount={250000} label="今月の収入" isIncome={true} />
                <AmountVisual amount={125000} label="収支バランス" isIncome={true} />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">トグルボタン</h3>
              <div className="toggle-group">
                <ToggleButton 
                  icon="💴" 
                  tooltip="万円表示" 
                  active={yenUnit}
                  onClick={() => setYenUnit(!yenUnit)}
                />
                <ToggleButton 
                  icon="🎨" 
                  tooltip="色固定" 
                  active={lockColors}
                  onClick={() => setLockColors(!lockColors)}
                />
                <ToggleButton 
                  icon="👁️" 
                  tooltip="その他除外" 
                  active={hideOthers}
                  onClick={() => setHideOthers(!hideOthers)}
                />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">期間選択</h3>
              <SegmentControl 
                options={periodOptions}
                value={period}
                onChange={setPeriod}
              />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">カテゴリカード</h3>
              <div className="category-grid">
                {sampleCategories.map(cat => (
                  <CategoryCard key={cat.category} {...cat} />
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">ステータス表示</h3>
              <div className="status-examples">
                <StatusIndicator status="syncing" message="同期中..." />
                <StatusIndicator status="synced" message="同期完了" />
                <StatusIndicator status="pending" message="保留中" />
                <StatusIndicator status="error" message="エラー" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 実装例 */}
        <Card>
          <CardHeader>
            <CardTitle>実装例：トランザクションカード</CardTitle>
            <CardDescription>実際の使用例</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">収入</p>
                    <p className="text-sm text-muted-foreground">2024年1月</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">+¥250,000</p>
                  <Badge variant="outline">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    12%
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-destructive/10 rounded">
                    <CreditCard className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">支出</p>
                    <p className="text-sm text-muted-foreground">2024年1月</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">-¥180,000</p>
                  <Badge variant="outline">
                    <TrendingDown className="mr-1 h-3 w-3" />
                    8%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}