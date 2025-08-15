import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function DatabaseTest() {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      if (!supabase) {
        // Supabaseが初期化されていない場合（ローカルモード）
        setUser({ id: 'local-user', email: 'local@example.com' });
        return;
      }
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user || { id: 'test-user', email: 'test@example.com' });
        if (user) {
          runAllTests(user.id);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser({ id: 'test-user', email: 'test@example.com' });
      }
    };
    checkUser();
  }, []);

  const tests = [
    { id: 'connection', name: 'Supabase接続テスト', fn: testConnection },
    { id: 'auth', name: '認証状態確認', fn: testAuth },
    { id: 'schema', name: 'テーブルスキーマ確認', fn: testSchema },
    { id: 'columns', name: 'カラム詳細確認（transactions）', fn: testColumns },
    { id: 'rulesSchema', name: 'ルールテーブル確認', fn: testRulesTable },
    { id: 'rulesInsert', name: 'ルール挿入テスト', fn: testRulesInsert },
    { id: 'insert', name: 'データ挿入テスト', fn: testInsert },
    { id: 'select', name: 'データ取得テスト', fn: testSelect },
    { id: 'update', name: 'データ更新テスト', fn: testUpdate },
    { id: 'rls', name: 'RLSポリシー確認', fn: testRLS },
  ];

  async function testConnection() {
    try {
      if (!supabase) {
        return { status: 'error', message: 'Supabaseが初期化されていません（ローカルモード）', details: { mode: 'local' } };
      }
      
      const { data, error } = await supabase
        .from('transactions')
        .select('count', { count: 'exact', head: true });
      
      if (error) throw error;
      return { status: 'success', message: 'Supabase接続成功', details: { count: data } };
    } catch (error) {
      return { status: 'error', message: 'Supabase接続失敗', details: error };
    }
  }

  async function testAuth() {
    try {
      if (!supabase) {
        return { 
          status: 'warning', 
          message: 'ローカルモード（認証なし）',
          details: { mode: 'local', userId: 'local-user' }
        };
      }
      
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error('ユーザーが認証されていません');
      
      return { 
        status: 'success', 
        message: '認証成功',
        details: { userId: user.id, email: user.email }
      };
    } catch (error) {
      return { status: 'error', message: '認証失敗', details: error };
    }
  }

  async function testSchema() {
    if (!supabase) {
      return { status: 'warning', message: 'ローカルモード（データベースなし）', details: { mode: 'local' } };
    }
    
    try {
      // まずテーブルの存在を確認
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .limit(1);

      if (error) {
        // エラーの詳細情報を取得
        const errorDetails = {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        };
        
        // テーブルが存在しない場合
        if (error.code === '42P01') {
          return { 
            status: 'error', 
            message: 'transactionsテーブルが存在しません',
            details: errorDetails
          };
        }
        
        // その他のエラー
        return { 
          status: 'error', 
          message: 'スキーマ確認エラー',
          details: errorDetails
        };
      }

      return { 
        status: 'success', 
        message: 'テーブルスキーマ確認完了',
        details: { 
          tableExists: true,
          sampleData: data?.length > 0 ? Object.keys(data[0]) : 'データなし'
        }
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: 'スキーマ確認失敗', 
        details: {
          errorType: error.constructor.name,
          message: error.message,
          stack: error.stack
        }
      };
    }
  }

  async function testColumns() {
    if (!supabase) {
      return { status: 'warning', message: 'ローカルモード（データベースなし）', details: { mode: 'local' } };
    }
    
    try {
      // 必要なカラムのリスト
      const requiredColumns = [
        'id', 'user_id', 'date', 'occurred_on', 'amount',
        'category', 'description', 'detail', 'memo', 'kind',
        'hash', 'exclude_from_totals'
      ];
      
      // ダミーデータを挿入してカラムを確認
      const testData = {
        id: crypto.randomUUID(),
        user_id: user?.id || 'test-user-id',
        date: new Date().toISOString().split('T')[0],
        occurred_on: new Date().toISOString().split('T')[0],
        amount: 0,
        category: 'テスト',
        description: 'カラムテスト',
        detail: '',
        memo: '',
        kind: 'expense',
        hash: 'test-hash',
        exclude_from_totals: false
      };

      // 挿入を試みる（実際には挿入しない）
      const { error } = await supabase
        .from('transactions')
        .insert([testData])
        .select()
        .single();

      if (error) {
        // エラーメッセージからカラム情報を抽出
        const missingColumns = [];
        const errorMessage = error.message || '';
        const errorCode = error.code || '';
        
        // カラムが存在しないエラーをチェック
        if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
          const match = errorMessage.match(/column "([^"]+)" does not exist/);
          if (match) {
            missingColumns.push(match[1]);
          }
        } else if (errorCode === '42703') {
          // PostgreSQLのカラムが存在しないエラーコード
          const matches = errorMessage.match(/column "([^"]+)"/g);
          if (matches) {
            matches.forEach(m => {
              const col = m.match(/"([^"]+)"/)?.[1];
              if (col) missingColumns.push(col);
            });
          }
        }

        return {
          status: 'error',
          message: `カラムエラー: ${missingColumns.length > 0 ? missingColumns.join(', ') + ' が不足' : 'カラム構造の不一致'}`,
          details: {
            errorCode,
            errorMessage,
            missingColumns: missingColumns.length > 0 ? missingColumns : null,
            requiredColumns,
            testData: Object.keys(testData)
          }
        };
      }

      // 挿入成功した場合は削除
      await supabase
        .from('transactions')
        .delete()
        .eq('id', testData.id);

      return {
        status: 'success',
        message: '全カラム存在確認',
        details: { allColumnsExist: true }
      };
    } catch (error) {
      return { status: 'error', message: 'カラム確認失敗', details: error };
    }
  }

  async function testInsert() {
    if (!supabase) {
      return { status: 'warning', message: 'ローカルモード（データベースなし）', details: { mode: 'local' } };
    }
    if (!user) return { status: 'error', message: 'ユーザー未認証' };

    try {
      const testData = {
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        occurred_on: new Date().toISOString().split('T')[0],
        amount: -1000,
        category: 'テスト',
        description: 'テストデータ',
        detail: '詳細',
        memo: 'メモ',
        kind: 'expense',
        hash: `test-${Date.now()}`,
        exclude_from_totals: false
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([testData])
        .select()
        .single();

      if (error) throw error;

      // テストデータを削除
      if (data?.id) {
        await supabase.from('transactions').delete().eq('id', data.id);
      }

      return { 
        status: 'success', 
        message: 'データ挿入成功',
        details: { insertedId: data?.id }
      };
    } catch (error) {
      return { status: 'error', message: 'データ挿入失敗', details: error };
    }
  }

  async function testSelect() {
    if (!supabase) {
      return { status: 'warning', message: 'ローカルモード（データベースなし）', details: { mode: 'local' } };
    }
    if (!user) return { status: 'error', message: 'ユーザー未認証' };

    try {
      const { data, error, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .limit(5);

      if (error) throw error;

      return { 
        status: 'success', 
        message: 'データ取得成功',
        details: { 
          recordCount: count || 0,
          sampleData: data?.length > 0 ? data[0] : null
        }
      };
    } catch (error) {
      return { status: 'error', message: 'データ取得失敗', details: error };
    }
  }

  async function testUpdate() {
    if (!supabase) {
      return { status: 'warning', message: 'ローカルモード（データベースなし）', details: { mode: 'local' } };
    }
    if (!user) return { status: 'error', message: 'ユーザー未認証' };

    try {
      // テストデータを挿入
      const testData = {
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        occurred_on: new Date().toISOString().split('T')[0],
        amount: -2000,
        category: '更新テスト',
        description: '更新前',
        kind: 'expense',
        hash: `update-test-${Date.now()}`
      };

      const { data: inserted, error: insertError } = await supabase
        .from('transactions')
        .insert([testData])
        .select()
        .single();

      if (insertError) throw insertError;

      // データを更新
      const { data: updated, error: updateError } = await supabase
        .from('transactions')
        .update({ description: '更新後' })
        .eq('id', inserted.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // テストデータを削除
      await supabase.from('transactions').delete().eq('id', inserted.id);

      return { 
        status: 'success', 
        message: 'データ更新成功',
        details: { 
          before: inserted.description,
          after: updated.description
        }
      };
    } catch (error) {
      return { status: 'error', message: 'データ更新失敗', details: error };
    }
  }

  async function testRulesTable() {
    if (!supabase) {
      return { status: 'warning', message: 'ローカルモード（データベースなし）', details: { mode: 'local' } };
    }
    
    try {
      // rulesテーブルの存在を確認
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .limit(1);

      if (error) {
        // エラーの詳細情報を取得
        const errorDetails = {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        };
        
        // テーブルが存在しない場合
        if (error.code === '42P01') {
          return { 
            status: 'error', 
            message: 'rulesテーブルが存在しません',
            details: errorDetails
          };
        }
        
        // その他のエラー
        return { 
          status: 'error', 
          message: 'rulesテーブル確認エラー',
          details: errorDetails
        };
      }

      return { 
        status: 'success', 
        message: 'rulesテーブル確認完了',
        details: { 
          tableExists: true,
          sampleData: data?.length > 0 ? Object.keys(data[0]) : 'データなし'
        }
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: 'rulesテーブル確認失敗', 
        details: {
          errorType: error.constructor.name,
          message: error.message,
          stack: error.stack
        }
      };
    }
  }

  async function testRulesInsert() {
    if (!supabase) {
      return { status: 'warning', message: 'ローカルモード（データベースなし）', details: { mode: 'local' } };
    }
    if (!user) return { status: 'error', message: 'ユーザー未認証' };

    try {
      const testRule = {
        user_id: user.id,
        pattern: 'テストパターン',
        category: 'テストカテゴリ',
        target: 'description',
        mode: 'contains',
        kind: 'expense'
      };

      const { data, error } = await supabase
        .from('rules')
        .insert([testRule])
        .select()
        .single();

      if (error) {
        return { 
          status: 'error', 
          message: 'ルール挿入失敗',
          details: {
            errorCode: error.code,
            errorMessage: error.message,
            hint: error.hint,
            testData: testRule
          }
        };
      }

      // テストデータを削除
      if (data?.id) {
        await supabase.from('rules').delete().eq('id', data.id);
      }

      return { 
        status: 'success', 
        message: 'ルール挿入成功',
        details: { insertedId: data?.id }
      };
    } catch (error) {
      return { status: 'error', message: 'ルール挿入失敗', details: error };
    }
  }

  async function testRLS() {
    if (!supabase) {
      return { status: 'warning', message: 'ローカルモード（データベースなし）', details: { mode: 'local' } };
    }
    if (!user) return { status: 'error', message: 'ユーザー未認証' };

    try {
      // 他のユーザーのデータにアクセスを試みる（失敗するはず）
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', fakeUserId)
        .limit(1);

      // RLSが有効ならデータは空のはず
      const rlsWorking = !data || data.length === 0;

      return { 
        status: rlsWorking ? 'success' : 'warning', 
        message: rlsWorking ? 'RLS正常動作' : 'RLS確認必要',
        details: { 
          rlsEnabled: rlsWorking,
          testUserId: fakeUserId,
          dataReturned: data?.length || 0
        }
      };
    } catch (error) {
      return { status: 'error', message: 'RLS確認失敗', details: error };
    }
  }

  async function runAllTests(userId) {
    setLoading(true);
    const results = {};

    for (const test of tests) {
      results[test.id] = { status: 'running', name: test.name };
      setTestResults({ ...results });
      
      const result = await test.fn();
      results[test.id] = { ...result, name: test.name };
      setTestResults({ ...results });
    }

    setLoading(false);
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
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
      running: 'outline'
    };
    return variants[status] || 'outline';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>データベース診断ツール</span>
            <Button 
              onClick={() => user && runAllTests(user.id)} 
              disabled={loading || !user}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              再テスト
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!user ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600">ログインが必要です</p>
            </div>
          ) : (
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
                                <summary className="text-xs text-gray-500 cursor-pointer">
                                  詳細情報
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}