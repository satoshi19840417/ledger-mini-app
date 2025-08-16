import { useState, useEffect } from 'react';
import { useStore } from '../state/StoreContextWithDB.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Badge } from '../components/ui/badge.jsx';
import { toast } from 'react-hot-toast';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  Download,
  Settings
} from 'lucide-react';

export default function DataSync() {
  const { 
    state, 
    loadFromDatabase, 
    syncWithDatabase, 
    autoSyncEnabled, 
    toggleAutoSync 
  } = useStore();
  
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    // 最終同期時刻を更新
    if (state.lastSyncAt) {
      setLastSyncTime(new Date(state.lastSyncAt));
    }
  }, [state.lastSyncAt]);

  // クラウドからデータを取得
  const handleSync = async () => {
    setSyncing(true);
    try {
      await loadFromDatabase();
      toast.success('データを同期しました');
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('同期に失敗しました');
    } finally {
      setSyncing(false);
    }
  };

  // 未同期データをクラウドに送信
  const handleUpload = async () => {
    setUploading(true);
    try {
      const success = await syncWithDatabase();
      if (success) {
        toast.success('未同期データを送信しました');
        setLastSyncTime(new Date());
      } else {
        toast.error('送信に失敗しました');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('送信に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // 最終同期時刻からの経過時間を計算
  const getTimeSinceLastSync = () => {
    if (!lastSyncTime) return '未同期';
    
    const now = new Date();
    const diffMs = now - lastSyncTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays > 0) return `${diffDays}日前`;
    if (diffHours > 0) return `${diffHours}時間前`;
    if (diffMins > 0) return `${diffMins}分前`;
    return 'たった今';
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            データ同期
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            クラウドとローカルデータの同期を管理します
          </p>
        </CardContent>
      </Card>

      {/* 同期ステータス */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            同期ステータス
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {autoSyncEnabled ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span className="font-medium">
                  {autoSyncEnabled ? '自動同期 ON' : '自動同期 OFF'}
                </span>
              </div>
              <Badge variant={autoSyncEnabled ? 'default' : 'secondary'}>
                {autoSyncEnabled ? 'アクティブ' : '手動モード'}
              </Badge>
            </div>
            
            {lastSyncTime && (
              <div className="text-sm text-muted-foreground">
                最終同期: {getTimeSinceLastSync()}
                <span className="ml-2 text-xs">
                  ({lastSyncTime.toLocaleString('ja-JP')})
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 自動同期設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            自動同期設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium">自動同期</h4>
                <p className="text-sm text-gray-600 mt-1">
                  データ変更時に自動的にクラウドと同期します
                </p>
              </div>
              <button
                onClick={() => toggleAutoSync(!autoSyncEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSyncEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                aria-label="自動同期を切り替え"
              >
                <span className="sr-only">自動同期を切り替え</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {autoSyncEnabled && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
                ✅ 自動同期が有効です。データは自動的にクラウドと同期されます。
              </div>
            )}
            
            {!autoSyncEnabled && (
              <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded">
                ⚠️ 自動同期が無効です。手動で同期を実行してください。
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 手動同期 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            手動同期
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* クラウドから取得 */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Download className="h-4 w-4" />
                クラウドから最新データを取得
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                他のデバイスで変更されたデータを取得します
              </p>
              <Button
                onClick={handleSync}
                disabled={syncing || autoSyncEnabled}
                className="w-full"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    同期中...
                  </>
                ) : (
                  <>
                    <CloudOff className="h-4 w-4 mr-2" />
                    データを同期
                  </>
                )}
              </Button>
            </div>

            {/* クラウドへ送信 */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                未同期データをクラウドに送信
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                ローカルの変更をクラウドに反映します
              </p>
              <Button
                onClick={handleUpload}
                disabled={uploading || autoSyncEnabled}
                variant="secondary"
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4 mr-2" />
                    未同期データを送信
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 統計情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            データ統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {state.transactions.length}
              </div>
              <div className="text-xs text-muted-foreground">総取引数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {state.pendingUpdates?.size || 0}
              </div>
              <div className="text-xs text-muted-foreground">未同期変更</div>
            </div>
          </div>
          
          {/* 未同期データの詳細 */}
          {state.pendingUpdates && state.pendingUpdates.size > 0 && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg">
              <h4 className="text-sm font-medium text-orange-700 mb-2">
                未同期の変更 ({state.pendingUpdates.size}件)
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Array.from(state.pendingUpdates.values()).slice(0, 5).map((tx, idx) => (
                  <div key={idx} className="text-xs text-orange-600">
                    {tx.date} - {tx.description || tx.category} 
                    {tx.amount && ` (¥${Math.abs(tx.amount).toLocaleString()})`}
                  </div>
                ))}
                {state.pendingUpdates.size > 5 && (
                  <div className="text-xs text-orange-500 font-medium">
                    他 {state.pendingUpdates.size - 5} 件の変更
                  </div>
                )}
              </div>
              <p className="text-xs text-orange-600 mt-2">
                💡 自動同期がOFFの場合は「未同期データを送信」ボタンで同期してください
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}