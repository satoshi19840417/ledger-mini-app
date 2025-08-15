import { useState } from 'react';
import { useSession } from '../useSession';
import { supabase } from '../lib/supabaseClient';
import { dbService } from '../services/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Upload,
  Download,
  Shield,
  Server
} from 'lucide-react';

export default function DatabaseTest() {
  const { session } = useSession();
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  const tests = [
    {
      id: 'connection',
      name: 'Supabase接続テスト',
      description: 'Supabaseへの接続を確認',
      icon: Server,
      action: async () => {
        if (!supabase) throw new Error('Supabaseクライアントが初期化されていません');
        const { data, error } = await supabase.from('profiles').select('count').single();
        if (error && error.code !== 'PGRST116') throw error;
        return { success: true, message: 'Supabase接続成功' };
      }
    },
    {
      id: 'auth',
      name: '認証状態確認',
      description: '現在のユーザー認証状態を確認',
      icon: Shield,
      action: async () => {
        if (!session) throw new Error('ログインしていません');
        if (!session.user?.id) throw new Error('ユーザーIDが取得できません');
        return {
          success: true,
          message: `認証済み: ${session.user.email}`,
          data: {
            userId: session.user.id,
            email: session.user.email,
            provider: session.user.app_metadata?.provider
          }
        };
      }
    },
    {
      id: 'schema_transactions',
      name: 'transactionsテーブル構造確認',
      description: 'transactionsテーブルのスキーマを確認',
      icon: Database,
      action: async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .limit(0);
        
        if (error) {
          throw new Error(`テーブルアクセスエラー: ${error.message}`);
        }
        
        // テーブル情報を取得
        const { data: columns, error: schemaError } = await supabase
          .rpc('get_table_columns', { table_name: 'transactions' })
          .catch(() => ({ data: null, error: null }));
        
        return {
          success: true,
          message: 'transactionsテーブルアクセス成功',
          data: {
            columns: columns || 'スキーマ情報取得不可（権限不足の可能性）'
          }
        };
      }
    },
    {
      id: 'schema_rules',
      name: 'rulesテーブル構造確認',
      description: 'rulesテーブルのスキーマを確認',
      icon: Database,
      action: async () => {
        const { data, error } = await supabase
          .from('rules')
          .select('*')
          .limit(0);
        
        if (error) {
          throw new Error(`テーブルアクセスエラー: ${error.message}`);
        }
        
        return {
          success: true,
          message: 'rulesテーブルアクセス成功'
        };
      }
    },
    {
      id: 'read_transactions',
      name: 'トランザクション読み取りテスト',
      description: 'データベースからトランザクションを読み取り',
      icon: Download,
      action: async () => {
        if (!session?.user?.id) throw new Error('ユーザーIDが必要です');
        
        const result = await dbService.loadTransactions(session.user.id);
        if (!result.success) throw new Error(result.error?.message || '読み取り失敗');
        
        return {
          success: true,
          message: `${result.data?.length || 0}件のトランザクションを取得`,
          data: {
            count: result.data?.length || 0,
            sample: result.data?.[0] || null
          }
        };
      }
    },
    {
      id: 'write_transaction',
      name: 'トランザクション書き込みテスト',
      description: 'テストトランザクションを作成・削除',
      icon: Upload,
      action: async () => {
        if (!session?.user?.id) throw new Error('ユーザーIDが必要です');
        
        const testTx = {
          id: crypto.randomUUID(),
          date: new Date().toISOString().split('T')[0],
          amount: -1000,
          description: 'データベーステスト用トランザクション',
          category: 'テスト',
          kind: 'expense'
        };
        
        console.log('Test transaction:', testTx);
        
        // 書き込みテスト
        const writeResult = await dbService.syncTransactions(session.user.id, [testTx]);
        console.log('Write result:', writeResult);
        
        if (!writeResult.success) {
          const errorDetails = {
            error: writeResult.error,
            testData: testTx,
            userId: session.user.id
          };
          console.error('Write failed:', errorDetails);
          throw new Error('書き込み失敗: ' + JSON.stringify(writeResult.error));
        }
        
        // 削除テスト
        const deleteResult = await dbService.deleteTransaction(session.user.id, testTx.id);
        if (!deleteResult.success) throw new Error('削除失敗: ' + JSON.stringify(deleteResult.error));
        
        return {
          success: true,
          message: 'トランザクションの作成と削除に成功',
          data: {
            createdId: testTx.id,
            writeResult: writeResult.data
          }
        };
      }
    },
    {
      id: 'batch_write',
      name: 'バッチ書き込みテスト',
      description: '複数トランザクションの一括書き込み',
      icon: Upload,
      action: async () => {
        if (!session?.user?.id) throw new Error('ユーザーIDが必要です');
        
        const testTransactions = Array.from({ length: 5 }, (_, i) => ({
          id: crypto.randomUUID(),
          date: new Date().toISOString().split('T')[0],
          amount: -(1000 + i * 100),
          description: `バッチテスト ${i + 1}`,
          category: 'テスト',
          kind: 'expense'
        }));
        
        console.log('Batch test transactions:', testTransactions);
        
        // バッチ書き込み
        const writeResult = await dbService.syncTransactions(session.user.id, testTransactions);
        console.log('Batch write result:', writeResult);
        
        if (!writeResult.success) {
          const errorDetails = {
            error: writeResult.error,
            testData: testTransactions,
            userId: session.user.id
          };
          console.error('Batch write failed:', errorDetails);
          throw new Error('バッチ書き込み失敗: ' + JSON.stringify(writeResult.error));
        }
        
        // クリーンアップ
        let deletedCount = 0;
        for (const tx of testTransactions) {
          const deleteResult = await dbService.deleteTransaction(session.user.id, tx.id);
          if (deleteResult.success) deletedCount++;
        }
        
        return {
          success: true,
          message: `${testTransactions.length}件のバッチ書き込みと${deletedCount}件の削除に成功`,
          data: {
            written: testTransactions.length,
            deleted: deletedCount
          }
        };
      }
    },
    {
      id: 'rls_check',
      name: 'RLS（行レベルセキュリティ）確認',
      description: '他ユーザーのデータへのアクセス制限を確認',
      icon: Shield,
      action: async () => {
        if (!session?.user?.id) throw new Error('ユーザーIDが必要です');
        
        // 存在しない別のユーザーIDでアクセスを試みる
        const fakeUserId = '00000000-0000-0000-0000-000000000000';
        
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', fakeUserId);
        
        if (data && data.length > 0) {
          throw new Error('RLSが正しく設定されていません - 他ユーザーのデータにアクセス可能');
        }
        
        return {
          success: true,
          message: 'RLSが正しく設定されています',
          data: {
            currentUserId: session.user.id,
            testedUserId: fakeUserId,
            accessDenied: true
          }
        };
      }
    }
  ];

  const runTest = async (test) => {
    setCurrentTest(test.id);
    setTestResults(prev => ({
      ...prev,
      [test.id]: { status: 'running' }
    }));

    try {
      const result = await test.action();
      setTestResults(prev => ({
        ...prev,
        [test.id]: {
          status: 'success',
          ...result
        }
      }));
    } catch (error) {
      console.error(`Test ${test.id} failed:`, error);
      setTestResults(prev => ({
        ...prev,
        [test.id]: {
          status: 'error',
          message: error.message || 'テスト失敗',
          error: error
        }
      }));
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults({});
    
    for (const test of tests) {
      await runTest(test);
      // 各テスト間に少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunning(false);
    setCurrentTest('');
  };

  const clearResults = () => {
    setTestResults({});
    setCurrentTest('');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">成功</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">失敗</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">実行中</Badge>;
      default:
        return <Badge variant="secondary">未実行</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">データベーステスト</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={clearResults}
            variant="outline"
            disabled={isRunning}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            クリア
          </Button>
          <Button
            onClick={runAllTests}
            disabled={isRunning || !session}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            すべてのテストを実行
          </Button>
        </div>
      </div>

      {!session && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            データベーステストを実行するにはログインが必要です。
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {tests.map(test => {
          const result = testResults[test.id];
          const Icon = test.icon;
          
          return (
            <Card key={test.id} className={currentTest === test.id ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    {result && getStatusBadge(result.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    {result && getStatusIcon(result.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runTest(test)}
                      disabled={isRunning || !session}
                    >
                      実行
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
              </CardHeader>
              
              {result && (
                <CardContent>
                  <div className="space-y-2">
                    {result.message && (
                      <Alert variant={result.status === 'error' ? 'destructive' : 'default'}>
                        <AlertDescription>{result.message}</AlertDescription>
                      </Alert>
                    )}
                    
                    {result.data && (
                      <div className="bg-muted p-3 rounded-md">
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {result.error && (
                      <details className="cursor-pointer">
                        <summary className="text-sm text-muted-foreground hover:text-foreground">
                          エラー詳細を表示
                        </summary>
                        <div className="mt-2 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                          <pre className="text-xs text-red-800 dark:text-red-200 overflow-x-auto">
                            {JSON.stringify({
                              message: result.error.message,
                              stack: result.error.stack,
                              ...result.error
                            }, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* テスト結果サマリー */}
      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>テスト結果サマリー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  成功: {Object.values(testResults).filter(r => r.status === 'success').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm">
                  失敗: {Object.values(testResults).filter(r => r.status === 'error').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  未実行: {tests.length - Object.keys(testResults).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}