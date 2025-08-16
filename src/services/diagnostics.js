import { supabase } from '../lib/supabaseClient.js';
import { dbService } from './database.js';

export const diagnosticsService = {
  // データベース診断
  async checkDatabase(userId) {
    const results = {
      connection: { status: 'checking', message: 'データベース接続を確認中...' },
      tables: { status: 'checking', message: 'テーブル構造を確認中...' },
      dataIntegrity: { status: 'checking', message: 'データ整合性を確認中...' },
      localStorage: { status: 'checking', message: 'ローカルストレージを確認中...' },
      counts: {}
    };

    try {
      // 1. データベース接続テスト
      const connectionTest = await dbService.testConnection(userId);
      if (connectionTest.success) {
        results.connection = { 
          status: 'success', 
          message: 'データベースに正常に接続できます',
          details: `取引数: ${connectionTest.count || 0}件`
        };
      } else {
        results.connection = { 
          status: 'error', 
          message: 'データベース接続エラー',
          error: connectionTest.error?.message || '不明なエラー'
        };
        return results;
      }

      // 2. 各テーブルのデータ確認
      const tables = ['transactions', 'rules', 'user_preferences', 'profiles'];
      const tableResults = [];
      
      for (const table of tables) {
        try {
          const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: false })
            .eq(table === 'profiles' ? 'id' : 'user_id', userId)
            .limit(1);
          
          if (error) {
            tableResults.push({
              table,
              status: 'error',
              error: error.message
            });
          } else {
            tableResults.push({
              table,
              status: 'success',
              count: count || 0
            });
            results.counts[table] = count || 0;
          }
        } catch (err) {
          tableResults.push({
            table,
            status: 'error',
            error: err.message
          });
        }
      }

      const hasTableErrors = tableResults.some(r => r.status === 'error');
      results.tables = {
        status: hasTableErrors ? 'warning' : 'success',
        message: hasTableErrors ? 'いくつかのテーブルにアクセスできません' : 'すべてのテーブルにアクセス可能',
        details: tableResults
      };

      // 3. データ整合性チェック
      const integrityChecks = [];
      
      // 取引データの日付チェック
      const { data: futureTransactions } = await supabase
        .from('transactions')
        .select('id, date')
        .eq('user_id', userId)
        .gt('date', new Date().toISOString().split('T')[0])
        .limit(10);
      
      if (futureTransactions && futureTransactions.length > 0) {
        integrityChecks.push({
          type: 'warning',
          message: `${futureTransactions.length}件の未来の日付の取引があります`
        });
      }

      // 重複データのチェック
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('date, amount, description, detail')
        .eq('user_id', userId)
        .limit(1000);
      
      if (allTransactions) {
        const duplicates = [];
        const seen = new Map();
        
        for (const tx of allTransactions) {
          const key = `${tx.date}_${tx.amount}_${tx.description}_${tx.detail}`;
          if (seen.has(key)) {
            duplicates.push(key);
          } else {
            seen.set(key, true);
          }
        }
        
        if (duplicates.length > 0) {
          integrityChecks.push({
            type: 'info',
            message: `${duplicates.length}件の重複可能性のある取引があります`
          });
        }
      }

      results.dataIntegrity = {
        status: integrityChecks.some(c => c.type === 'error') ? 'error' : 
                integrityChecks.some(c => c.type === 'warning') ? 'warning' : 'success',
        message: integrityChecks.length > 0 ? 'データに問題が見つかりました' : 'データ整合性は正常です',
        checks: integrityChecks
      };

      // 4. ローカルストレージチェック
      try {
        const localData = {
          transactions: JSON.parse(localStorage.getItem('transactions') || '[]'),
          rules: JSON.parse(localStorage.getItem('rules') || '[]'),
          categories: JSON.parse(localStorage.getItem('categories') || '[]')
        };

        const localCounts = {
          transactions: localData.transactions.length,
          rules: localData.rules.length,
          categories: localData.categories.length
        };

        results.localStorage = {
          status: 'success',
          message: 'ローカルストレージは正常です',
          details: `取引: ${localCounts.transactions}件, ルール: ${localCounts.rules}件, カテゴリ: ${localCounts.categories}件`
        };
      } catch (err) {
        results.localStorage = {
          status: 'warning',
          message: 'ローカルストレージの読み取りエラー',
          error: err.message
        };
      }

    } catch (error) {
      console.error('Database diagnostics error:', error);
      results.connection = {
        status: 'error',
        message: '診断中にエラーが発生しました',
        error: error.message
      };
    }

    return results;
  },

  // ネットワーク診断
  async checkNetwork() {
    const results = {
      internet: { status: 'checking', message: 'インターネット接続を確認中...' },
      supabase: { status: 'checking', message: 'Supabase接続を確認中...' },
      cors: { status: 'checking', message: 'CORS設定を確認中...' },
      latency: { status: 'checking', message: 'レイテンシを測定中...' }
    };

    try {
      // 1. インターネット接続確認
      results.internet = {
        status: navigator.onLine ? 'success' : 'error',
        message: navigator.onLine ? 'インターネットに接続されています' : 'オフラインです'
      };

      if (!navigator.onLine) {
        return results;
      }

      // 2. Supabase接続確認
      const startTime = Date.now();
      try {
        const { data, error } = await supabase.auth.getSession();
        const latency = Date.now() - startTime;
        
        if (error) {
          results.supabase = {
            status: 'error',
            message: 'Supabase接続エラー',
            error: error.message
          };
        } else {
          results.supabase = {
            status: 'success',
            message: 'Supabaseに正常に接続できます',
            details: `認証状態: ${data.session ? 'ログイン済み' : '未ログイン'}`
          };
          
          results.latency = {
            status: latency < 500 ? 'success' : latency < 1000 ? 'warning' : 'error',
            message: `レイテンシ: ${latency}ms`,
            details: latency < 500 ? '高速' : latency < 1000 ? '通常' : '遅延あり'
          };
        }
      } catch (err) {
        results.supabase = {
          status: 'error',
          message: 'Supabase接続失敗',
          error: err.message
        };
      }

      // 3. CORS確認（Supabase APIエンドポイントへのテスト）
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl) {
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'HEAD',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            }
          });
          
          results.cors = {
            status: 'success',
            message: 'CORS設定は正常です'
          };
        } else {
          results.cors = {
            status: 'warning',
            message: 'Supabase URLが設定されていません'
          };
        }
      } catch (err) {
        // CORSエラーの可能性
        results.cors = {
          status: 'warning',
          message: 'CORS確認をスキップしました',
          details: '直接的なCORS確認はブラウザの制限により限定的です'
        };
      }

    } catch (error) {
      console.error('Network diagnostics error:', error);
      results.internet = {
        status: 'error',
        message: '診断中にエラーが発生しました',
        error: error.message
      };
    }

    return results;
  },

  // 環境変数チェック
  checkEnvironment() {
    const results = {
      supabaseUrl: { status: 'checking', message: 'Supabase URLを確認中...' },
      supabaseKey: { status: 'checking', message: 'Supabase Keyを確認中...' },
      nodeEnv: { status: 'checking', message: '実行環境を確認中...' }
    };

    // Supabase URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    results.supabaseUrl = {
      status: supabaseUrl ? 'success' : 'error',
      message: supabaseUrl ? 'Supabase URLが設定されています' : 'Supabase URLが未設定です',
      details: supabaseUrl ? `URL: ${supabaseUrl.substring(0, 30)}...` : undefined
    };

    // Supabase Anon Key
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    results.supabaseKey = {
      status: supabaseKey ? 'success' : 'error',
      message: supabaseKey ? 'Supabase Keyが設定されています' : 'Supabase Keyが未設定です',
      details: supabaseKey ? `Key: ${supabaseKey.substring(0, 20)}...` : undefined
    };

    // Node環境
    const nodeEnv = import.meta.env.MODE;
    results.nodeEnv = {
      status: 'success',
      message: `実行環境: ${nodeEnv}`,
      details: nodeEnv === 'production' ? '本番環境' : '開発環境'
    };

    return results;
  },

  // 未同期データの診断
  async checkUnsyncedData(userId) {
    const results = {
      localData: { status: 'checking', message: 'ローカルデータを確認中...' },
      dataValidation: { status: 'checking', message: 'データ検証中...' },
      syncReadiness: { status: 'checking', message: '同期準備状況を確認中...' },
      issues: []
    };

    try {
      // 1. ローカルデータの取得と基本チェック
      const localTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      const localRules = JSON.parse(localStorage.getItem('rules') || '[]');
      
      results.localData = {
        status: 'success',
        message: `ローカルデータ: 取引${localTransactions.length}件, ルール${localRules.length}件`,
        details: {
          transactions: localTransactions.length,
          rules: localRules.length
        }
      };

      // 2. データ検証
      const validationIssues = [];
      
      // 取引データの検証
      for (let i = 0; i < localTransactions.length; i++) {
        const tx = localTransactions[i];
        const txIssues = [];
        
        // 必須フィールドのチェック
        if (!tx.date && !tx.日付) {
          txIssues.push('日付が未設定');
        }
        
        // 金額のチェック
        if (tx.amount === undefined && tx.金額 === undefined) {
          txIssues.push('金額が未設定');
        } else {
          const amount = tx.amount || tx.金額;
          if (typeof amount === 'string' && isNaN(parseFloat(amount.replace(/,/g, '')))) {
            txIssues.push('金額が不正な形式');
          }
        }
        
        // 未来の日付チェック
        const date = tx.date || tx.日付;
        if (date && new Date(date) > new Date()) {
          txIssues.push('未来の日付');
        }
        
        // カテゴリのチェック
        if (!tx.category && !tx.カテゴリ) {
          txIssues.push('カテゴリが未設定');
        }
        
        if (txIssues.length > 0) {
          validationIssues.push({
            index: i,
            type: 'transaction',
            date: date,
            description: tx.description || tx.説明 || '(説明なし)',
            issues: txIssues
          });
        }
      }
      
      // ルールデータの検証
      for (let i = 0; i < localRules.length; i++) {
        const rule = localRules[i];
        const ruleIssues = [];
        
        // パターンのチェック
        if (!rule.pattern && !rule.keyword) {
          ruleIssues.push('パターンまたはキーワードが未設定');
        }
        
        // カテゴリのチェック
        if (!rule.category) {
          ruleIssues.push('適用カテゴリが未設定');
        }
        
        // 正規表現の妥当性チェック
        if (rule.regex) {
          try {
            new RegExp(rule.pattern || rule.keyword);
          } catch (e) {
            ruleIssues.push('無効な正規表現パターン');
          }
        }
        
        if (ruleIssues.length > 0) {
          validationIssues.push({
            index: i,
            type: 'rule',
            pattern: rule.pattern || rule.keyword || '(パターンなし)',
            issues: ruleIssues
          });
        }
      }
      
      results.dataValidation = {
        status: validationIssues.length > 0 ? 'warning' : 'success',
        message: validationIssues.length > 0 
          ? `${validationIssues.length}件のデータに問題があります` 
          : 'データ検証に問題はありません',
        issues: validationIssues
      };
      
      // 3. 同期準備チェック
      const syncIssues = [];
      
      // 重複データのチェック
      const txMap = new Map();
      let duplicateCount = 0;
      
      for (const tx of localTransactions) {
        const key = `${tx.date || tx.日付}_${tx.amount || tx.金額}_${tx.description || tx.説明}`;
        if (txMap.has(key)) {
          duplicateCount++;
        } else {
          txMap.set(key, true);
        }
      }
      
      if (duplicateCount > 0) {
        syncIssues.push({
          type: 'warning',
          message: `${duplicateCount}件の重複可能性のある取引があります`
        });
      }
      
      // 大量データの警告
      if (localTransactions.length > 1000) {
        syncIssues.push({
          type: 'info',
          message: `大量のデータ（${localTransactions.length}件）があります。同期に時間がかかる可能性があります`
        });
      }
      
      // IDの重複チェック
      const idSet = new Set();
      let idDuplicates = 0;
      
      for (const tx of localTransactions) {
        if (tx.id) {
          if (idSet.has(tx.id)) {
            idDuplicates++;
          } else {
            idSet.add(tx.id);
          }
        }
      }
      
      if (idDuplicates > 0) {
        syncIssues.push({
          type: 'error',
          message: `${idDuplicates}件のID重複があります。同期エラーの原因になります`
        });
      }
      
      results.syncReadiness = {
        status: syncIssues.some(i => i.type === 'error') ? 'error' 
              : syncIssues.some(i => i.type === 'warning') ? 'warning' 
              : 'success',
        message: syncIssues.length > 0 
          ? '同期前に確認が必要な項目があります' 
          : '同期の準備ができています',
        checks: syncIssues
      };
      
      results.issues = [...validationIssues, ...syncIssues];
      
    } catch (error) {
      console.error('Unsync data check error:', error);
      results.localData = {
        status: 'error',
        message: 'ローカルデータの確認中にエラーが発生しました',
        error: error.message
      };
    }
    
    return results;
  },

  // 同期シミュレーション（実際には同期せずにテストのみ）
  async simulateSync(userId) {
    const results = {
      status: 'checking',
      message: '同期シミュレーション中...',
      steps: []
    };
    
    try {
      // ステップ1: 認証確認
      const { data: session, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.session) {
        results.steps.push({
          step: '認証確認',
          status: 'error',
          message: 'ログインが必要です'
        });
        results.status = 'error';
        results.message = '認証エラーのため同期できません';
        return results;
      }
      
      results.steps.push({
        step: '認証確認',
        status: 'success',
        message: '認証OK'
      });
      
      // ステップ2: データベース接続テスト
      const testResult = await dbService.testConnection(userId);
      if (!testResult.success) {
        results.steps.push({
          step: 'データベース接続',
          status: 'error',
          message: 'データベースに接続できません',
          error: testResult.error?.message
        });
        results.status = 'error';
        results.message = 'データベース接続エラー';
        return results;
      }
      
      results.steps.push({
        step: 'データベース接続',
        status: 'success',
        message: 'データベース接続OK'
      });
      
      // ステップ3: ローカルデータの準備
      const localTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      const localRules = JSON.parse(localStorage.getItem('rules') || '[]');
      
      results.steps.push({
        step: 'データ準備',
        status: 'success',
        message: `取引${localTransactions.length}件, ルール${localRules.length}件を準備`
      });
      
      // ステップ4: データ変換テスト
      try {
        // 取引データの変換テスト（最初の5件のみ）
        const testTransactions = localTransactions.slice(0, 5);
        for (const tx of testTransactions) {
          const amount = typeof tx.amount === 'string' 
            ? parseFloat(tx.amount.replace(/,/g, '')) 
            : tx.amount;
          
          if (isNaN(amount)) {
            throw new Error(`無効な金額: ${tx.amount}`);
          }
          
          if (!tx.date && !tx.日付) {
            throw new Error('日付が未設定の取引があります');
          }
        }
        
        results.steps.push({
          step: 'データ変換テスト',
          status: 'success',
          message: 'データ形式は正常です'
        });
      } catch (error) {
        results.steps.push({
          step: 'データ変換テスト',
          status: 'error',
          message: 'データ変換エラー',
          error: error.message
        });
        results.status = 'error';
        results.message = 'データ形式に問題があります';
        return results;
      }
      
      // ステップ5: 権限確認
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (!profile) {
        // プロファイルが存在しない場合は作成される
        results.steps.push({
          step: '権限確認',
          status: 'info',
          message: 'プロファイルが自動作成されます'
        });
      } else {
        results.steps.push({
          step: '権限確認',
          status: 'success',
          message: '権限OK'
        });
      }
      
      results.status = 'success';
      results.message = '同期シミュレーション成功: データを同期できます';
      
    } catch (error) {
      console.error('Sync simulation error:', error);
      results.status = 'error';
      results.message = 'シミュレーション中にエラーが発生しました';
      results.error = error.message;
    }
    
    return results;
  },

  // 総合診断
  async runFullDiagnostics(userId) {
    const results = {
      timestamp: new Date().toISOString(),
      environment: this.checkEnvironment(),
      network: await this.checkNetwork(),
      database: userId ? await this.checkDatabase(userId) : null,
      unsyncedData: await this.checkUnsyncedData(userId),
      summary: {
        hasErrors: false,
        hasWarnings: false,
        message: ''
      }
    };

    // サマリー作成
    const allChecks = [
      ...Object.values(results.environment),
      ...Object.values(results.network),
      ...(results.database ? Object.values(results.database) : []),
      ...Object.values(results.unsyncedData)
    ];

    results.summary.hasErrors = allChecks.some(check => check.status === 'error');
    results.summary.hasWarnings = allChecks.some(check => check.status === 'warning');

    if (results.summary.hasErrors) {
      results.summary.message = 'エラーが検出されました。詳細を確認してください。';
    } else if (results.summary.hasWarnings) {
      results.summary.message = '警告があります。動作に影響する可能性があります。';
    } else {
      results.summary.message = 'すべての診断項目が正常です。';
    }

    return results;
  }
};