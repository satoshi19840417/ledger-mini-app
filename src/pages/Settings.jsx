import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import AccountLink from '../components/AccountLink.jsx';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/database.js';
import { useStore } from '../state/StoreContextWithDB.jsx';

export default function Settings() {
  const { state, dispatch, loadFromDatabase, syncWithDatabase, autoSyncEnabled, toggleAutoSync } = useStore();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('account');
  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUser();
    
    // 認証状態の変更をリッスン
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user || null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // StoreContextのprofileから表示名を同期
  useEffect(() => {
    if (state.profile?.display_name !== undefined) {
      setDisplayName(state.profile.display_name || '');
    }
  }, [state.profile]);

  const fetchUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(user);
      
      // プロフィール情報を取得
        if (user) {
          const profileResult = await dbService.loadProfile(user.id);
          if (profileResult.success && profileResult.data) {
            setDisplayName(profileResult.data.display_name || '');
            dispatch({ type: 'setProfile', payload: profileResult.data });
          }
        }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!confirm('ログアウトしますか？')) return;
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('ログアウトしました');
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('ログアウトに失敗しました');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('アカウントを削除しますか？この操作は取り消せません。')) return;
    if (!confirm('本当にアカウントを削除してよろしいですか？すべてのデータが失われます。')) return;
    
    try {
      // Note: Supabaseではクライアント側から直接アカウント削除はできないため、
      // Edge Functionまたはサーバー側の実装が必要です
      toast.error('アカウント削除機能は現在準備中です');
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('アカウント削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">ログインが必要です</h2>
          <p className="text-gray-600 mb-4">設定ページを利用するにはログインしてください</p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ログインページへ
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">設定</h1>
      
      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('account')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'account'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            アカウント
          </button>
          <button
            onClick={() => setActiveTab('linked')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'linked'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            アカウント連携
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'data'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            データ管理
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">アカウント情報</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">ユーザーID</label>
                  <p className="font-mono text-sm">{user.id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">表示名</label>
                  {editingName ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={tempDisplayName}
                        onChange={(e) => setTempDisplayName(e.target.value)}
                        className="px-2 py-1 border rounded"
                        placeholder="表示名を入力"
                        autoFocus
                      />
                        <button
                          onClick={async () => {
                            try {
                              const current = {
                                version: state.profile?.version,
                                updated_at: state.profile?.updated_at,
                              };
                              const result = await dbService.updateProfile(
                                user.id,
                                { display_name: tempDisplayName || null },
                                current
                              );
                              if (result.success) {
                                setDisplayName(result.data.display_name || '');
                                setEditingName(false);
                                dispatch({ type: 'setProfile', payload: result.data });
                                toast.success('表示名を更新しました');
                              } else if (result.conflict) {
                                dispatch({ type: 'setProfile', payload: result.data });
                                setDisplayName(result.data.display_name || '');
                                setTempDisplayName(result.data.display_name || '');
                                setEditingName(true);
                                toast.error('他の端末で更新されました。内容を確認して再度保存してください');
                              } else {
                                throw result.error;
                              }
                            } catch (error) {
                              console.error('Error updating display name:', error);
                              toast.error('表示名の更新に失敗しました');
                            }
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          保存
                        </button>
                      <button
                        onClick={() => {
                          setEditingName(false);
                          setTempDisplayName(displayName);
                        }}
                        className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <p>{displayName || '未設定'}</p>
                      <button
                        onClick={() => {
                          setEditingName(true);
                          setTempDisplayName(displayName);
                        }}
                        className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        編集
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">メールアドレス</label>
                  <p>{user.email || '未設定'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">登録日</label>
                  <p>{new Date(user.created_at).toLocaleDateString('ja-JP')}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">最終ログイン</label>
                  <p>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('ja-JP') : '不明'}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">アカウント操作</h3>
              <div className="space-y-3">
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  ログアウト
                </button>
                <div>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    アカウントを削除
                  </button>
                  <p className="text-xs text-red-600 mt-1">
                    ※ この操作は取り消せません。すべてのデータが削除されます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'linked' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">アカウント連携設定</h2>
            <AccountLink user={user} />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">データ管理</h2>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium mb-2">データ同期</h3>
                  
                  {/* 自動同期のON/OFFトグル */}
                  <div className="mb-4 p-3 bg-white rounded border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">自動同期</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          データ変更時に自動的にクラウドと同期します
                        </p>
                      </div>
                      <button
                        onClick={() => toggleAutoSync(!autoSyncEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          autoSyncEnabled ? 'bg-blue-600' : 'bg-gray-200'
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
                  
                  <p className="text-sm text-gray-600 mb-3">
                    クラウドから最新のデータを取得します。他のデバイスで追加・変更したデータを反映させる場合に使用してください。
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                      {syncing ? '同期中...' : 'データを同期'}
                    </button>
                    {state.lastSyncAt && (
                      <span className="text-sm text-gray-500">
                        最終同期: {new Date(state.lastSyncAt).toLocaleString('ja-JP')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    未同期のローカルデータをクラウドに送信します。
                  </p>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={uploading}
                    onClick={async () => {
                      console.log('未同期データ送信ボタンがクリックされました');
                      setUploading(true);
                      try {
                        console.log('syncWithDatabase関数を呼び出します');
                        const success = await syncWithDatabase();
                        console.log('syncWithDatabase結果:', success);
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
                    {uploading ? '送信中...' : '未同期データを送信'}
                  </button>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">データエクスポート</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    すべての取引データをCSVファイルとしてダウンロードできます
                  </p>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    onClick={() => {
                      // エクスポート機能は既存のページで実装済み
                      window.location.href = '/#/yearly';
                      toast.info('年次分析ページからCSVエクスポートが可能です');
                    }}
                  >
                    エクスポートページへ
                  </button>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">データインポート</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    CSVファイルから取引データを一括インポートできます
                  </p>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    onClick={() => {
                      window.location.href = '/#/import-csv';
                    }}
                  >
                    インポートページへ
                  </button>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-medium mb-2">ローカルストレージ</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    ブラウザに保存されているルール設定をクリアできます
                  </p>
                  <button
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    onClick={() => {
                      if (confirm('ルール設定をクリアしますか？')) {
                        localStorage.removeItem('csvImportRules');
                        toast.success('ルール設定をクリアしました');
                      }
                    }}
                  >
                    ルール設定をクリア
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}