import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { toast } from 'react-hot-toast';

export default function AccountLink({ user }) {
  const [loading, setLoading] = useState(false);
  const [identities, setIdentities] = useState([]);
  const [availableProviders, setAvailableProviders] = useState([]);

  // 利用可能なプロバイダー
  const providers = [
    { id: 'google', name: 'Google', icon: '🔍' },
    { id: 'github', name: 'GitHub', icon: '🐙' }
  ];

  useEffect(() => {
    if (user) {
      fetchIdentities();
    }
  }, [user]);

  const fetchIdentities = async () => {
    try {
      // 現在のユーザーのidentitiesを取得
      const { data: { user: userData }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (userData?.identities) {
        setIdentities(userData.identities);
        
        // 連携されていないプロバイダーを特定
        const linkedProviders = userData.identities.map(id => id.provider);
        const available = providers.filter(p => !linkedProviders.includes(p.id));
        setAvailableProviders(available);
      }
    } catch (error) {
      console.error('Error fetching identities:', error);
      toast.error('アカウント情報の取得に失敗しました');
    }
  };

  const handleLinkAccount = async (provider) => {
    setLoading(true);
    
    try {
      // 現在のセッショントークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('ログインセッションが見つかりません');
        return;
      }

      // プロバイダーとアカウントをリンク
      const { data, error } = await supabase.auth.linkIdentity({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/settings`,
          scopes: provider === 'github' ? 'read:user user:email' : undefined,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined,
        },
      });

      if (error) {
        if (error.message?.includes('already been associated')) {
          toast.error('このアカウントは既に別のユーザーに連携されています');
        } else {
          throw error;
        }
      } else if (data?.url) {
        // 認証画面へリダイレクト
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Link account error:', error);
      toast.error(`アカウント連携に失敗しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkAccount = async (identity) => {
    if (identities.length <= 1) {
      toast.error('最後の認証方法は解除できません');
      return;
    }

    if (!confirm(`${identity.provider}アカウントの連携を解除しますか？`)) {
      return;
    }

    setLoading(true);
    
    try {
      // Manual linkingが無効の場合のエラーハンドリング
      const { error } = await supabase.auth.unlinkIdentity({
        identity_id: identity.id,
      });

      if (error) {
        if (error.message?.includes('Manual linking is disabled')) {
          toast.error(
            'アカウント連携の解除機能は現在利用できません。\n' +
            'Supabaseダッシュボードで「Manual linking」を有効にする必要があります。'
          );
          
          // 管理者向けの情報を表示
          console.info(
            '連携解除を有効にする方法:\n' +
            '1. Supabaseダッシュボードにログイン\n' +
            '2. Authentication > Providers に移動\n' + 
            '3. 「Allow Manual Linking」を有効化'
          );
          return;
        }
        throw error;
      }

      toast.success('アカウント連携を解除しました');
      await supabase.auth.refreshSession();
      await fetchIdentities();
    } catch (error) {
      console.error('Unlink account error:', error);
      toast.error(`連携解除に失敗しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">ログインしてください</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">連携済みアカウント</h3>
        
        {identities.length === 0 ? (
          <p className="text-gray-500">連携されたアカウントはありません</p>
        ) : (
          <div className="space-y-2">
            {identities.map((identity) => {
              const provider = providers.find(p => p.id === identity.provider);
              return (
                <div
                  key={identity.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider?.icon || '🔐'}</span>
                    <div>
                      <p className="font-medium">{provider?.name || identity.provider}</p>
                      <p className="text-sm text-gray-500">
                        {identity.identity_data?.email || identity.identity_data?.user_name || 'Connected'}
                      </p>
                      <p className="text-xs text-gray-400">
                        連携日: {new Date(identity.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  
                  {identities.length > 1 && (
                    <button
                      onClick={() => handleUnlinkAccount(identity)}
                      disabled={loading}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                      連携解除
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {availableProviders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">アカウントを追加連携</h3>
          <p className="text-sm text-gray-600 mb-4">
            複数のログイン方法を連携することで、どの方法でも同じデータにアクセスできます。
          </p>
          
          <div className="space-y-2">
            {availableProviders.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleLinkAccount(provider.id)}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <span className="text-2xl">{provider.icon}</span>
                <span className="font-medium">{provider.name}を連携</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {identities.length > 0 && availableProviders.length === 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">
            ✅ すべての利用可能な認証方法が連携されています
          </p>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 アカウント連携について</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 複数の認証方法を連携すると、どの方法でも同じデータにアクセスできます</li>
          <li>• パソコンはGoogle、スマホはGitHubなど、デバイスごとに使い分けても同じデータを共有</li>
          <li>• 最低1つの認証方法は維持する必要があります</li>
        </ul>
      </div>

      {/* Manual linking無効時の案内 */}
      {identities.length > 1 && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-900 mb-2">⚠️ 連携解除について</h4>
          <p className="text-sm text-amber-800 mb-2">
            連携解除機能を利用するには、Supabaseの設定変更が必要です：
          </p>
          <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
            <li>Supabaseダッシュボードにログイン</li>
            <li>Authentication → Providers に移動</li>
            <li>「Allow Manual Linking」を有効化</li>
          </ol>
          <p className="text-xs text-amber-600 mt-2">
            ※この設定は管理者のみ変更可能です
          </p>
        </div>
      )}
    </div>
  );
}