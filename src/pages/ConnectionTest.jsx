import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Wifi, WifiOff, Globe, Database, Key, Shield } from 'lucide-react';

export default function ConnectionTest() {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [environmentInfo, setEnvironmentInfo] = useState({});

  useEffect(() => {
    // 環境情報を取得
    const info = {
      currentURL: window.location.href,
      origin: window.location.origin,
      protocol: window.location.protocol,
      host: window.location.host,
      isLocalhost: window.location.hostname === 'localhost',
      isProduction: window.location.hostname !== 'localhost',
      supabaseURL: import.meta.env.VITE_SUPABASE_URL || 'Not configured',
      hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      userAgent: navigator.userAgent,
      timestamp: new Date().toLocaleString('ja-JP')
    };
    setEnvironmentInfo(info);
  }, []);

  const tests = [
    { 
      id: 'env', 
      name: '環境変数チェック', 
      fn: async () => {
        try {
          const url = import.meta.env.VITE_SUPABASE_URL;
          const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
          
          if (!url || !key) {
            return { 
              status: 'error', 
              message: '環境変数が設定されていません',
              details: {
                hasURL: !!url,
                hasKey: !!key,
                urlValue: url ? `${url.substring(0, 30)}...` : 'undefined',
              }
            };
          }
          
          return { 
            status: 'success', 
            message: '環境変数が正しく設定されています',
            details: {
              supabaseURL: `${url.substring(0, 30)}...`,
              hasAnonKey: true
            }
          };
        } catch (error) {
          return { status: 'error', message: '環境変数の確認に失敗', details: error };
        }
      }
    },
    { 
      id: 'supabase', 
      name: 'Supabase初期化チェック', 
      fn: async () => {
        try {
          if (!supabase) {
            return { 
              status: 'error', 
              message: 'Supabaseクライアントが初期化されていません',
              details: { initialized: false }
            };
          }
          
          return { 
            status: 'success', 
            message: 'Supabaseクライアントが初期化されています',
            details: { 
              initialized: true,
              hasAuth: !!supabase.auth,
              hasFrom: !!supabase.from,
              hasRpc: !!supabase.rpc
            }
          };
        } catch (error) {
          return { status: 'error', message: 'Supabase初期化エラー', details: error };
        }
      }
    },
    { 
      id: 'auth', 
      name: '認証状態確認', 
      fn: async () => {
        try {
          if (!supabase) {
            return { status: 'warning', message: 'Supabaseが初期化されていません' };
          }
          
          const { data: { user }, error } = await supabase.auth.getUser();
          
          if (error) {
            return { 
              status: 'warning', 
              message: '認証エラー（ログインしていない可能性）',
              details: {
                error: error.message,
                code: error.code,
                status: error.status
              }
            };
          }
          
          if (!user) {
            return { 
              status: 'info', 
              message: 'ログインしていません',
              details: { authenticated: false }
            };
          }
          
          return { 
            status: 'success', 
            message: 'ログイン済み',
            details: { 
              userId: user.id,
              email: user.email,
              authenticated: true
            }
          };
        } catch (error) {
          return { 
            status: 'error', 
            message: '認証確認エラー', 
            details: { 
              message: error.message,
              stack: error.stack 
            }
          };
        }
      }
    },
    { 
      id: 'cors', 
      name: 'CORS/ネットワークテスト', 
      fn: async () => {
        try {
          if (!supabase) {
            return { status: 'error', message: 'Supabaseが初期化されていません' };
          }
          
          // シンプルなテーブルアクセステスト
          const { data, error, status, statusText } = await supabase
            .from('transactions')
            .select('count')
            .limit(1)
            .single();
          
          if (error) {
            // CORSエラーの判定
            if (error.message && error.message.includes('CORS')) {
              return { 
                status: 'error', 
                message: 'CORSエラー: SupabaseでこのURLを許可してください',
                details: {
                  currentOrigin: window.location.origin,
                  error: error.message,
                  hint: 'Supabase Dashboard → Authentication → URL Configuration で設定'
                }
              };
            }
            
            // ネットワークエラー
            if (error.code === 'ECONNREFUSED' || error.message.includes('fetch')) {
              return { 
                status: 'error', 
                message: 'ネットワークエラー: Supabaseに接続できません',
                details: {
                  error: error.message,
                  code: error.code,
                  hint: 'インターネット接続とSupabase URLを確認してください'
                }
              };
            }
            
            // その他のエラー
            return { 
              status: 'warning', 
              message: 'データベースアクセスエラー（テーブルが存在しない可能性）',
              details: {
                error: error.message,
                code: error.code,
                hint: error.hint,
                httpStatus: status
              }
            };
          }
          
          return { 
            status: 'success', 
            message: 'CORS設定OK - データベースアクセス成功',
            details: { 
              httpStatus: status || 200,
              dataReceived: !!data
            }
          };
        } catch (error) {
          // fetchエラーをキャッチ
          if (error.message && error.message.includes('Failed to fetch')) {
            return { 
              status: 'error', 
              message: 'ネットワークエラー: CORSポリシーによりブロックされています',
              details: {
                currentOrigin: window.location.origin,
                error: error.message,
                solution: `Supabaseダッシュボードで "${window.location.origin}" を許可してください`
              }
            };
          }
          
          return { 
            status: 'error', 
            message: 'ネットワークテスト失敗', 
            details: {
              message: error.message,
              type: error.name,
              stack: error.stack
            }
          };
        }
      }
    },
    { 
      id: 'tables', 
      name: 'テーブル存在確認', 
      fn: async () => {
        try {
          if (!supabase) {
            return { status: 'error', message: 'Supabaseが初期化されていません' };
          }
          
          const tables = ['transactions', 'rules', 'user_preferences'];
          const results = {};
          
          for (const table of tables) {
            try {
              const { error } = await supabase
                .from(table)
                .select('count')
                .limit(1)
                .single();
              
              results[table] = !error;
            } catch {
              results[table] = false;
            }
          }
          
          const allExist = Object.values(results).every(v => v);
          
          return { 
            status: allExist ? 'success' : 'warning', 
            message: allExist ? '全テーブルが存在します' : '一部のテーブルが存在しません',
            details: results
          };
        } catch (error) {
          return { status: 'error', message: 'テーブル確認エラー', details: error };
        }
      }
    }
  ];

  const runAllTests = async () => {
    setLoading(true);
    const results = {};

    for (const test of tests) {
      results[test.id] = { status: 'running', name: test.name };
      setTestResults({ ...results });
      
      const result = await test.fn();
      results[test.id] = { ...result, name: test.name };
      setTestResults({ ...results });
      
      // 少し待機（視覚的効果のため）
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setLoading(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary',
      info: 'outline',
      running: 'outline'
    };
    return variants[status] || 'outline';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              接続テスト - Supabase & CORS診断
            </span>
            <Button 
              onClick={runAllTests} 
              disabled={loading}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              テスト実行
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-600">
                <Globe className="w-4 h-4" />
                <span className="font-medium">現在のURL:</span>
              </div>
              <div className="text-gray-800 break-all">{environmentInfo.currentURL}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-600">
                <Database className="w-4 h-4" />
                <span className="font-medium">Supabase URL:</span>
              </div>
              <div className="text-gray-800 break-all">{environmentInfo.supabaseURL}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-600">
                <Shield className="w-4 h-4" />
                <span className="font-medium">環境:</span>
              </div>
              <div className="text-gray-800">
                {environmentInfo.isProduction ? '本番環境' : 'ローカル環境'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-gray-600">
                <Key className="w-4 h-4" />
                <span className="font-medium">APIキー:</span>
              </div>
              <div className="text-gray-800">
                {environmentInfo.hasAnonKey ? '設定済み' : '未設定'}
              </div>
            </div>
          </div>

          {/* CORSエラーの場合の解決方法 */}
          {testResults.cors?.status === 'error' && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>CORS設定が必要です</AlertTitle>
              <AlertDescription className="mt-2">
                <p>Supabaseダッシュボードで以下の設定を行ってください：</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Authentication → URL Configuration を開く</li>
                  <li>Site URL に <code className="bg-white px-1 rounded">{window.location.origin}</code> を設定</li>
                  <li>Redirect URLs にも同じURLを追加</li>
                  <li>保存後、このページを再読み込み</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {tests.map((test) => {
              const result = testResults[test.id];
              return (
                <Card key={test.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {result && getStatusIcon(result.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{test.name}</h3>
                            {result && (
                              <Badge variant={getStatusBadge(result.status)}>
                                {result.status}
                              </Badge>
                            )}
                          </div>
                          {result && result.message && (
                            <p className="text-sm text-gray-600">{result.message}</p>
                          )}
                          {result && result.details && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                詳細情報
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">テスト時刻</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{environmentInfo.timestamp}</p>
        </CardContent>
      </Card>
    </div>
  );
}