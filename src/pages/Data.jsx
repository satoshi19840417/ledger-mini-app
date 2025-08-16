import { useState } from 'react';
import { useStore } from '../state/StoreContextWithDB.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { toast } from 'react-hot-toast';
import { 
  Upload, 
  Download, 
  Trash2, 
  FileText, 
  CreditCard, 
  Tag, 
  Database,
  ChevronRight,
  BarChart3,
  RefreshCw,
  FolderOpen,
  Cloud,
  CloudOff,
  HardDrive,
  Settings2
} from 'lucide-react';

export default function Data() {
  const { state, loadFromDatabase, syncWithDatabase, autoSyncEnabled, toggleAutoSync } = useStore();
  const [activeSection, setActiveSection] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sections = [
    {
      id: 'sync',
      title: 'データ同期',
      description: 'クラウドとのデータ同期設定',
      icon: Cloud,
      color: 'indigo',
      stats: {
        label: '同期状態',
        value: autoSyncEnabled ? '自動同期ON' : '手動同期'
      },
      action: 'modal'
    },
    {
      id: 'import',
      title: 'CSV取込',
      description: 'CSVファイルから取引データをインポート',
      icon: Upload,
      color: 'blue',
      stats: {
        label: '最新取込',
        value: state.lastImport || '未取込'
      },
      href: '#import'
    },
    {
      id: 'export',
      title: 'CSVエクスポート',
      description: '取引データをCSVファイルに出力',
      icon: Download,
      color: 'green',
      stats: {
        label: '出力可能件数',
        value: `${state.transactions.length}件`
      },
      href: '#export'
    },
    {
      id: 'cleanup',
      title: 'データクリーンアップ',
      description: '重複データの削除とデータ整理',
      icon: Trash2,
      color: 'red',
      stats: {
        label: 'データ件数',
        value: `${state.transactions.length}件`
      },
      href: '#cleanup'
    },
    {
      id: 'rules',
      title: '再分類ルール',
      description: '自動分類ルールの管理',
      icon: FileText,
      color: 'purple',
      stats: {
        label: 'ルール数',
        value: `${Object.keys(state.rules || {}).length}件`
      },
      href: '#rules'
    },
    {
      id: 'tx',
      title: '取引一覧',
      description: 'すべての取引データを表示・編集',
      icon: CreditCard,
      color: 'orange',
      stats: {
        label: '取引件数',
        value: `${state.transactions.length}件`
      },
      href: '#tx'
    },
    {
      id: 'categories',
      title: 'カテゴリ管理',
      description: 'カテゴリの追加・編集・削除',
      icon: Tag,
      color: 'pink',
      stats: {
        label: 'カテゴリ数',
        value: `${state.categories?.length || 0}個`
      },
      href: '#categories'
    },
    {
      id: 'others',
      title: 'その他集計',
      description: '特殊な集計とレポート',
      icon: BarChart3,
      color: 'teal',
      stats: {
        label: 'その他取引',
        value: `${state.transactions.filter(tx => tx.category === 'その他').length}件`
      },
      href: '#others'
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300',
      green: 'bg-green-50 hover:bg-green-100 border-green-200 hover:border-green-300',
      red: 'bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300',
      purple: 'bg-purple-50 hover:bg-purple-100 border-purple-200 hover:border-purple-300',
      orange: 'bg-orange-50 hover:bg-orange-100 border-orange-200 hover:border-orange-300',
      pink: 'bg-pink-50 hover:bg-pink-100 border-pink-200 hover:border-pink-300',
      teal: 'bg-teal-50 hover:bg-teal-100 border-teal-200 hover:border-teal-300',
      indigo: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 hover:border-indigo-300'
    };
    return colorMap[color] || colorMap.blue;
  };

  const getIconColorClasses = (color) => {
    const colorMap = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      red: 'text-red-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600',
      pink: 'text-pink-600',
      teal: 'text-teal-600',
      indigo: 'text-indigo-600'
    };
    return colorMap[color] || colorMap.blue;
  };

  const getBadgeVariant = (color) => {
    const variantMap = {
      blue: 'default',
      green: 'success',
      red: 'destructive',
      purple: 'secondary',
      orange: 'warning',
      pink: 'outline',
      teal: 'info'
    };
    return variantMap[color] || 'default';
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            データ管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              取引データの管理と各種設定
            </div>
            <Badge variant="secondary">
              {state.transactions.length} 件のデータ
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* セクション一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          const content = (
            <Card 
              className={`transition-all duration-200 cursor-pointer ${getColorClasses(section.color)} ${
                activeSection === section.id ? 'shadow-lg scale-[1.02]' : ''
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg bg-white shadow-sm ${getIconColorClasses(section.color)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-lg">{section.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {section.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-muted-foreground">{section.stats.label}: </span>
                        <span className="font-medium">{section.stats.value}</span>
                      </div>
                      <ChevronRight className={`h-4 w-4 transition-transform ${
                        activeSection === section.id ? 'translate-x-1' : ''
                      } ${getIconColorClasses(section.color)}`} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          
          if (section.action === 'modal') {
            return (
              <div
                key={section.id}
                onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                onMouseEnter={() => setActiveSection(section.id)}
                onMouseLeave={() => setActiveSection(null)}
                className="cursor-pointer"
              >
                {content}
              </div>
            );
          }
          
          return (
            <a
              key={section.id}
              href={section.href}
              className="no-underline"
              onMouseEnter={() => setActiveSection(section.id)}
              onMouseLeave={() => setActiveSection(null)}
            >
              {content}
            </a>
          );
        })}
      </div>

      {/* データ同期モーダル */}
      {activeSection === 'sync' && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-indigo-600" />
              データ同期設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 自動同期設定 */}
            <div className="p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">自動同期</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    データ変更時に自動的にクラウドと同期します
                  </p>
                </div>
                <button
                  onClick={() => toggleAutoSync(!autoSyncEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoSyncEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">自動同期を切り替え</span>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                現在: {autoSyncEnabled ? '有効 ✅' : '無効 ⏸️'}
              </div>
            </div>

            {/* 手動同期 */}
            <div className="p-4 bg-white rounded-lg border">
              <h4 className="font-medium mb-3">手動同期</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    クラウドから最新データを取得
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      disabled={syncing}
                      onClick={async () => {
                        setSyncing(true);
                        try {
                          await loadFromDatabase();
                          toast.success('データを同期しました');
                        } catch (error) {
                          console.error('Sync error:', error);
                          toast.error('同期に失敗しました');
                        } finally {
                          setSyncing(false);
                        }
                      }}
                    >
                      <CloudOff className="h-4 w-4 mr-2" />
                      {syncing ? '同期中...' : 'データを同期'}
                    </Button>
                    {state.lastSyncAt && (
                      <span className="text-xs text-gray-500">
                        最終: {new Date(state.lastSyncAt).toLocaleString('ja-JP')}
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    未同期データをクラウドに送信
                  </p>
                  <Button
                    size="sm"
                    disabled={uploading}
                    onClick={async () => {
                      setUploading(true);
                      try {
                        const success = await syncWithDatabase();
                        if (success) {
                          toast.success('未同期データを送信しました');
                        } else {
                          toast.error('送信に失敗しました');
                        }
                      } catch (error) {
                        console.error('Upload error:', error);
                        toast.error('送信に失敗しました');
                      } finally {
                        setUploading(false);
                      }
                    }}
                  >
                    <Cloud className="h-4 w-4 mr-2" />
                    {uploading ? '送信中...' : '未同期データを送信'}
                  </Button>
                </div>
              </div>
            </div>

            {/* ローカルストレージ管理 */}
            <div className="p-4 bg-white rounded-lg border">
              <h4 className="font-medium mb-3">
                <HardDrive className="inline h-4 w-4 mr-2" />
                ローカルストレージ
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                ブラウザに保存されているデータの管理
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm('ルール設定をクリアしますか？')) {
                      localStorage.removeItem('csvImportRules');
                      toast.success('ルール設定をクリアしました');
                    }
                  }}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  ルール設定をクリア
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* サマリー情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            データ概要
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {state.transactions.length}
              </div>
              <div className="text-xs text-muted-foreground">総取引数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {state.transactions.filter(tx => tx.kind === 'income').length}
              </div>
              <div className="text-xs text-muted-foreground">収入取引</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {state.transactions.filter(tx => tx.kind === 'expense').length}
              </div>
              <div className="text-xs text-muted-foreground">支出取引</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(state.rules || {}).length}
              </div>
              <div className="text-xs text-muted-foreground">分類ルール</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* クイックアクション */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            クイックアクション
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="#import">
                <Upload className="h-4 w-4 mr-2" />
                データ取込
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="#export">
                <Download className="h-4 w-4 mr-2" />
                エクスポート
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="#tx">
                <FolderOpen className="h-4 w-4 mr-2" />
                取引を見る
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="#rules">
                <RefreshCw className="h-4 w-4 mr-2" />
                ルール適用
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}