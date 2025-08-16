import { useState } from 'react';
import { useStore } from '../state/StoreContextWithDB.jsx';
import { useSession, logout } from '../useSession';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { 
  Settings as SettingsIcon,
  User,
  LogOut,
  ChevronRight,
  Bell,
  Shield,
  Palette,
  Database,
  Cloud,
  RefreshCw,
  Key,
  Monitor,
  Moon,
  Globe,
  HelpCircle,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SettingsHub() {
  const { state, loadFromDatabase } = useStore();
  const { session } = useSession();
  const [activeSection, setActiveSection] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isLocalMode = localStorage.getItem('localMode') === 'true';

  const handleLogout = async () => {
    if (loggingOut) return;
    
    setLoggingOut(true);
    try {
      if (localStorage.getItem('localMode') === 'true') {
        localStorage.clear();
        window.location.reload();
        return;
      }
      
      const success = await logout();
      if (success) {
        localStorage.clear();
        window.location.reload();
      } else {
        localStorage.clear();
        window.location.reload();
      }
    } catch (error) {
      console.error('ログアウトエラー:', error);
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      await loadFromDatabase();
      toast.success('データを同期しました');
    } catch (error) {
      console.error('同期エラー:', error);
      toast.error('同期に失敗しました');
    } finally {
      setSyncing(false);
    }
  };

  const sections = [
    {
      id: 'prefs',
      title: 'アプリケーション設定',
      description: '表示設定、通貨単位、フィルタ設定など',
      icon: SettingsIcon,
      color: 'blue',
      href: '#prefs',
      stats: {
        label: '設定項目',
        value: '表示・動作'
      }
    },
    {
      id: 'account',
      title: 'アカウント設定',
      description: 'プロフィール、認証、セキュリティ設定',
      icon: User,
      color: 'purple',
      href: '#settings',
      stats: {
        label: 'アカウント',
        value: session ? session.user?.email : 'ローカルモード'
      }
    },
    {
      id: 'appearance',
      title: '外観とテーマ',
      description: 'カラーテーマ、ダークモード、フォント設定',
      icon: Palette,
      color: 'pink',
      href: '#/theme',
      stats: {
        label: 'テーマ',
        value: 'ライトモード'
      }
    },
    {
      id: 'notifications',
      title: '通知設定',
      description: 'アラート、リマインダー、通知頻度',
      icon: Bell,
      color: 'orange',
      href: '#prefs',
      stats: {
        label: '通知',
        value: 'オフ'
      }
    },
    {
      id: 'privacy',
      title: 'プライバシー',
      description: 'データ保護、共有設定、セキュリティ',
      icon: Shield,
      color: 'green',
      href: '#settings',
      stats: {
        label: 'セキュリティ',
        value: '標準'
      }
    },
    {
      id: 'data',
      title: 'データ管理',
      description: 'バックアップ、エクスポート、インポート',
      icon: Database,
      color: 'teal',
      href: '#data',
      stats: {
        label: 'データ',
        value: `${state.transactions.length}件`
      }
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
      teal: 'bg-teal-50 hover:bg-teal-100 border-teal-200 hover:border-teal-300'
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
      teal: 'text-teal-600'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              アプリケーションとアカウントの設定を管理
            </div>
            <Badge variant="secondary">
              {session ? 'クラウド同期' : 'ローカルモード'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* セクション一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <a
              key={section.id}
              href={section.href}
              className="no-underline"
              onMouseEnter={() => setActiveSection(section.id)}
              onMouseLeave={() => setActiveSection(null)}
            >
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
            </a>
          );
        })}
      </div>

      {/* アカウント情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            アカウント情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {session ? session.user?.email : 'ローカルユーザー'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {session ? 'クラウド同期アカウント' : 'ローカルストレージ使用'}
                  </div>
                </div>
              </div>
              <Badge variant={session ? 'default' : 'secondary'}>
                {session ? 'オンライン' : 'オフライン'}
              </Badge>
            </div>

            {state.profile?.display_name && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">表示名</div>
                    <div className="text-xs text-muted-foreground">
                      {state.profile.display_name}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* アクション */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            アカウント操作
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {session ? (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  disabled={syncing}
                  onClick={handleSync}
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'データを同期中...' : 'データを同期'}
                </Button>
                
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-2"
                  disabled={loggingOut}
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? 'ログアウト中...' : 'ログアウト'}
                </Button>
              </>
            ) : (
              <>
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
                
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-2"
                  disabled={loggingOut}
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? 'データをクリア中...' : 'ローカルデータをクリア'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* その他の情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            システム情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">バージョン</span>
              <span className="font-mono">1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">環境</span>
              <span className="font-mono">{import.meta.env.MODE}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">最終更新</span>
              <span className="font-mono">{document.lastModified}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ストレージ使用量</span>
              <span className="font-mono">
                {state.transactions.length > 0 
                  ? `約${Math.round(JSON.stringify(state).length / 1024)}KB`
                  : '0KB'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ヘルプリンク */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <HelpCircle className="h-4 w-4 mr-2" />
              ヘルプ
            </Button>
            <Button variant="outline" size="sm">
              <Info className="h-4 w-4 mr-2" />
              このアプリについて
            </Button>
            <Button variant="outline" size="sm">
              <Globe className="h-4 w-4 mr-2" />
              言語設定
            </Button>
            <Button variant="outline" size="sm">
              <Moon className="h-4 w-4 mr-2" />
              ダークモード
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}